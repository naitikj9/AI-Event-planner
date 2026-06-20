"""Agent 2 — Venue & Vendor research (the RAG agent).

Role: ground vendor selection in the real catalog.
  1. RETRIEVE: semantic search over the embedded vendor catalog (RAG).
  2. SELECT: an LLM picks the best venue + caterer + decorator + entertainment +
     photographer from ONLY the retrieved candidates.
  3. VERIFY: prices/names are overwritten from the catalog (never trust the LLM
     for numbers), and the chosen venue's date availability is checked via a tool.
"""
from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from ..llm import get_chat_llm
from ..logging_utils import log_step
from ..schemas import EventRequirements, VendorChoice, VendorShortlist
from ..state import PlannerState
from ..tools import check_availability, get_vendor_by_id, retrieve_vendors

_SYSTEM = """You are the Venue & Vendor agent.
From the CANDIDATES provided (and only those), choose the best single option for
each category: venue, caterer, decorator, entertainment, photographer.

Hard rules:
- Pick ONLY from the candidate ids given. Never invent a vendor.
- The venue's city should match the requested city and its capacity MUST be >=
  the guest count. If no candidate venue can hold the guests, set venue to null
  and explain in notes.
- Prefer options that respect the budget and any diet/cuisine preference.
- A category may be null if no suitable candidate exists. Always fill `reason`."""


def _candidate_text(c: dict) -> str:
    """Compact one-line description of a candidate for the prompt."""
    cap = f", capacity {c['capacity']}" if c.get("capacity") else ""
    return (
        f"- id={c['id']} | {c['name']} | type={c['type']} | city={c.get('city','?')}"
        f"{cap} | price ₹{c.get('price_inr','?')} {c.get('price_unit','')} "
        f"| tags={','.join(c.get('tags', []))}"
    )


def _verify(choice: VendorChoice | None) -> VendorChoice | None:
    """Overwrite name/type/price from the catalog so numbers are always correct."""
    if choice is None:
        return None
    record = get_vendor_by_id(choice.id)
    if record is None:
        return None  # LLM hallucinated an id -> drop it
    return VendorChoice(
        id=record["id"],
        name=record["name"],
        type=record["type"],
        price_inr=int(record["price_inr"]),
        price_unit=record["price_unit"],
        reason=choice.reason,
    )


def research_node(state: PlannerState) -> dict:
    req: EventRequirements = state["requirements"]

    # 1) RETRIEVE (RAG) — build a natural-language query from the requirements.
    query = (
        f"{req.event_type} event in {req.city} for {req.guest_count} guests, "
        f"{req.setting_preference} setting, budget around ₹{req.budget_inr}, "
        f"diet {req.diet}, cuisine {req.cuisine_preference or 'any'}."
    )
    candidates = retrieve_vendors.invoke({"query": query, "k": 8})
    ctx = [f"{c['name']} ({c['type']}, {c.get('city','?')})" for c in candidates]
    log_step("venue", f"RAG retrieved {len(candidates)} candidate vendors.", candidates)

    # 2) SELECT — LLM chooses from candidates only, returning structured JSON.
    candidate_block = "\n".join(_candidate_text(c) for c in candidates)
    human = (
        f"REQUIREMENTS: {req.model_dump()}\n\n"
        f"CANDIDATES:\n{candidate_block}\n\n"
        "Choose the best vendor per category following the hard rules."
    )
    structured_llm = get_chat_llm().with_structured_output(VendorShortlist)
    shortlist: VendorShortlist = structured_llm.invoke(
        [SystemMessage(content=_SYSTEM), HumanMessage(content=human)]
    )

    # 3) VERIFY prices/names against the catalog.
    shortlist.venue = _verify(shortlist.venue)
    shortlist.caterer = _verify(shortlist.caterer)
    shortlist.decorator = _verify(shortlist.decorator)
    shortlist.entertainment = _verify(shortlist.entertainment)
    shortlist.photographer = _verify(shortlist.photographer)

    # Tool call: check the venue's availability on the requested date.
    if shortlist.venue and req.event_date:
        avail = check_availability.invoke(
            {"vendor_id": shortlist.venue.id, "event_date": req.event_date}
        )
        if not avail["available"]:
            shortlist.notes = (
                f"{shortlist.notes} Venue '{shortlist.venue.name}' is NOT "
                f"available on {req.event_date}.".strip()
            )

    picked = shortlist.venue.name if shortlist.venue else "NONE (no venue fits)"
    msg = log_step("venue", f"Selected venue: {picked}", shortlist)
    return {"shortlist": shortlist, "retrieved_context": ctx, "log": [msg]}

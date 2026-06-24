"""Budget calculator tool.

Deterministic math, so we never let the LLM guess totals. Prices come from the
catalog (by the chosen vendor ids), and per-plate catering is multiplied by the
guest count. The planner agent calls this to get an exact, auditable total.
"""
from __future__ import annotations

from typing import Dict, List

from langchain_core.tools import tool

from .retrieval import get_vendor_by_id


def _line_cost(vendor_id: str | None, guest_count: int) -> int:
    """Work out a single vendor's contribution to the total."""
    if not vendor_id:
        return 0
    vendor = get_vendor_by_id(vendor_id)
    if not vendor:
        return 0
    price = int(vendor.get("price_inr", 0))
    if vendor.get("price_unit") == "per_plate":
        return price * max(guest_count, 0)
    # per_day and flat are charged once
    return price


@tool
def calculate_budget(vendor_ids: Dict[str, str], guest_count: int) -> dict:
    """Compute the exact budget breakdown for a set of chosen vendors.

    `vendor_ids` maps category -> vendor id, e.g.
        {"venue": "venue-002", "caterer": "cater-001", ...}
    Returns {"breakdown": [{category, amount_inr}], "total_cost_inr": int}.
    """
    breakdown: List[dict] = []
    total = 0
    for category, vendor_id in vendor_ids.items():
        cost = _line_cost(vendor_id, guest_count)
        if cost > 0:
            breakdown.append({"category": category, "amount_inr": cost})
            total += cost
    return {"breakdown": breakdown, "total_cost_inr": total}

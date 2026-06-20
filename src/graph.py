"""The LangGraph: nodes, edges, conditional routing, and human-in-the-loop.

Flow
----
            ┌─> refuse ─────────────────────────────┐
 intake ─?──┤                                        ├─> END
            └─> research ─?─> planner ─> compliance ─?
                     │                        │
                     └─> reject               ├─> reject ───────┐
                                              ├─> finalize ─────┤
                                              └─> human_approval ?
                                                       │         │
                                              approve ─┘  decline┘
The "?" marks are conditional edges (routing decisions). human_approval pauses
the graph with interrupt() until a person approves or declines.
"""
from __future__ import annotations

import re

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from .agents import compliance_node, intake_node, planner_node, research_node
from .formatting import approval_summary, format_plan
from .guardrails import validate_requirements
from .logging_utils import log_step
from .schemas import (
    BudgetLine,
    ComplianceResult,
    EventPlan,
    EventRequirements,
    ScheduleItem,
    VendorChoice,
    VendorShortlist,
)
from .state import PlannerState


def _make_serializer() -> JsonPlusSerializer:
    """Serializer that knows our Pydantic schemas.

    The checkpointer must persist the graph state (which holds Pydantic models)
    while the graph is paused for human approval. Registering our schema types in
    the msgpack allowlist makes that round-trip clean and future-proof instead of
    relying on the deprecated "allow everything with a warning" default.
    """
    return JsonPlusSerializer(
        allowed_msgpack_modules=[
            EventRequirements,
            VendorChoice,
            VendorShortlist,
            ScheduleItem,
            BudgetLine,
            EventPlan,
            ComplianceResult,
        ]
    )

# ---------------------------------------------------------------------------
# Terminal / control nodes
# ---------------------------------------------------------------------------


def refusal_node(state: PlannerState) -> dict:
    """End state for out-of-scope or invalid requests (a guardrail outcome)."""
    req = state["requirements"]
    if not req.in_scope:
        message = f"Request declined: {req.refusal_reason}"
    else:
        problems = validate_requirements(req)
        message = "I can't plan this yet — " + "; ".join(problems)
    log_step("refusal", message)
    return {"status": "refused", "final_message": message, "log": [f"[refusal] {message}"]}


def reject_node(state: PlannerState) -> dict:
    """End state for a hard violation.

    Two paths arrive here: (a) the research stage found no suitable venue, before
    compliance runs; or (b) compliance flagged hard violations. Handle both.
    """
    compliance = state.get("compliance")
    if compliance and compliance.violations:
        message = "Plan rejected. " + " ".join(compliance.violations)
    else:
        message = (
            "Plan rejected. No venue in the catalog matches the requested city "
            "and guest count, so the event cannot be planned."
        )
    log_step("reject", message)
    return {"status": "rejected", "final_message": message, "log": [f"[reject] {message}"]}


def human_approval_node(state: PlannerState) -> dict:
    """HUMAN-IN-THE-LOOP. Pause and wait for a person to approve/decline.

    interrupt() suspends the graph and surfaces `payload` to the caller. When the
    caller resumes with Command(resume="approve"/"decline"), execution re-enters
    this node and interrupt() returns that value.
    """
    payload = {
        "summary": approval_summary(state),
        "action_required": "Approve booking? Reply 'approve' or 'decline'.",
    }
    decision = interrupt(payload)  # <-- graph pauses here on first run
    # Normalize to the first run of ASCII letters -> robust to BOM/encoding noise.
    match = re.search(r"[a-z]+", str(decision).lower())
    decision = match.group(0) if match else ""
    log_step("human_approval", f"Human responded: {decision}")
    return {"human_decision": decision, "log": [f"[human_approval] {decision}"]}


def declined_node(state: PlannerState) -> dict:
    """End state when the human declines the plan."""
    message = "You declined the plan. Nothing was booked."
    log_step("declined", message)
    return {"status": "declined", "final_message": message, "log": [f"[declined] {message}"]}


def finalize_node(state: PlannerState) -> dict:
    """End state for an approved plan — 'book' it and present the full plan."""
    message = format_plan(
        state["requirements"], state["shortlist"], state["plan"], state["compliance"]
    )
    confirmation = "✅ BOOKED.\n\n" + message
    log_step("finalize", "Plan booked and finalized.")
    return {"status": "booked", "final_message": confirmation, "log": ["[finalize] booked"]}


# ---------------------------------------------------------------------------
# Routers (conditional edges)
# ---------------------------------------------------------------------------


def route_after_intake(state: PlannerState) -> str:
    req = state["requirements"]
    if not req.in_scope or validate_requirements(req):
        return "refuse"
    return "research"


def route_after_research(state: PlannerState) -> str:
    # No venue means the event can't happen — skip straight to reject.
    return "planner" if state["shortlist"].venue is not None else "reject"


def route_after_compliance(state: PlannerState) -> str:
    return {
        "approve_auto": "finalize",
        "needs_human": "human_approval",
        "reject": "reject",
    }[state["compliance"].decision]


def route_after_human(state: PlannerState) -> str:
    return "finalize" if state["human_decision"].startswith("approve") else "declined"


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------


def build_graph(checkpointer=None):
    """Build and compile the event-planning graph.

    A checkpointer is REQUIRED for human-in-the-loop (interrupt) to work, because
    the graph must persist its state while paused. We default to in-memory.
    """
    g = StateGraph(PlannerState)

    # Agent nodes
    g.add_node("intake", intake_node)
    g.add_node("research", research_node)
    g.add_node("planner", planner_node)
    g.add_node("compliance", compliance_node)
    # Control nodes
    g.add_node("refuse", refusal_node)
    g.add_node("reject", reject_node)
    g.add_node("human_approval", human_approval_node)
    g.add_node("declined", declined_node)
    g.add_node("finalize", finalize_node)

    g.add_edge(START, "intake")
    g.add_conditional_edges("intake", route_after_intake,
                            {"research": "research", "refuse": "refuse"})
    g.add_conditional_edges("research", route_after_research,
                            {"planner": "planner", "reject": "reject"})
    g.add_edge("planner", "compliance")
    g.add_conditional_edges("compliance", route_after_compliance,
                            {"finalize": "finalize", "human_approval": "human_approval",
                             "reject": "reject"})
    g.add_conditional_edges("human_approval", route_after_human,
                            {"finalize": "finalize", "declined": "declined"})

    for terminal in ["refuse", "reject", "declined", "finalize"]:
        g.add_edge(terminal, END)

    return g.compile(checkpointer=checkpointer or MemorySaver(serde=_make_serializer()))

"""Agent 4 — Compliance / policy gate.

Role: the safety brain. It runs DETERMINISTIC policy checks (we deliberately do
NOT leave safety decisions to the LLM) and emits a ComplianceResult whose
`decision` field drives routing:

  reject       -> a hard problem (no venue, over capacity, wildly over budget)
  needs_human  -> safe-ish but high-impact: a person must approve before booking
  approve_auto -> within policy, safe to finalize automatically
"""
from __future__ import annotations

from ..config import settings
from ..guardrails import capacity_problem
from ..logging_utils import log_step
from ..schemas import ComplianceResult, EventPlan, EventRequirements, VendorShortlist
from ..state import PlannerState
from ..tools import get_vendor_by_id


def compliance_node(state: PlannerState) -> dict:
    req: EventRequirements = state["requirements"]
    shortlist: VendorShortlist = state["shortlist"]
    plan: EventPlan = state["plan"]

    violations: list[str] = []

    # 1) Must have a venue.
    if shortlist.venue is None:
        violations.append("No venue could be found that fits the requirements.")

    # 2) Capacity check (venue must hold the guests).
    if shortlist.venue is not None:
        record = get_vendor_by_id(shortlist.venue.id)
        cap_issue = capacity_problem(record.get("capacity", 0), req.guest_count)
        if cap_issue:
            violations.append(cap_issue)

    # 3) Availability (the venue agent flags this in notes).
    if "NOT available" in (shortlist.notes or ""):
        violations.append(shortlist.notes.strip())

    # 4) Budget check.
    over = plan.total_cost_inr - req.budget_inr
    over_fraction = (over / req.budget_inr) if req.budget_inr else 1.0

    # ----- Decide -----
    if shortlist.venue is None or any("capacity" in v for v in violations) \
            or "NOT available" in (shortlist.notes or ""):
        decision, risk = "reject", "high"
        rationale = "A hard requirement failed (venue/capacity/availability)."
    elif over_fraction > 0.25:
        decision, risk = "reject", "high"
        violations.append(
            f"Plan (₹{plan.total_cost_inr:,}) exceeds budget "
            f"(₹{req.budget_inr:,}) by {over_fraction:.0%}, beyond tolerance."
        )
        rationale = "Cost is far over budget; cannot proceed."
    elif over > 0:
        decision, risk = "needs_human", "medium"
        violations.append(
            f"Plan (₹{plan.total_cost_inr:,}) is over budget by ₹{over:,}."
        )
        rationale = "Slightly over budget — needs human approval before booking."
    elif plan.total_cost_inr >= settings.HUMAN_APPROVAL_COST_INR:
        decision, risk = "needs_human", "medium"
        rationale = (
            f"High-value booking (≥ ₹{settings.HUMAN_APPROVAL_COST_INR:,}); "
            "human approval required for this external action."
        )
    else:
        decision, risk = "approve_auto", "low"
        rationale = "Within budget and policy; safe to finalize."

    result = ComplianceResult(
        decision=decision, risk_level=risk, violations=violations, rationale=rationale
    )
    msg = log_step("compliance", f"Decision: {decision} ({risk} risk). {rationale}", result)
    return {"compliance": result, "log": [msg]}

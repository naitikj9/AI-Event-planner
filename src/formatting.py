"""Renders the plan as readable text.

Used by the finalize node (the final message) and the human-approval prompt, so
the person approving sees exactly what will be booked.
"""
from __future__ import annotations

from .schemas import ComplianceResult, EventPlan, EventRequirements, VendorShortlist


def _vendor_lines(shortlist: VendorShortlist) -> str:
    rows = []
    for cat in ["venue", "caterer", "decorator", "entertainment", "photographer"]:
        choice = getattr(shortlist, cat)
        if choice:
            unit = {"per_plate": "/plate", "per_day": "/day", "flat": " flat"}.get(
                choice.price_unit, ""
            )
            rows.append(f"  • {cat.title():14} {choice.name}  (₹{choice.price_inr:,}{unit})")
    return "\n".join(rows) if rows else "  (no vendors selected)"


def format_plan(
    req: EventRequirements,
    shortlist: VendorShortlist,
    plan: EventPlan,
    compliance: ComplianceResult,
) -> str:
    """Full human-readable plan."""
    lines = [
        f"EVENT PLAN - {req.event_type.title()} in {req.city}",
        f"Date: {req.event_date or 'TBD'} | Guests: {req.guest_count} "
        f"| Budget: ₹{req.budget_inr:,}",
        "",
        "Vendors:",
        _vendor_lines(shortlist),
        "",
        "Timeline:",
    ]
    for item in plan.timeline:
        lines.append(f"  {item.time:>8}  {item.activity}")
    lines += ["", "Budget breakdown:"]
    for line in plan.budget_breakdown:
        lines.append(f"  {line.category.title():14} ₹{line.amount_inr:,}")
    lines.append(f"  {'TOTAL':14} ₹{plan.total_cost_inr:,}")
    lines += ["", f"Summary: {plan.summary}"]
    if compliance.violations:
        lines += ["", "Notes / flags:"]
        lines += [f"  - {v}" for v in compliance.violations]
    return "\n".join(lines)


def approval_summary(state: dict) -> str:
    """Short text shown to the human when their approval is required."""
    plan: EventPlan = state["plan"]
    compliance: ComplianceResult = state["compliance"]
    req: EventRequirements = state["requirements"]
    reasons = "; ".join(compliance.violations) or compliance.rationale
    return (
        f"Approval needed for {req.event_type} in {req.city} "
        f"(total ₹{plan.total_cost_inr:,} vs budget ₹{req.budget_inr:,}).\n"
        f"Reason: {reasons}"
    )

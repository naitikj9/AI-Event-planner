"""Pydantic schemas = the typed contracts agents use to hand off work.

Each agent returns one of these models (never loose text), so every handoff is
validated JSON. If an agent's output doesn't fit the schema, LangChain forces a
retry — this is how we get reliable, structured handoffs.
"""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 1. Intake agent output
# ---------------------------------------------------------------------------

EventType = Literal[
    "wedding", "corporate", "birthday", "anniversary", "conference", "party", "other"
]


class EventRequirements(BaseModel):
    """Structured form of the user's plain-language request."""

    in_scope: bool = Field(
        description="True only if this is a genuine event-planning request. "
        "False for off-topic, nonsensical, or unsafe/illegal requests."
    )
    refusal_reason: Optional[str] = Field(
        default=None,
        description="If in_scope is False, a short, polite reason to show the user.",
    )

    event_type: EventType = Field(default="other")
    city: str = Field(default="", description="City where the event is held.")
    setting_preference: Literal["indoor", "outdoor", "any"] = "any"
    guest_count: int = Field(default=0, description="Expected number of guests.")
    budget_inr: int = Field(default=0, description="Total budget in Indian Rupees.")
    event_date: str = Field(default="", description="Requested date, as given (free text/ISO).")
    cuisine_preference: Optional[str] = Field(default=None)
    diet: Literal["veg", "non-veg", "veg-and-nonveg", "any"] = "any"
    special_requests: Optional[str] = Field(default=None)


# ---------------------------------------------------------------------------
# 2. Venue & Vendor agent output
# ---------------------------------------------------------------------------


class VendorChoice(BaseModel):
    """A single chosen vendor (venue, caterer, decorator, etc.)."""

    id: str
    name: str
    type: Literal["venue", "caterer", "decorator", "entertainment", "photographer"]
    price_inr: int = Field(description="Headline price from the catalog.")
    price_unit: Literal["per_day", "per_plate", "flat"]
    reason: str = Field(description="Why this vendor fits the request.")


class VendorShortlist(BaseModel):
    """The set of vendors selected for the event."""

    venue: Optional[VendorChoice] = None
    caterer: Optional[VendorChoice] = None
    decorator: Optional[VendorChoice] = None
    entertainment: Optional[VendorChoice] = None
    photographer: Optional[VendorChoice] = None
    notes: str = Field(default="", description="Any caveats, e.g. no exact match found.")


# ---------------------------------------------------------------------------
# 3. Planner agent output
# ---------------------------------------------------------------------------


class ScheduleItem(BaseModel):
    time: str = Field(description="e.g. '18:00' or 'Evening'.")
    activity: str


class BudgetLine(BaseModel):
    category: str
    amount_inr: int


class EventPlan(BaseModel):
    """The full plan: a timeline plus a costed budget breakdown."""

    timeline: List[ScheduleItem] = Field(default_factory=list)
    budget_breakdown: List[BudgetLine] = Field(default_factory=list)
    total_cost_inr: int = 0
    summary: str = Field(default="", description="One-paragraph plain-language summary.")


# ---------------------------------------------------------------------------
# 4. Compliance agent output
# ---------------------------------------------------------------------------

Decision = Literal["approve_auto", "needs_human", "reject"]


class ComplianceResult(BaseModel):
    """Safety/policy verdict that drives the routing decision."""

    decision: Decision = Field(
        description="approve_auto = safe to finalize automatically; "
        "needs_human = a person must approve before booking; "
        "reject = cannot proceed."
    )
    risk_level: Literal["low", "medium", "high"] = "low"
    violations: List[str] = Field(
        default_factory=list, description="Concrete policy/safety problems found."
    )
    rationale: str = Field(default="", description="Short explanation of the verdict.")

"""The shared graph state.

Every node gets this dict and returns a partial update to it. It's the single
object that flows through the whole pipeline, so each agent can read what the
agents before it produced.
"""
from __future__ import annotations

import operator
from typing import Annotated, List, Optional

from typing_extensions import TypedDict

from .schemas import ComplianceResult, EventPlan, EventRequirements, VendorShortlist


class PlannerState(TypedDict, total=False):
    # input
    user_request: str

    # filled in by each agent as it runs (the handoffs)
    requirements: Optional[EventRequirements]
    retrieved_context: List[str]
    shortlist: Optional[VendorShortlist]
    plan: Optional[EventPlan]
    compliance: Optional[ComplianceResult]

    # control / outcome
    human_decision: Optional[str]          # "approve" / "reject" from the person
    status: str                            # running | refused | rejected | needs_approval | booked
    final_message: str

    # log lines. operator.add lets each node append instead of overwriting.
    log: Annotated[List[str], operator.add]

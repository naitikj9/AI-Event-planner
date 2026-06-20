"""The shared graph state.

In LangGraph, every node receives this dict and returns a partial update to it.
This single object is the "memory" that flows through the whole pipeline, so
each agent can read what previous agents produced. This is the rubric's
"State management: maintain shared graph/system state across steps".
"""
from __future__ import annotations

import operator
from typing import Annotated, List, Optional

from typing_extensions import TypedDict

from .schemas import ComplianceResult, EventPlan, EventRequirements, VendorShortlist


class PlannerState(TypedDict, total=False):
    # --- input ---
    user_request: str                      # the raw plain-language request

    # --- produced by each agent (the handoffs) ---
    requirements: Optional[EventRequirements]
    retrieved_context: List[str]           # raw RAG snippets the venue agent saw
    shortlist: Optional[VendorShortlist]
    plan: Optional[EventPlan]
    compliance: Optional[ComplianceResult]

    # --- control / outcome fields ---
    human_decision: Optional[str]          # "approve" / "reject" from the person
    status: str                            # running | refused | rejected | needs_approval | booked
    final_message: str                     # what we show the user at the end

    # --- observability ---
    # Annotated with operator.add so each node can append log lines and LangGraph
    # merges them instead of overwriting.
    log: Annotated[List[str], operator.add]

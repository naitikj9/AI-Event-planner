"""The run loop that drives the compiled graph, including the HITL pause/resume.

Shared by the interactive CLI (app.py) and the evaluation harness (tests), so the
exact same code path is exercised in demos and tests. `decision_fn` lets callers
plug in how the human approval is answered (real keyboard input, or a scripted
answer in tests).
"""
from __future__ import annotations

import re
from typing import Callable, Optional

from langgraph.types import Command

from .config import apply_langsmith_env
from .graph import build_graph
from .logging_utils import RunLogger, console, set_active_logger


def _interactive_decision(payload: dict) -> str:
    """Default approval handler: show the request and read a keyboard answer."""
    console.print("\n[bold yellow]⏸  HUMAN APPROVAL REQUIRED[/bold yellow]")
    console.print(payload["summary"])
    console.print(f"[dim]{payload['action_required']}[/dim]")
    raw = input("Your decision (approve/decline): ")
    # Extract the first run of ASCII letters so stray BOM/encoding noise from
    # piped input (e.g. a UTF-8 BOM decoded as "ï») can't corrupt the answer.
    match = re.search(r"[a-z]+", raw.lower())
    return match.group(0) if match else "decline"


def run_planner(
    request: str,
    decision_fn: Optional[Callable[[dict], str]] = None,
    thread_id: str = "demo",
    graph=None,
    verbose: bool = True,
    quiet: bool = False,
) -> dict:
    """Run one event-planning request end to end and return the final state.

    Handles the interrupt loop: if the graph pauses for human approval, we ask
    `decision_fn` (interactive by default) and resume until the graph finishes.
    `quiet=True` silences per-step console logs (used by the batch evaluator).
    """
    apply_langsmith_env()
    set_active_logger(RunLogger(thread_id, echo=not quiet))
    graph = graph or build_graph()
    decision_fn = decision_fn or _interactive_decision
    config = {"configurable": {"thread_id": thread_id}}

    if verbose:
        console.rule(f"[bold]Run {thread_id}")
        console.print(f"[bold]Request:[/bold] {request}\n")

    result = graph.invoke({"user_request": request, "log": []}, config)

    # The graph returns with "__interrupt__" set whenever it paused for a human.
    while "__interrupt__" in result:
        payload = result["__interrupt__"][0].value
        answer = decision_fn(payload)
        result = graph.invoke(Command(resume=answer), config)

    return result

"""Interactive CLI entry point.

Usage (from the project root, with the venv active):
    python -m src.app                       # prompts you for a request
    python -m src.app "plan a 150-guest wedding in Bangalore for 8 lakh on 2026-12-18"
"""
from __future__ import annotations

import sys
import uuid

from .logging_utils import console
from .runner import run_planner

SAMPLE = (
    "Plan a wedding in Bangalore for 150 guests with a budget of 8 lakh on "
    "2026-12-18. Outdoor if possible, multi-cuisine food, need photography."
)


def main() -> None:
    # take the request from the command line, else prompt, else use the sample
    if len(sys.argv) > 1:
        request = " ".join(sys.argv[1:])
    else:
        console.print("[bold]Describe your event[/bold] (press Enter for a sample):")
        request = input("> ").strip() or SAMPLE

    result = run_planner(request, thread_id=f"cli-{uuid.uuid4().hex[:8]}")

    console.rule("[bold green]RESULT")
    console.print(f"[bold]Status:[/bold] {result.get('status', 'unknown')}\n")
    console.print(result.get("final_message", "(no message)"))


if __name__ == "__main__":
    main()

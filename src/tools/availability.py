"""Availability check tool (mock external API).

Stands in for a real venue-booking calendar. It's deterministic (no random
calls) so demos and tests are repeatable: a small blackout list marks some
venue/date pairs as taken, everything else is open.
"""
from __future__ import annotations

from langchain_core.tools import tool

# pretend these venue/date pairs are already booked
_BLACKOUTS = {
    ("venue-001", "2026-12-20"),
    ("venue-005", "2026-12-25"),
    ("venue-003", "2026-11-15"),
}


@tool
def check_availability(vendor_id: str, event_date: str) -> dict:
    """Check whether a venue is free on a given date (YYYY-MM-DD).

    Returns {"vendor_id", "event_date", "available": bool, "note": str}.
    """
    available = (vendor_id, event_date) not in _BLACKOUTS
    note = "Open for booking." if available else "Already booked on this date."
    return {
        "vendor_id": vendor_id,
        "event_date": event_date,
        "available": available,
        "note": note,
    }

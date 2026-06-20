"""Central configuration.

Loads the .env file once and exposes simple settings the rest of the app reads.
Keeping this in one place means there are no scattered os.getenv() calls and no
secrets hard-coded anywhere.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Project root = the folder that contains this src/ package's parent.
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
KNOWLEDGE_BASE = DATA_DIR / "knowledge_base" / "vendors.json"
RUNS_DIR = ROOT_DIR / "runs"  # where we write JSON-line trace logs

# Load .env from the project root. override=False so real environment
# variables (e.g. set in CI) win over the file.
load_dotenv(ROOT_DIR / ".env", override=False)


class Settings:
    """Plain settings object, read from environment variables."""

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai").lower()

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    CHAT_MODEL: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    EMBED_MODEL: str = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

    # LangSmith tracing is optional. If enabled, LangChain auto-uploads traces.
    LANGCHAIN_TRACING_V2: bool = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "multiagent-event-planner")

    # ---- Business rules / guardrail thresholds (tweak freely) ----
    # If a plan's total cost exceeds the budget by more than this fraction we
    # treat it as a hard violation (cannot auto-approve).
    BUDGET_HARD_OVERAGE: float = 0.0       # 0% -> any overage needs attention
    # Any plan above this absolute cost always needs a human to approve booking.
    HUMAN_APPROVAL_COST_INR: int = 200000  # 2 lakh
    # Sensible input bounds (used by the intake guardrail).
    MIN_GUESTS: int = 1
    MAX_GUESTS: int = 2000
    MIN_BUDGET_INR: int = 10000


settings = Settings()


def apply_langsmith_env() -> None:
    """Push LangSmith settings into the process environment.

    LangChain reads these env vars automatically to decide whether to trace.
    Called once at startup. Safe no-op when tracing is disabled.
    """
    if settings.LANGCHAIN_TRACING_V2 and os.getenv("LANGCHAIN_API_KEY"):
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
    else:
        # Make sure a stray "true" doesn't cause failed upload attempts.
        os.environ["LANGCHAIN_TRACING_V2"] = "false"

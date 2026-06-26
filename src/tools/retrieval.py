"""Vendor retrieval tool (RAG-style, keyword-scored).

The "R" in RAG: we retrieve a small set of grounded candidates from the
catalog so the venue/vendor agent can only pick from real entries (never
invent vendors). The original implementation used OpenAI embeddings; this
deterministic version is provider-free, fast, and good enough for the
~16-entry catalog. Swapping in FAISS/Chroma later would only touch this file.

The exposed interface is unchanged:
    retrieve_vendors(query: str, k: int = 8) -> List[dict]
    get_vendor_by_id(vendor_id: str) -> dict | None
    load_catalog() -> Dict[str, dict]
"""
from __future__ import annotations

import json
import re
from collections import Counter
from functools import lru_cache
from math import log
from typing import Dict, List

from langchain_core.tools import tool

from ..config import KNOWLEDGE_BASE

_TOKEN = re.compile(r"[a-zA-Z][a-zA-Z0-9-]+")


def _tokens(text: str) -> List[str]:
    return [t.lower() for t in _TOKEN.findall(text or "")]


@lru_cache(maxsize=1)
def load_catalog() -> Dict[str, dict]:
    """Load vendors.json once, keyed by id."""
    raw = json.loads(KNOWLEDGE_BASE.read_text(encoding="utf-8"))
    return {item["id"]: item for item in raw}


def get_vendor_by_id(vendor_id: str) -> dict | None:
    return load_catalog().get(vendor_id)


def _doc_text(item: dict) -> str:
    return " ".join(
        [
            item.get("name", ""),
            item.get("type", ""),
            item.get("city", ""),
            item.get("setting", ""),
            item.get("description", ""),
            " ".join(item.get("tags", [])),
            " ".join(item.get("cuisine", [])) if isinstance(item.get("cuisine"), list) else "",
            item.get("diet", ""),
        ]
    )


@lru_cache(maxsize=1)
def _index() -> dict:
    """Precompute per-doc token frequencies + IDF for a tiny BM25-ish score."""
    catalog = load_catalog()
    docs = {vid: _tokens(_doc_text(v)) for vid, v in catalog.items()}
    df: Counter = Counter()
    for toks in docs.values():
        for t in set(toks):
            df[t] += 1
    n = max(len(docs), 1)
    idf = {t: log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}
    return {"docs": docs, "idf": idf}


def _score(query_tokens: List[str], doc_tokens: List[str], idf: Dict[str, float]) -> float:
    if not doc_tokens:
        return 0.0
    counts = Counter(doc_tokens)
    score = 0.0
    for q in query_tokens:
        if counts.get(q):
            score += idf.get(q, 0.0) * (1 + log(counts[q]))
    return score


@tool
def retrieve_vendors(query: str, k: int = 8) -> List[dict]:
    """Return the top-k vendor records most relevant to `query`.

    Uses a deterministic keyword scorer over name/type/city/tags/description
    so the agent's choices stay grounded in the real catalog.
    """
    catalog = load_catalog()
    idx = _index()
    q_tokens = _tokens(query)
    scored = []
    for vid, item in catalog.items():
        s = _score(q_tokens, idx["docs"][vid], idx["idf"])
        # gentle bonus when the city is named in the query
        city = (item.get("city") or "").lower()
        if city and city in (query or "").lower():
            s += 2.5
        scored.append((s, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    # always return something useful even if all scores are 0
    top = [item for _, item in scored[:k]]
    if not any(s for s, _ in scored[:k]):
        top = list(catalog.values())[:k]
    return top

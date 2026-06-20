"""RAG retrieval tool.

We embed every vendor's description into a vector store, then let the Venue agent
search it in natural language ("large outdoor wedding venue in Bangalore"). This
grounds the agent's choices in the real catalog instead of hallucinating venues.

We use an in-memory vector store so there is nothing extra to install or run —
ideal for a demo, and a drop-in for FAISS/Chroma later.
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Dict, List

from langchain_core.documents import Document
from langchain_core.tools import tool
from langchain_core.vectorstores import InMemoryVectorStore

from ..config import KNOWLEDGE_BASE
from ..llm import get_embeddings


@lru_cache(maxsize=1)
def load_catalog() -> Dict[str, dict]:
    """Load vendors.json once, keyed by id (used for exact price lookups)."""
    raw = json.loads(KNOWLEDGE_BASE.read_text(encoding="utf-8"))
    return {item["id"]: item for item in raw}


def get_vendor_by_id(vendor_id: str) -> dict | None:
    """Exact lookup so pricing/capacity come from data, never from the LLM."""
    return load_catalog().get(vendor_id)


def _to_document(item: dict) -> Document:
    """Turn a catalog entry into a searchable document with rich text + metadata."""
    text = (
        f"{item['name']} ({item['type']}) in {item.get('city', 'N/A')}. "
        f"{item['description']} "
        f"Tags: {', '.join(item.get('tags', []))}."
    )
    return Document(page_content=text, metadata=item)


@lru_cache(maxsize=1)
def _vector_store() -> InMemoryVectorStore:
    """Build (once) the embedded vector index over the whole catalog."""
    catalog = load_catalog()
    docs = [_to_document(item) for item in catalog.values()]
    store = InMemoryVectorStore(get_embeddings())
    store.add_documents(docs)
    return store


@tool
def retrieve_vendors(query: str, k: int = 6) -> List[dict]:
    """Search the vendor catalog for the k best semantic matches to `query`.

    Returns a list of vendor records (with id, name, type, city, capacity, price).
    Use this to ground venue/vendor selection in the real catalog.
    """
    results = _vector_store().similarity_search(query, k=k)
    return [doc.metadata for doc in results]

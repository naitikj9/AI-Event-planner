"""RAG retrieval tool.

We embed every vendor's description into a vector store, then let the venue
agent search it in natural language ("large outdoor wedding venue in
Bangalore"). This keeps the agent's choices grounded in the real catalog
instead of made-up venues.

The store is in-memory so there's nothing extra to install or run. Swapping in
FAISS/Chroma later would only touch this file.
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
    """Exact lookup so pricing/capacity come from the data, not the LLM."""
    return load_catalog().get(vendor_id)


def _to_document(item: dict) -> Document:
    """Turn a catalog entry into a searchable document with text + metadata."""
    text = (
        f"{item['name']} ({item['type']}) in {item.get('city', 'N/A')}. "
        f"{item['description']} "
        f"Tags: {', '.join(item.get('tags', []))}."
    )
    return Document(page_content=text, metadata=item)


@lru_cache(maxsize=1)
def _vector_store() -> InMemoryVectorStore:
    """Build the embedded index over the whole catalog (once)."""
    catalog = load_catalog()
    docs = [_to_document(item) for item in catalog.values()]
    store = InMemoryVectorStore(get_embeddings())
    store.add_documents(docs)
    return store


@tool
def retrieve_vendors(query: str, k: int = 6) -> List[dict]:
    """Search the vendor catalog for the k best semantic matches to `query`.

    Returns a list of vendor records (id, name, type, city, capacity, price).
    Used to ground venue/vendor selection in the real catalog.
    """
    results = _vector_store().similarity_search(query, k=k)
    return [doc.metadata for doc in results]

"""LLM and embeddings factory.

One place to build the chat model and the embeddings model. Written so the
provider could be swapped later (e.g. to Gemini/Groq) by editing only this file.
"""
from __future__ import annotations

from functools import lru_cache

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from .config import settings


@lru_cache(maxsize=None)
def get_chat_llm(temperature: float = 0.0) -> ChatOpenAI:
    """Return a chat model. temperature=0 keeps agent decisions deterministic.

    lru_cache means we reuse one client instead of rebuilding it per call.
    """
    if not settings.OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    return ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=temperature,
        api_key=settings.OPENAI_API_KEY,
        timeout=60,
        max_retries=2,
    )


@lru_cache(maxsize=None)
def get_embeddings() -> OpenAIEmbeddings:
    """Return the embeddings model used to power RAG retrieval."""
    if not settings.OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    return OpenAIEmbeddings(
        model=settings.EMBED_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )

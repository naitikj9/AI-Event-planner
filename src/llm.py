"""Builds the chat model and the embeddings model.

Keeping this in one file means swapping the provider later only touches here.
"""
from __future__ import annotations

from functools import lru_cache

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from .config import settings

_NO_KEY = "OPENAI_API_KEY is not set. Copy .env.example to .env and add your key."


import os


def _base_url() -> str | None:
    """Optional OpenAI-compatible base URL (e.g. Emergent LLM proxy)."""
    return os.getenv("OPENAI_BASE_URL") or None


@lru_cache(maxsize=None)
def get_chat_llm(temperature: float = 0.0) -> ChatOpenAI:
    # temperature 0 keeps the agents' decisions deterministic
    if not settings.OPENAI_API_KEY:
        raise RuntimeError(_NO_KEY)
    kwargs = dict(
        model=settings.CHAT_MODEL,
        temperature=temperature,
        api_key=settings.OPENAI_API_KEY,
        timeout=60,
        max_retries=2,
    )
    if _base_url():
        kwargs["base_url"] = _base_url()
    return ChatOpenAI(**kwargs)


@lru_cache(maxsize=None)
def get_embeddings() -> OpenAIEmbeddings:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError(_NO_KEY)
    kwargs = dict(
        model=settings.EMBED_MODEL,
        api_key=settings.OPENAI_API_KEY,
    )
    if _base_url():
        kwargs["base_url"] = _base_url()
    return OpenAIEmbeddings(**kwargs)

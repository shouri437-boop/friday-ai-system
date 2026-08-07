"""FRIDAY Backend — Pydantic models for Knowledge / RAG."""
from pydantic import BaseModel, Field
from typing import Optional


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Semantic search query")
    top_k: int = Field(5, ge=1, le=20, description="Number of results to return")


class KnowledgeResult(BaseModel):
    id: str
    title: str
    path: str
    excerpt: str
    tags: list[str] = []
    score: float = Field(..., ge=0.0, le=1.0, description="Semantic similarity score")
    word_count: int
    last_synced: str


class KnowledgeSearchResponse(BaseModel):
    query: str
    results: list[KnowledgeResult]
    total_docs_indexed: int
    vault_path: str


class VaultSyncResponse(BaseModel):
    status: str
    docs_indexed: int
    chunks_created: int
    vault_path: str

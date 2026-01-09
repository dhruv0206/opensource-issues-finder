"""Query and search result models."""

from pydantic import BaseModel
from typing import Literal


class SearchQuery(BaseModel):
    """User search query."""
    
    query: str
    limit: int = 20
    page: int = 1  # Current page (1-indexed)
    
    # Optional Manual Filters (Override AI detection)
    language: str | None = None
    labels: list[str] | None = None
    sort_by: Literal["newest", "recently_discussed", "relevance", "stars"] | None = None
    days_ago: float | None = None
    unassigned_only: bool = False

class ParsedQuery(BaseModel):
    """Structured query parsed from natural language."""
    
    semantic_query: str  # The semantic part for embedding search
    language: str | None = None
    min_stars: int | None = None
    max_stars: int | None = None
    labels: list[str] | None = None
    difficulty: Literal["beginner", "intermediate", "advanced"] | None = None
    sort_by: Literal["newest", "recently_discussed", "relevance", "stars"] = "relevance"
    days_ago: float | None = None  # Filter issues updated within X days
    unassigned_only: bool = False  # Only show unassigned issues
    topics: list[str] | None = None  # GitHub repo topics filter


class SearchResult(BaseModel):
    """Search result with score."""
    
    issue_id: int
    issue_number: int
    title: str
    body: str | None
    repo_name: str
    repo_full_name: str
    repo_stars: int
    repo_forks: int
    language: str | None
    labels: list[str]
    created_at: str
    updated_at: str
    comments_count: int
    issue_url: str
    repo_url: str
    score: float  # Similarity score from Pinecone
    
    # New fields
    is_assigned: bool = False
    assignees_count: int = 0
    repo_description: str | None = None
    repo_topics: list[str] = []
    repo_license: str | None = None
    state: str = "open"


class PaginatedResponse(BaseModel):
    """Paginated search response."""
    
    results: list[SearchResult]
    parsed_query: ParsedQuery
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool

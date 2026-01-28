"""Issue data models."""

from pydantic import BaseModel, computed_field
from datetime import datetime


class IssueMetadata(BaseModel):
    """Metadata for a GitHub issue stored in Pinecone."""
    
    # Issue fields
    issue_id: int
    issue_number: int
    title: str
    body: str | None = None
    labels: list[str] = []
    created_at: str  # ISO format string
    updated_at: str  # ISO format string
    comments_count: int = 0
    issue_url: str
    state: str = "open"
    
    # Assignment fields (NEW)
    is_assigned: bool = False
    assignees_count: int = 0
    assignees: list[str] = []  # Usernames of assignees
    
    # Repo fields
    repo_name: str
    repo_full_name: str
    repo_stars: int
    repo_forks: int
    repo_url: str
    language: str | None = None
    
    # Enhanced repo fields (NEW)
    repo_description: str | None = None
    repo_topics: list[str] = []
    repo_license: str | None = None
    repo_open_issues_count: int = 0
    
    # Convenience flags
    is_good_first_issue: bool = False
    is_help_wanted: bool = False
    
    # Ingestion metadata
    ingested_at: int = 0  # Unix timestamp

    # Claim detection (analyze comments for "I'll work on this" patterns)
    has_claimer: bool = False
    
    @computed_field
    @property
    def created_at_ts(self) -> int:
        """Unix timestamp for created_at (for Pinecone filtering)."""
        try:
            dt = datetime.fromisoformat(self.created_at.replace('Z', '+00:00'))
            return int(dt.timestamp())
        except:
            return 0
    
    @computed_field
    @property
    def updated_at_ts(self) -> int:
        """Unix timestamp for updated_at (for Pinecone filtering)."""
        try:
            dt = datetime.fromisoformat(self.updated_at.replace('Z', '+00:00'))
            return int(dt.timestamp())
        except:
            return 0


class Issue(BaseModel):
    """Issue with embedding for storage."""
    
    id: str  # Unique ID for Pinecone (repo_name#issue_number)
    embedding: list[float]
    metadata: IssueMetadata
    
    @classmethod
    def create_id(cls, repo_full_name: str, issue_number: int) -> str:
        """Create unique ID for an issue."""
        return f"{repo_full_name}#{issue_number}"

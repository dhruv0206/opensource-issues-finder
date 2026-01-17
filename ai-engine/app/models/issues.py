"""SQLAlchemy models for issue tracking."""
from sqlalchemy import Column, String, Integer, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum
import uuid

from app.database import Base


class IssueStatus(str, enum.Enum):
    """Status of a tracked issue."""
    IN_PROGRESS = "in_progress"
    PR_SUBMITTED = "pr_submitted"
    VERIFIED = "verified"
    EXPIRED = "expired"
    ABANDONED = "abandoned"


class TrackedIssue(Base):
    """Model for issues users are working on."""
    __tablename__ = "tracked_issues"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    issue_url = Column(Text, nullable=False)
    repo_owner = Column(String, nullable=False)
    repo_name = Column(String, nullable=False)
    issue_number = Column(Integer, nullable=False)
    issue_title = Column(Text, nullable=True)
    status = Column(Enum(IssueStatus), default=IssueStatus.IN_PROGRESS)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    pr_url = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    check_count = Column(Integer, default=0)


class VerifiedContribution(Base):
    """Model for successfully merged PRs."""
    __tablename__ = "verified_contributions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    issue_url = Column(Text, nullable=False)
    pr_url = Column(Text, nullable=False)
    repo_owner = Column(String, nullable=False)
    repo_name = Column(String, nullable=False)
    merged_at = Column(DateTime(timezone=True), nullable=False)
    lines_added = Column(Integer, nullable=True)
    lines_removed = Column(Integer, nullable=True)
    impact_score = Column(Integer, nullable=True)

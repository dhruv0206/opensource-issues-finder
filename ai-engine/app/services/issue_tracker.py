"""Service layer for issue tracking operations."""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime

from app.models.issues import TrackedIssue, VerifiedContribution, IssueStatus


def start_tracking_issue(
    db: Session,
    user_id: str,
    issue_url: str,
    repo_owner: str,
    repo_name: str,
    issue_number: int,
    issue_title: Optional[str] = None,
) -> TrackedIssue:
    """Create a new tracked issue for a user."""
    issue = TrackedIssue(
        user_id=user_id,
        issue_url=issue_url,
        repo_owner=repo_owner,
        repo_name=repo_name,
        issue_number=issue_number,
        issue_title=issue_title,
        status=IssueStatus.IN_PROGRESS.value,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def get_tracked_issues_by_user(
    db: Session, 
    user_id: str, 
    limit: int = 10,
    offset: int = 0
) -> List[TrackedIssue]:
    """Get tracked issues for a user with pagination, ordered by start date."""
    return (
        db.query(TrackedIssue)
        .filter(TrackedIssue.user_id == user_id)
        .order_by(desc(TrackedIssue.started_at))
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_tracked_issues_count(db: Session, user_id: str) -> int:
    """Get total count of tracked issues for a user."""
    return (
        db.query(TrackedIssue)
        .filter(TrackedIssue.user_id == user_id)
        .count()
    )


def get_tracked_issue(
    db: Session, user_id: str, issue_url: str
) -> Optional[TrackedIssue]:
    """Get a specific tracked issue by user and URL."""
    return (
        db.query(TrackedIssue)
        .filter(
            TrackedIssue.user_id == user_id,
            TrackedIssue.issue_url == issue_url,
        )
        .first()
    )


def get_tracked_issue_by_id(db: Session, issue_id: str) -> Optional[TrackedIssue]:
    """Get a tracked issue by its ID."""
    return db.query(TrackedIssue).filter(TrackedIssue.id == issue_id).first()


def submit_pr_for_verification(
    db: Session, issue_id: str, pr_url: str
) -> Optional[TrackedIssue]:
    """Update a tracked issue with PR URL and change status to pr_submitted."""
    issue = get_tracked_issue_by_id(db, issue_id)
    if issue:
        issue.pr_url = pr_url
        issue.status = IssueStatus.PR_SUBMITTED.value
        db.commit()
        db.refresh(issue)
    return issue


def mark_issue_verified(
    db: Session, issue_id: str, merged_at: datetime
) -> Optional[TrackedIssue]:
    """Mark an issue as verified after PR is merged."""
    issue = get_tracked_issue_by_id(db, issue_id)
    if issue:
        issue.status = IssueStatus.VERIFIED.value
        issue.verified_at = merged_at
        db.commit()
        db.refresh(issue)
    return issue


def abandon_issue(db: Session, issue_id: str) -> bool:
    """Delete a tracked issue."""
    issue = get_tracked_issue_by_id(db, issue_id)
    if issue:
        db.delete(issue)
        db.commit()
        return True
    return False


def get_verified_contributions(db: Session, user_id: str) -> List[VerifiedContribution]:
    """Get all verified contributions for a user."""
    return (
        db.query(VerifiedContribution)
        .filter(VerifiedContribution.user_id == user_id)
        .order_by(desc(VerifiedContribution.merged_at))
        .all()
    )

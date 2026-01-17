"""API routes for user data and dashboard stats."""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.issues import TrackedIssue, VerifiedContribution, IssueStatus

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/stats")
async def get_user_stats(
    x_user_id: str = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Get aggregated dashboard stats for the current user.
    
    Returns:
        - verifiedPRs: Count of verified contributions
        - inProgress: Count of issues currently being worked on
        - prSubmitted: Count of issues with PR submitted (pending verification)
        - repositories: Unique repos the user has contributed to
        - recentActivity: Last 10 activity items
        - activeIssues: Currently active (non-verified) issues
    """
    user_id = x_user_id
    
    # Count verified PRs (from TrackedIssue with VERIFIED status)
    verified_count = db.query(func.count(TrackedIssue.id)).filter(
        TrackedIssue.user_id == user_id,
        TrackedIssue.status == IssueStatus.VERIFIED.value
    ).scalar() or 0
    
    # Count in-progress issues
    in_progress_count = db.query(func.count(TrackedIssue.id)).filter(
        TrackedIssue.user_id == user_id,
        TrackedIssue.status == IssueStatus.IN_PROGRESS.value
    ).scalar() or 0
    
    # Count PR submitted (pending verification)
    pr_submitted_count = db.query(func.count(TrackedIssue.id)).filter(
        TrackedIssue.user_id == user_id,
        TrackedIssue.status == IssueStatus.PR_SUBMITTED.value
    ).scalar() or 0
    
    # Count unique repositories from verified issues
    repo_count = db.query(func.count(func.distinct(
        TrackedIssue.repo_owner + '/' + TrackedIssue.repo_name
    ))).filter(
        TrackedIssue.user_id == user_id,
        TrackedIssue.status == IssueStatus.VERIFIED.value
    ).scalar() or 0
    
    # Get recent activity (combine tracked issues and verified contributions)
    # For simplicity, we'll build activity from tracked issues for now
    tracked_issues = db.query(TrackedIssue).filter(
        TrackedIssue.user_id == user_id
    ).order_by(TrackedIssue.started_at.desc()).limit(10).all()
    
    recent_activity = []
    for issue in tracked_issues:
        # Determine activity type based on status
        if issue.status == IssueStatus.VERIFIED.value:
            activity_type = "verified"
            timestamp = issue.verified_at or issue.started_at
        elif issue.status == IssueStatus.PR_SUBMITTED.value:
            activity_type = "submitted"
            timestamp = issue.started_at  # Could track pr_submitted_at if we add it
        else:
            activity_type = "started"
            timestamp = issue.started_at
        
        recent_activity.append({
            "id": str(issue.id),
            "type": activity_type,
            "issueTitle": issue.issue_title or f"#{issue.issue_number}",
            "repoName": f"{issue.repo_owner}/{issue.repo_name}",
            "timestamp": timestamp.isoformat() if timestamp else datetime.utcnow().isoformat()
        })
    
    # Get active issues (in_progress or pr_submitted)
    active_issues = db.query(TrackedIssue).filter(
        TrackedIssue.user_id == user_id,
        TrackedIssue.status.in_([IssueStatus.IN_PROGRESS.value, IssueStatus.PR_SUBMITTED.value])
    ).order_by(TrackedIssue.started_at.desc()).limit(5).all()
    
    active_issues_data = [
        {
            "id": str(issue.id),
            "title": issue.issue_title or f"Issue #{issue.issue_number}",
            "repoName": f"{issue.repo_owner}/{issue.repo_name}",
            "status": issue.status,
            "createdAt": issue.started_at.isoformat() if issue.started_at else None
        }
        for issue in active_issues
    ]
    
    return {
        "verifiedPRs": verified_count,
        "inProgress": in_progress_count,
        "prSubmitted": pr_submitted_count,
        "repositories": repo_count,
        "recentActivity": recent_activity,
        "activeIssues": active_issues_data
    }

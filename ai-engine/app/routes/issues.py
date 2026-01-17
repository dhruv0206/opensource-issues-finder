"""API routes for issue tracking."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
import re

from app.database import get_db
from app.services import issue_tracker
from app.models.issues import IssueStatus

router = APIRouter(prefix="/api/issues", tags=["issues"])


# Pydantic models for request/response
class TrackIssueRequest(BaseModel):
    user_id: str
    issue_url: str
    repo_owner: str
    repo_name: str
    issue_number: int
    issue_title: Optional[str] = None


class SubmitPRRequest(BaseModel):
    user_id: str
    issue_id: str
    pr_url: str


class AbandonIssueRequest(BaseModel):
    user_id: str
    issue_id: str


class TrackedIssueResponse(BaseModel):
    id: str
    user_id: str
    issue_url: str
    repo_owner: str
    repo_name: str
    issue_number: int
    issue_title: Optional[str]
    status: str
    started_at: datetime
    pr_url: Optional[str]
    verified_at: Optional[datetime]
    check_count: int

    class Config:
        from_attributes = True


class TrackedIssuesListResponse(BaseModel):
    success: bool
    issues: List[TrackedIssueResponse]
    count: int


# Routes
@router.post("/track")
def track_issue(request: TrackIssueRequest, db: Session = Depends(get_db)):
    """Start tracking an issue for a user."""
    # Check if already tracking
    existing = issue_tracker.get_tracked_issue(db, request.user_id, request.issue_url)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You are already tracking this issue"
        )
    
    issue = issue_tracker.start_tracking_issue(
        db=db,
        user_id=request.user_id,
        issue_url=request.issue_url,
        repo_owner=request.repo_owner,
        repo_name=request.repo_name,
        issue_number=request.issue_number,
        issue_title=request.issue_title,
    )
    
    return {
        "success": True,
        "message": "Issue tracking started",
        "issue": TrackedIssueResponse.model_validate(issue),
    }


@router.get("/tracked/{user_id}")
def get_tracked_issues(user_id: str, db: Session = Depends(get_db)):
    """Get all tracked issues for a user."""
    issues = issue_tracker.get_tracked_issues_by_user(db, user_id)
    
    return TrackedIssuesListResponse(
        success=True,
        issues=[TrackedIssueResponse.model_validate(i) for i in issues],
        count=len(issues),
    )


@router.post("/verify")
def submit_pr_for_verification(request: SubmitPRRequest, db: Session = Depends(get_db)):
    """Submit a PR URL for verification."""
    # Validate PR URL format
    pr_regex = r"^https://github\.com/[\w-]+/[\w-]+/pull/\d+$"
    if not re.match(pr_regex, request.pr_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid PR URL format. Expected: https://github.com/owner/repo/pull/123"
        )
    
    issue = issue_tracker.submit_pr_for_verification(db, request.issue_id, request.pr_url)
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return {
        "success": True,
        "message": "PR submitted for verification. We'll check it within 4 hours.",
        "issue": TrackedIssueResponse.model_validate(issue),
    }


@router.post("/abandon")
def abandon_issue(request: AbandonIssueRequest, db: Session = Depends(get_db)):
    """Stop tracking an issue."""
    success = issue_tracker.abandon_issue(db, request.issue_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return {
        "success": True,
        "message": "Issue tracking abandoned",
    }


@router.get("/contributions/{user_id}")
def get_contributions(user_id: str, db: Session = Depends(get_db)):
    """Get all verified contributions for a user (public profile)."""
    contributions = issue_tracker.get_verified_contributions(db, user_id)
    
    return {
        "success": True,
        "contributions": contributions,
        "count": len(contributions),
    }

"""API routes for issue tracking."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from uuid import UUID
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


class VerifyPRDirectRequest(BaseModel):
    """Request to verify a PR directly without tracking an issue first."""
    user_id: str
    pr_url: str
    repo_owner: str
    repo_name: str
    pr_number: int



class TrackedIssueResponse(BaseModel):
    id: UUID  # Accept UUID type
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
    total: int
    page: int
    total_pages: int


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
def get_tracked_issues(
    user_id: str, 
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get tracked issues for a user with pagination."""
    # Get total count first
    total = issue_tracker.get_tracked_issues_count(db, user_id)
    
    # Calculate pagination
    offset = (page - 1) * limit
    total_pages = (total + limit - 1) // limit  # Ceiling division
    
    # Get paginated issues
    issues = issue_tracker.get_tracked_issues_by_user(db, user_id, limit=limit, offset=offset)
    
    return TrackedIssuesListResponse(
        success=True,
        issues=[TrackedIssueResponse.model_validate(i) for i in issues],
        count=len(issues),
        total=total,
        page=page,
        total_pages=total_pages,
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


@router.post("/verify-pr")
def verify_pr_directly(request: VerifyPRDirectRequest, db: Session = Depends(get_db)):
    """Verify a PR directly without tracking an issue first.
    
    This endpoint:
    1. Fetches PR info from GitHub
    2. Checks if PR is merged
    3. Checks if the user is the author
    4. Creates a tracked_issue record with 'verified' status
    """
    import requests
    import os
    
    github_token = os.getenv("GITHUB_TOKEN")
    
    # Fetch PR info from GitHub
    url = f"https://api.github.com/repos/{request.repo_owner}/{request.repo_name}/pulls/{request.pr_number}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ContribFinder",
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="PR not found on GitHub")
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"GitHub API error: {response.status_code}")
        
        pr_data = response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch PR from GitHub: {str(e)}")
    
    # Check if PR is merged
    if not pr_data.get("merged"):
        raise HTTPException(
            status_code=400,
            detail="This PR is not merged yet. Only merged PRs can be verified as contributions."
        )
    
    # Get user's GitHub info from database
    from sqlalchemy import text
    result = db.execute(
        text('SELECT "githubUsername", "githubId" FROM "user" WHERE id = :user_id'),
        {"user_id": request.user_id}
    ).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail="User not found."
        )
        
    db_github_username = result[0]
    db_github_id = result[1]
    
    if not db_github_username:
        raise HTTPException(
            status_code=400,
            detail="Could not find your GitHub username. Please log out and log back in."
        )

    # 1. Check Author Identity (Robust Check using ID if available, fallback to username)
    pr_user = pr_data.get("user", {})
    pr_author_username = pr_user.get("login", "").lower()
    pr_author_id = str(pr_user.get("id", ""))
    
    is_author = False
    
    # Primary check: GitHub ID (immutable)
    if db_github_id and pr_author_id and str(db_github_id) == pr_author_id:
        is_author = True
    # Fallback check: Username (mutable)
    elif db_github_username.lower() == pr_author_username:
        is_author = True
        
    if not is_author:
        raise HTTPException(
            status_code=403,
            detail=f"This PR was created by '{pr_author_username}', but your linked GitHub account is '{db_github_username}'. You can only verify your own PRs."
        )
    
    # 2. Check for Double Dipping (Duplicate Verification)
    # Check if this PR URL exists in ANY record (as issue_url OR pr_url) for this user
    # We only care if *this user* has already claimed it.
    
    # Normalize URL for comparison (remove trailing slashes)
    clean_pr_url = request.pr_url.rstrip('/')
    
    duplicate_check = db.execute(
        text("""
            SELECT id FROM tracked_issues 
            WHERE user_id = :user_id 
              AND (
                  issue_url = :pr_url 
                  OR pr_url = :pr_url
              )
        """),
        {"user_id": request.user_id, "pr_url": clean_pr_url}
    ).fetchone()
    
    if duplicate_check:
         raise HTTPException(
            status_code=409, 
            detail="You have already added this contribution (it's either tracked or verified)."
        )
    
    # All checks passed! Create a verified contribution
    merged_at = pr_data.get("merged_at")
    lines_added = pr_data.get("additions", 0)
    lines_removed = pr_data.get("deletions", 0)
    pr_title = pr_data.get("title", "Untitled PR")
    
    # Create tracked issue directly as verified
    issue = issue_tracker.start_tracking_issue(
        db=db,
        user_id=request.user_id,
        issue_url=clean_pr_url,  # Using PR URL as the issue URL
        repo_owner=request.repo_owner,
        repo_name=request.repo_name,
        issue_number=request.pr_number,
        issue_title=pr_title,
    )
    
    # Update to verified status with PR info
    issue.status = IssueStatus.VERIFIED.value
    issue.pr_url = clean_pr_url
    issue.verified_at = merged_at
    db.commit()
    db.refresh(issue)
    
    return {
        "success": True,
        "message": f"PR verified! '{pr_title}' has been added to your portfolio.",
        "issue": TrackedIssueResponse.model_validate(issue),
        "pr_details": {
            "title": pr_title,
            "merged_at": merged_at,
            "lines_added": lines_added,
            "lines_removed": lines_removed,
        }
    }

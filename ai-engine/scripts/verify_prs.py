"""
PR Verification Cron Script

Run this every 4 hours to verify pending PRs against GitHub API.
Checks if PR author matches user and if PR is merged.
"""
import os
import sys
import logging
import requests
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")  # Optional: for higher rate limits

if not DATABASE_URL:
    logger.error("DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def parse_pr_url(pr_url: str) -> tuple[str, str, int] | None:
    """Parse GitHub PR URL into (owner, repo, pr_number)."""
    # Format: https://github.com/owner/repo/pull/123
    try:
        parts = pr_url.replace("https://github.com/", "").split("/")
        owner = parts[0]
        repo = parts[1]
        pr_number = int(parts[3])
        return owner, repo, pr_number
    except (IndexError, ValueError):
        return None


def fetch_pr_info(owner: str, repo: str, pr_number: int) -> dict | None:
    """Fetch PR details from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ContribFinder-Verification",
    }
    
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            logger.warning(f"GitHub API returned {response.status_code} for {pr_url}")
            return None
    except Exception as e:
        logger.error(f"Failed to fetch PR info: {e}")
        return None


def verify_pending_prs():
    """Main verification logic - batch verify all pending PRs."""
    session = Session()
    
    try:
        # Get all pending PRs with user's GitHub username and ID
        query = text("""
            SELECT 
                ti.id,
                ti.user_id,
                ti.pr_url,
                ti.issue_number,
                ti.repo_owner,
                ti.repo_name,
                ti.check_count,
                u."githubUsername",
                u."githubId"
            FROM tracked_issues ti
            JOIN "user" u ON ti.user_id = u.id
            WHERE ti.status = 'pr_submitted'
              AND ti.pr_url IS NOT NULL
        """)
        
        pending = session.execute(query).fetchall()
        logger.info(f"Found {len(pending)} pending PRs to verify")
        
        verified_count = 0
        failed_count = 0
        
        for row in pending:
            issue_id = row.id
            pr_url = row.pr_url
            github_username = row.githubUsername
            github_id = row.githubId
            check_count = row.check_count or 0
            
            logger.info(f"Verifying PR: {pr_url} for user: {github_username} (ID: {github_id})")
            
            # Parse PR URL
            parsed = parse_pr_url(pr_url)
            if not parsed:
                logger.warning(f"Invalid PR URL format: {pr_url}")
                continue
            
            owner, repo, pr_number = parsed
            
            # Fetch PR info from GitHub
            pr_info = fetch_pr_info(owner, repo, pr_number)
            if not pr_info:
                # Increment check count
                session.execute(text("""
                    UPDATE tracked_issues 
                    SET check_count = check_count + 1 
                    WHERE id = :id
                """), {"id": issue_id})
                continue
            
            # Check author (Robust check using ID if available)
            pr_user = pr_info.get("user", {})
            pr_author_username = pr_user.get("login", "").lower()
            pr_author_id = str(pr_user.get("id", ""))
            
            is_author = False
            
            # Primary check: GitHub ID (immutable)
            if github_id and pr_author_id and str(github_id) == pr_author_id:
                is_author = True
            # Fallback check: Username (mutable)
            elif github_username and pr_author_username and github_username.lower() == pr_author_username:
                is_author = True

            if not is_author:
                logger.warning(f"Author mismatch: PR by '{pr_author_username}', expected user '{github_username}' (ID: {github_id})")
                # Mark as failed (author doesn't match)
                session.execute(text("""
                    UPDATE tracked_issues 
                    SET status = 'abandoned', check_count = check_count + 1
                    WHERE id = :id
                """), {"id": issue_id})
                failed_count += 1
                continue
            
            # Check if merged
            if pr_info.get("merged"):
                merged_at = pr_info.get("merged_at")
                lines_added = pr_info.get("additions", 0)
                lines_deleted = pr_info.get("deletions", 0)
                
                logger.info(f"✅ PR verified! Merged at {merged_at}")
                
                # Update to verified
                session.execute(text("""
                    UPDATE tracked_issues 
                    SET status = 'verified', 
                        verified_at = :merged_at,
                        check_count = check_count + 1
                    WHERE id = :id
                """), {"id": issue_id, "merged_at": merged_at})
                
                # Also create a verified_contributions entry
                session.execute(text("""
                    INSERT INTO verified_contributions 
                    (user_id, issue_url, pr_url, repo_owner, repo_name, merged_at, lines_added, lines_removed)
                    SELECT user_id, issue_url, pr_url, repo_owner, repo_name, :merged_at, :lines_added, :lines_removed
                    FROM tracked_issues WHERE id = :id
                    ON CONFLICT DO NOTHING
                """), {
                    "id": issue_id, 
                    "merged_at": merged_at,
                    "lines_added": lines_added,
                    "lines_removed": lines_deleted
                })
                
                verified_count += 1
            else:
                # PR not merged yet, just increment check count
                logger.info(f"⏳ PR not merged yet, will check again later")
                session.execute(text("""
                    UPDATE tracked_issues 
                    SET check_count = check_count + 1 
                    WHERE id = :id
                """), {"id": issue_id})
        
        session.commit()
        logger.info(f"Verification complete: {verified_count} verified, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    logger.info("Starting PR verification...")
    verify_pending_prs()
    logger.info("Done!")

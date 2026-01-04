"""GitHub data fetching service using PyGithub."""

import logging
from datetime import datetime, timedelta, timezone
from github import Github, GithubException
from github.Issue import Issue as GHIssue
from github.Repository import Repository
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.models.issue import IssueMetadata

logger = logging.getLogger(__name__)


class GitHubFetcher:
    """Fetches repositories and issues from GitHub."""
    
    def __init__(self):
        settings = get_settings()
        self.github = Github(settings.github_token)
        self.contribution_labels = settings.contribution_labels
        self._rate_limited = False  # Track if we've hit rate limit
    
    def is_rate_limited(self) -> bool:
        """Check if we've hit rate limit or have no remaining quota."""
        if self._rate_limited:
            return True
        try:
            rate_limit = self.github.get_rate_limit()
            # Handle both 'core' (standard) and 'rate' (some versions/GHE)
            core = getattr(rate_limit, 'core', getattr(rate_limit, 'rate', None))
            if core and core.remaining == 0:
                logger.warning("⚠️ Rate limit exhausted (0 remaining). Stopping.")
                self._rate_limited = True
                return True
        except Exception as e:
            logger.warning(f"Error checking rate limit: {e}")
        return False
        
    def get_top_repos(
        self, 
        language: str, 
        limit: int = 100,
        min_stars: int = 100,
        min_contributors: int | None = None
    ) -> list[Repository]:
        """Fetch repositories with recent activity for a language."""
        query = f"language:{language} stars:>={min_stars}"
        repos = self.github.search_repositories(
            query=query,
            sort="updated",  # Prioritize recently active repos
            order="desc"
        )
        
        result = []
        for repo in repos:
            if len(result) >= limit:
                break
                
            # Filter by contributors if specified
            if min_contributors:
                try:
                    contributors = list(repo.get_contributors()[:min_contributors + 1])
                    if len(contributors) < min_contributors:
                        logger.debug(f"  Skipping {repo.full_name}: only {len(contributors)} contributors")
                        continue
                except GithubException as e:
                    logger.warning(f"Could not check contributors for {repo.full_name}: {e}")
            
            result.append(repo)
        
        logger.info(f"Fetched {len(result)} {language} repos (min {min_stars} stars" + 
                   (f", min {min_contributors} contributors)" if min_contributors else ")"))
        return result
    
    # Note: No retry decorator - we handle rate limits by skipping repos gracefully
    def get_contribution_issues(
        self, 
        repo: Repository,
        recent_days: int = 90,
        max_issues: int | None = None
    ) -> list[IssueMetadata]:
        """Fetch contribution issues with recent activity from a repo.
        
        Args:
            repo: GitHub repository
            recent_days: Only fetch issues updated in the last N days
            max_issues: Maximum number of issues to fetch (None = no limit)
        """
        issues = []
        
        # Calculate date threshold - issues updated in last N days
        since_date = datetime.now(timezone.utc) - timedelta(days=recent_days)
        
        # Get repo-level info once (for all issues)
        repo_info = self._get_repo_info(repo)
        
        try:
            # Get open issues with recent activity, sorted by updated date
            open_issues = repo.get_issues(
                state="open",
                sort="updated",
                direction="desc",
                since=since_date
            )
            
            issue_count = 0
            for issue in open_issues:
                # Check max limit
                if max_issues and issue_count >= max_issues:
                    logger.info(f"Reached max issues limit ({max_issues}) for {repo.full_name}")
                    break
                    
                # Skip pull requests (they show up in issues API)
                if issue.pull_request is not None:
                    continue
                
                # Double check the date
                if issue.updated_at.replace(tzinfo=timezone.utc) < since_date:
                    break  # Issues are sorted by updated, so we can stop
                
                issue_count += 1
                # Check if has any contribution labels
                issue_labels = [label.name.lower() for label in issue.labels]
                has_contrib_label = any(
                    contrib_label.lower() in issue_labels 
                    for contrib_label in self.contribution_labels
                )
                
                if has_contrib_label:
                    metadata = self._issue_to_metadata(issue, repo, repo_info)
                    issues.append(metadata)
                    
        except GithubException as e:
            # Check if this is a rate limit error (403 Forbidden or 429)
            if e.status in (403, 429):
                logger.warning(f"⚠️ RATE LIMITED on {repo.full_name} - skipping repo (got {len(issues)} issues before limit)")
                # Return whatever we got so far instead of waiting
                return issues
            else:
                logger.warning(f"Error fetching issues from {repo.full_name}: {e}")
            
        logger.info(f"Found {len(issues)} contribution issues in {repo.full_name} (active in last {recent_days} days)")
        return issues
    
    def get_issue_status(self, repo_full_name: str, issue_number: int) -> str | None:
        """Fetch the current state (open/closed) of a specific issue.
        
        Returns 'open', 'closed', or None if fetching fails.
        """
        try:
            repo = self.github.get_repo(repo_full_name)
            issue = repo.get_issue(issue_number)
            return issue.state
        except Exception as e:
            logger.warning(f"Error checking status for {repo_full_name}#{issue_number}: {e}")
            return None
    
    def _get_repo_info(self, repo: Repository) -> dict:
        """Extract repo-level info once for all issues."""
        # Get license
        license_name = None
        try:
            if repo.license:
                license_name = repo.license.name
        except GithubException as e:
            if e.status in (403, 429):
                self._rate_limited = True
                logger.warning(f"⚠️ Rate limited while getting license for {repo.full_name}")
        except:
            pass
        
        # Get topics - skip if rate limited
        topics = []
        if not self._rate_limited:
            try:
                topics = repo.get_topics()
            except GithubException as e:
                if e.status in (403, 429):
                    self._rate_limited = True
                    logger.warning(f"⚠️ Rate limited while getting topics for {repo.full_name}")
            except:
                pass
            
        return {
            "description": repo.description[:500] if repo.description else None,
            "topics": topics,
            "license": license_name,
            "open_issues_count": repo.open_issues_count
        }
    
    def _issue_to_metadata(
        self, 
        issue: GHIssue, 
        repo: Repository,
        repo_info: dict
    ) -> IssueMetadata:
        """Convert GitHub issue to our metadata model."""
        labels = [label.name for label in issue.labels]
        labels_lower = [l.lower() for l in labels]
        
        # Get assignees info
        assignees = [a.login for a in issue.assignees] if issue.assignees else []
        
        return IssueMetadata(
            # Issue fields
            issue_id=issue.id,
            issue_number=issue.number,
            title=issue.title,
            body=issue.body[:2000] if issue.body else None,
            labels=labels,
            created_at=issue.created_at.isoformat(),
            updated_at=issue.updated_at.isoformat(),
            comments_count=issue.comments,
            issue_url=issue.html_url,
            state=issue.state,
            
            # Assignment fields (NEW)
            is_assigned=len(assignees) > 0,
            assignees_count=len(assignees),
            assignees=assignees,
            
            # Repo fields
            repo_name=repo.name,
            repo_full_name=repo.full_name,
            repo_stars=repo.stargazers_count,
            repo_forks=repo.forks_count,
            repo_url=repo.html_url,
            language=repo.language,
            
            # Enhanced repo fields (NEW)
            repo_description=repo_info["description"],
            repo_topics=repo_info["topics"],
            repo_license=repo_info["license"],
            repo_open_issues_count=repo_info["open_issues_count"],
            
            # Convenience flags
            is_good_first_issue="good first issue" in labels_lower,
            is_help_wanted="help wanted" in labels_lower,
        )
    
    def get_rate_limit_status(self) -> dict:
        """Get current rate limit status."""
        try:
            rate_limit = self.github.get_rate_limit()
            core = getattr(rate_limit, 'core', getattr(rate_limit, 'rate', None))
            search = getattr(rate_limit, 'search', None)
            
            return {
                "core_remaining": core.remaining if core else 0,
                "core_limit": core.limit if core else 0,
                "search_remaining": search.remaining if search else 0,
                "search_limit": search.limit if search else 0
            }
        except Exception as e:
            logger.warning(f"Could not get rate limit: {e}")
            return {
                "core_remaining": 5000,
                "core_limit": 5000,
                "search_remaining": 30,
                "search_limit": 30
            }

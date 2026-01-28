"""GitHub GraphQL API fetcher for efficient issue discovery."""

import re
import logging
import time
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.config import get_settings
from app.models.issue import IssueMetadata

logger = logging.getLogger(__name__)

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

# GraphQL query for searching issues
SEARCH_ISSUES_QUERY = """
query SearchIssues($query: String!, $cursor: String) {
  rateLimit {
    remaining
    resetAt
  }
  search(query: $query, type: ISSUE, first: 100, after: $cursor) {
    issueCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on Issue {
        id
        number
        title
        body
        state
        createdAt
        updatedAt
        url
        labels(first: 10) {
          nodes {
            name
          }
        }
        assignees(first: 5) {
          nodes {
            login
          }
        }
        comments(first: 30) {
          totalCount
          nodes {
            body
            author {
              login
            }
          }
        }
        repository {
          name
          nameWithOwner
          stargazerCount
          forkCount
          url
          primaryLanguage {
            name
          }
          description
          licenseInfo {
            name
          }
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
          openIssues: issues(states: OPEN) {
            totalCount
          }
        }
      }
    }
  }
}
"""

# GraphQL query for batch checking issue states by repo and number
# This is more efficient than individual REST calls
BATCH_CHECK_ISSUES_QUERY = """
query BatchCheckIssues($owner: String!, $name: String!, $numbers: [Int!]!) {
  rateLimit {
    remaining
    resetAt
  }
  repository(owner: $owner, name: $name) {
    issues(first: 100, filterBy: {}) {
      nodes {
        number
        state
      }
    }
  }
}
"""

# Simple query to check a single issue state
CHECK_ISSUE_STATE_QUERY = """
query CheckIssue($owner: String!, $name: String!, $number: Int!) {
  rateLimit {
    remaining
    resetAt
  }
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      state
    }
  }
}
"""


class GraphQLFetcher:
    """Fetches issues using GitHub GraphQL API for efficiency."""
    
    def __init__(self):
        settings = get_settings()
        self.app_id = settings.gh_app_id
        
        # Resolve private key
        self.private_key = settings.gh_private_key
        
        # Prefer file path if set (fixes local dev .env issues)
        if settings.gh_private_key_path:
            try:
                with open(settings.gh_private_key_path, "r") as f:
                    self.private_key = f.read()
            except Exception as e:
                logger.warning(f"Failed to read private key from {settings.gh_private_key_path}: {e}")
                
        self.token = settings.github_token
        self._installation_token = None
        self._token_expires_at = None
        
    def _generate_jwt(self) -> str:
        """Generate a JWT for GitHub App authentication."""
        now = int(time.time())
        payload = {
            "iat": now - 60,  # Issued 60 seconds ago
            "exp": now + (10 * 60),  # Expires in 10 minutes
            "iss": self.app_id
        }
        return jwt.encode(payload, self.private_key, algorithm="RS256")
    
    def _get_installation_token(self) -> str:
        """Get an installation token for API requests."""
        # If we have a valid token, reuse it
        if self._installation_token and self._token_expires_at:
            if datetime.now(timezone.utc) < self._token_expires_at - timedelta(minutes=5):
                return self._installation_token
        
        # Generate JWT
        jwt_token = self._generate_jwt()
        
        # Get installations with retry
        for attempt in range(3):
            try:
                response = requests.get(
                    "https://api.github.com/app/installations",
                    headers={
                        "Authorization": f"Bearer {jwt_token}",
                        "Accept": "application/vnd.github+json"
                    },
                    timeout=10
                )
                
                if response.status_code == 401:
                    logger.error(f"401 Unauthorized: Check if App ID ({self.app_id}) and private key are correct")
                    logger.error(f"Response: {response.text}")
                    # Regenerate JWT in case of clock skew
                    if attempt < 2:
                        time.sleep(1)
                        jwt_token = self._generate_jwt()
                        continue
                
                response.raise_for_status()
                installations = response.json()
                break
            except requests.RequestException as e:
                logger.warning(f"Installation request attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
                time.sleep(1)
        
        if not installations:
            raise ValueError("No installations found. Install the app on your account first.")
        
        installation_id = installations[0]["id"]
        
        # Get installation access token
        response = requests.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github+json"
            },
            timeout=10
        )
        
        if response.status_code == 401:
            logger.error(f"401 on access token request. JWT may have expired during processing.")
            logger.error(f"Response: {response.text}")
            
        response.raise_for_status()
        token_data = response.json()
        
        self._installation_token = token_data["token"]
        self._token_expires_at = datetime.fromisoformat(
            token_data["expires_at"].replace("Z", "+00:00")
        )
        
        logger.info(f"Got installation token, expires at {self._token_expires_at}")
        return self._installation_token
    
    def _get_auth_token(self) -> str:
        """Get the best available auth token."""
        if self.app_id and self.private_key:
            try:
                return self._get_installation_token()
            except Exception as e:
                logger.warning(f"Failed to get installation token: {e}")
        
        if self.token:
            return self.token
        
        raise ValueError("No GitHub authentication available")

    def _analyze_comments_for_claimer(self, comments: list[dict]) -> bool:
        """
        Analyze comments to detect if someone claimed the issue.

        Looks for patterns like:
        - "I'll work on this", "I will work on this"
        - "Can I take this?", "Can I work on it?"
        - "I'll handle it", "I will handle it"
        - "Assign me", "Please assign me"
        - "Taking this", "Taking it"
        - "I'm working on this", "Started working"
        """
        if not comments:
            return False

        for comment in comments:
            body = comment.get("body", "")
            if not body:
                continue

            # Skip bot comments
            author = comment.get("author", {})
            login = author.get("login", "") if author else ""
            if login.endswith("[bot]") or "bot" in login.lower():
                continue

            body_lower = body.lower()

            # Pattern 1: "I'll work on this" / "I will work on this" / "I can take this"
            if re.search(r"[iI]['\s]*(?:ll|will|can)\s+(?:work|handle|take)\s+(?:on\s+)?(?:this|it)", body_lower):
                return True

            # Pattern 2: "Can I take this?" / "Can I work on it?" / "I can take this"
            if re.search(r"(?:can\s+i|i\s+can)\s+(?:work|handle|take)\s+(?:on\s+)?(?:this|it)\??", body_lower):
                return True

            # Pattern 3: "Please assign me" / "Assign me"
            if re.search(r"(?:please\s+)?assign\s+(?:me|this\s+to\s+me)\b", body_lower):
                return True

            # Pattern 4: "I'm working on this" / "I'm taking this"
            if re.search(r"[iI][']\s*(?:m|am)\s+(?:working|taking)\s+(?:on\s+)?(?:this|it)\b", body_lower):
                return True

            # Pattern 5: "Started working on this"
            if re.search(r"started\s+(?:working|working\s+on)\s+(?:this|it)\b", body_lower):
                return True

            # Pattern 6: "Taking this" / "Taking it" / "Working on this" / "taking care of it"
            if re.search(r"\b(?:taking|working)\s+(?:on\s+)?(?:this|it|care\s+of\s+it)\b", body_lower):
                return True

            # Pattern 7: "On it!" / "I'm on it"
            if re.search(r"(?:^|\s)on\s+it\s*[!?.]*$", body_lower):
                return True

            # Pattern 8: "Begin working on this"
            if re.search(r"\bbegin\s+(?:working|working\s+on)\s+(?:this|it)\b", body_lower):
                return True

        return False

    def _execute_query(self, query: str, variables: dict, retry_on_401: bool = True, raise_on_graphql_error: bool = True) -> dict:
        """
        Execute a GraphQL query with automatic token refresh and rate limit handling.
        
        Args:
            query: GraphQL query string
            variables: Query variables
            retry_on_401: Whether to retry once on 401 Unauthorized
            raise_on_graphql_error: Whether to raise Exception on GraphQL errors (default True)
        """
        token = self._get_auth_token()
        
        # Check if we need to sleep due to rate limit (naive check)
        # In a real app we'd track this statefully, but checking the last response is good enough
        
        response = requests.post(
            GITHUB_GRAPHQL_URL,
            json={"query": query, "variables": variables},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        # Handle 401 Unauthorized - token may have expired
        if response.status_code == 401 and retry_on_401:
            logger.warning("Got 401 Unauthorized, refreshing token and retrying...")
            # Invalidate cached token
            self._installation_token = None
            self._token_expires_at = None
            # Retry once with fresh token
            return self._execute_query(query, variables, retry_on_401=False, raise_on_graphql_error=raise_on_graphql_error)
        
        # Handle Rate Limit (403)
        if response.status_code == 403:
            logger.warning("Got 403 Forbidden (likely rate limit), checking headers...")
            reset_time = response.headers.get("X-RateLimit-Reset")
            if reset_time:
                sleep_seconds = int(reset_time) - int(time.time()) + 5
                if sleep_seconds > 0:
                    logger.warning(f"Rate limit exceeded. Sleeping for {sleep_seconds} seconds until reset...")
                    time.sleep(sleep_seconds)
                    return self._execute_query(query, variables, retry_on_401=retry_on_401, raise_on_graphql_error=raise_on_graphql_error)
            
            logger.error("Rate limited by GitHub (403)")
            raise Exception("GitHub rate limit exceeded")
        
        response.raise_for_status()
        result = response.json()
        
        # Check for GraphQL-level rate limit errors
        if "errors" in result:
            for error in result["errors"]:
                if error.get("type") == "RATE_LIMIT":
                    # Use exponential backoff for max 3 retries in this context
                    # (Though usually the caller should handle major blocks)
                    logger.warning("GraphQL RATE_LIMIT error. Sleeping 60s...")
                    time.sleep(60)
                    if retry_on_401: # Use this bool to prevent infinite loops (hacky but safe for now)
                         return self._execute_query(query, variables, retry_on_401=False, raise_on_graphql_error=raise_on_graphql_error)
                    else:
                         raise Exception("GitHub GraphQL Rate Limit Exceeded (Fatal)")

        if "errors" in result and raise_on_graphql_error:
            logger.error(f"GraphQL errors: {result['errors']}")
            raise Exception(f"GraphQL error: {result['errors']}")
        
        # Log rate limit info (less frequently to reduce noise)
        rate_limit = result.get("data", {}).get("rateLimit", {})
        if rate_limit:
            remaining = rate_limit.get("remaining", 5000)
            if remaining < 100:
                reset_at = rate_limit.get("resetAt")
                logger.warning(f"📉 Low rate limit: {remaining} remaining. Reset at {reset_at}")
                # Optional: proactive sleep if very low
                if remaining < 10:
                     logger.warning("Rate limit critically low. Sleeping 60s...")
                     time.sleep(60)

        return result
    
    def search_issues(
        self,
        language: str | None = None,
        label: str | None = "good first issue",
        min_stars: int = 100,
        updated_within_hours: int | None = None,
        updated_within_days: int | None = None,
        created_within_hours: int | None = None,
        max_issues: int = 100
    ) -> list[IssueMetadata]:
        """
        Search for contribution-friendly issues using GraphQL.
        
        Much more efficient than REST - fetches 100 issues per request
        with full repository data included.
        
        Args:
            created_within_hours: If set, only fetch issues CREATED within this many hours
            updated_within_hours: If set, only fetch issues UPDATED within this many hours
        """
        # Build search query
        query_parts = [
            "is:issue",
            "is:open",
            "sort:updated-desc"
        ]
        
        # Only add stars filter if min_stars > 0 (stars:>=0 breaks GraphQL search!)
        if min_stars > 0:
            query_parts.append(f"stars:>={min_stars}")
        
        if label:
            query_parts.append(f'label:"{label}"')
        
        if language:
            query_parts.append(f"language:{language}")
        
        # Created filter takes priority (for fetching truly NEW issues)
        if created_within_hours:
            since = datetime.now(timezone.utc) - timedelta(hours=created_within_hours)
            query_parts.append(f"created:>{since.strftime('%Y-%m-%dT%H:%M:%SZ')}")
        elif updated_within_hours:
            since = datetime.now(timezone.utc) - timedelta(hours=updated_within_hours)
            query_parts.append(f"updated:>{since.strftime('%Y-%m-%dT%H:%M:%SZ')}")
        elif updated_within_days:
            since = datetime.now(timezone.utc) - timedelta(days=updated_within_days)
            query_parts.append(f"updated:>{since.strftime('%Y-%m-%d')}")
        
        search_query = " ".join(query_parts)
        logger.info(f"GraphQL search: {search_query}")
        
        all_issues = []
        cursor = None
        
        while len(all_issues) < max_issues:
            result = self._execute_query(
                SEARCH_ISSUES_QUERY,
                {"query": search_query, "cursor": cursor}
            )
            
            search_data = result["data"]["search"]
            nodes = search_data["nodes"]
            
            for node in nodes:
                if node is None:
                    continue
                    
                try:
                    metadata = self._node_to_metadata(node)
                    all_issues.append(metadata)
                except Exception as e:
                    logger.warning(f"Failed to parse issue: {e}")
                
                if len(all_issues) >= max_issues:
                    break
            
            # Check pagination
            page_info = search_data["pageInfo"]
            if not page_info["hasNextPage"]:
                break
            
            cursor = page_info["endCursor"]
            
            # Small delay between pages
            time.sleep(0.5)
        
        logger.info(f"Found {len(all_issues)} issues for query: {search_query}")
        return all_issues
    
    def _node_to_metadata(self, node: dict) -> IssueMetadata:
        """Convert a GraphQL node to IssueMetadata."""
        repo = node["repository"]
        labels = [l["name"] for l in node["labels"]["nodes"]]
        labels_lower = [l.lower() for l in labels]
        assignees = [a["login"] for a in node["assignees"]["nodes"]]
        topics = [t["topic"]["name"] for t in repo["repositoryTopics"]["nodes"]]

        # Analyze comments for claim patterns
        comments_data = node.get("comments", {})
        comments_nodes = comments_data.get("nodes", []) if comments_data else []
        has_claimer = self._analyze_comments_for_claimer(comments_nodes)

        return IssueMetadata(
            issue_id=hash(node["id"]),  # GraphQL returns string ID
            issue_number=node["number"],
            title=node["title"],
            body=node["body"][:2000] if node["body"] else None,
            labels=labels,
            created_at=node["createdAt"],
            updated_at=node["updatedAt"],
            comments_count=node["comments"]["totalCount"],
            issue_url=node["url"],
            state=node["state"].lower(),
            is_assigned=len(assignees) > 0,
            assignees_count=len(assignees),
            assignees=assignees,
            repo_name=repo["name"],
            repo_full_name=repo["nameWithOwner"],
            repo_stars=repo["stargazerCount"],
            repo_forks=repo["forkCount"],
            repo_url=repo["url"],
            language=repo["primaryLanguage"]["name"] if repo["primaryLanguage"] else None,
            repo_description=repo["description"][:500] if repo["description"] else None,
            repo_topics=topics,
            repo_license=repo["licenseInfo"]["name"] if repo["licenseInfo"] else None,
            repo_open_issues_count=repo["openIssues"]["totalCount"],
            is_good_first_issue="good first issue" in labels_lower,
            is_help_wanted="help wanted" in labels_lower,
            has_claimer=has_claimer,
        )
    
    def get_rate_limit_status(self) -> dict:
        """Check current rate limit."""
        query = """
        query {
          rateLimit {
            limit
            remaining
            resetAt
          }
        }
        """
        try:
            result = self._execute_query(query, {})
            rate_limit = result["data"]["rateLimit"]
            return {
                "limit": rate_limit["limit"],
                "remaining": rate_limit["remaining"],
                "reset_at": rate_limit["resetAt"]
            }
        except Exception as e:
            logger.warning(f"Failed to get rate limit: {e}")
            return {"limit": 5000, "remaining": 5000, "reset_at": None}
    
    def search_closed_issues(self, hours: float = 24) -> list[dict]:
        """
        Search for recently closed issues to clean up from Pinecone.
        
        Args:
            hours: Find issues closed within the last N hours
            
        Returns:
            List of dicts with id, repo, number, title for each closed issue
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        since_str = since.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        languages = ["Python", "JavaScript", "TypeScript", "Java", "C#", "Go", "Rust", "C++", "PHP", "Ruby", "Dart"]
        closed_issues = []
        
        for language in languages:
            query_str = f"is:issue is:closed updated:>{since_str} language:{language}"
            logger.info(f"Searching for closed issues: {query_str}")
            
            try:
                result = self._execute_query(
                    SEARCH_ISSUES_QUERY,
                    {"query": query_str, "cursor": None}
                )
                
                nodes = result.get("data", {}).get("search", {}).get("nodes", [])
                
                for node in nodes:
                    if not node:
                        continue
                    repo = node.get("repository", {})
                    repo_full_name = repo.get("nameWithOwner", "")
                    issue_number = node.get("number", 0)
                    
                    if repo_full_name and issue_number:
                        closed_issues.append({
                            "id": f"{repo_full_name}#{issue_number}",
                            "repo": repo_full_name,
                            "number": issue_number,
                            "title": node.get("title", ""),
                            "state": node.get("state", "CLOSED")
                        })
                        
            except Exception as e:
                logger.error(f"Error searching closed issues for {language}: {e}")
        
        logger.info(f"Found {len(closed_issues)} closed issues in last {hours} hours")
        return closed_issues
    
    def batch_check_issue_states(self, issue_ids: list[str]) -> dict[str, str]:
        """
        Check the current state of multiple issues efficiently using batched GraphQL queries.
        
        This method builds dynamic GraphQL queries to check up to 50 issues per repository
        in a single API call, dramatically reducing the number of API calls needed.
        
        Issue IDs should be in format "owner/repo#number" (e.g., "freeCodeCamp/freeCodeCamp#65018")
        
        Args:
            issue_ids: List of issue IDs to check
            
        Returns:
            Dict mapping issue_id -> state ("OPEN", "CLOSED", or "NOT_FOUND")
        """
        # Group issues by repository for efficient batching
        repo_issues: dict[str, list[int]] = {}
        
        for issue_id in issue_ids:
            try:
                # Parse "owner/repo#number" format
                repo_part, number_part = issue_id.rsplit("#", 1)
                number = int(number_part)
                
                if repo_part not in repo_issues:
                    repo_issues[repo_part] = []
                repo_issues[repo_part].append(number)
            except (ValueError, IndexError) as e:
                logger.warning(f"Invalid issue ID format: {issue_id} - {e}")
        
        logger.info(f"Checking {len(issue_ids)} issues across {len(repo_issues)} repositories")
        
        results = {}
        repos_checked = 0
        
        for repo_full_name, numbers in repo_issues.items():
            try:
                owner, name = repo_full_name.split("/", 1)
            except ValueError:
                logger.warning(f"Invalid repo format: {repo_full_name}")
                continue
            
            # Process issues in batches of 50 per repo (GraphQL query size limit)
            batch_size = 50
            for i in range(0, len(numbers), batch_size):
                batch_numbers = numbers[i:i + batch_size]
                
                try:
                    # Build dynamic GraphQL query for multiple issues
                    issue_states = self._batch_check_repo_issues(owner, name, batch_numbers)
                    
                    # Map results back to full issue IDs
                    for number in batch_numbers:
                        issue_id = f"{repo_full_name}#{number}"
                        results[issue_id] = issue_states.get(number, "NOT_FOUND")
                        
                except Exception as e:
                    logger.warning(f"Error checking issues for {repo_full_name}: {e}")
                    # Mark all issues in this batch as error
                    for number in batch_numbers:
                        results[f"{repo_full_name}#{number}"] = "ERROR"
            
            repos_checked += 1
            if repos_checked % 100 == 0:
                logger.info(f"Checked {repos_checked}/{len(repo_issues)} repositories ({len(results)} issues)...")
        
        # Count states
        state_counts = {}
        for state in results.values():
            state_counts[state] = state_counts.get(state, 0) + 1
        logger.info(f"Issue state check complete: {state_counts}")
        
        return results
    
    def _batch_check_repo_issues(self, owner: str, name: str, numbers: list[int]) -> dict[int, str]:
        """
        Check multiple issues from the same repository in a single GraphQL query.
        
        Uses dynamic query building to check up to 50 issues at once.
        
        Args:
            owner: Repository owner
            name: Repository name
            numbers: List of issue numbers to check
            
        Returns:
            Dict mapping issue_number -> state
        """
        # Build dynamic GraphQL query with aliases for each issue
        issue_queries = []
        for idx, number in enumerate(numbers):
            issue_queries.append(f'issue{idx}: issue(number: {number}) {{ number state }}')
        
        query = f"""
        query BatchCheckRepoIssues {{
          rateLimit {{
            remaining
            resetAt
          }}
          repository(owner: "{owner}", name: "{name}") {{
            {chr(10).join(issue_queries)}
          }}
        }}
        """
        
        # execution error handling: return raw result including errors
        result = self._execute_query(query, {}, raise_on_graphql_error=False)
        
        # Handle Repo NOT FOUND
        # The structure is result['errors'][0]['type'] == 'NOT_FOUND' if repo is missing
        if "errors" in result:
             for error in result["errors"]:
                 # If repo is not found, ALL issues in it are treated as NOT_FOUND (because they are gone)
                 # Path typically looks like ['repository']
                 if error.get("type") == "NOT_FOUND" and error.get("path") == ["repository"]:
                     logger.warning(f"Repository {owner}/{name} not found. Treating all {len(numbers)} issues as NOT_FOUND.")
                     return {n: "NOT_FOUND" for n in numbers}
        
        # Parse results
        repo_data = result.get("data", {}).get("repository", {})
        
        # If repo_data is None but we didn't catch specific error above, 
        # it still likely means repo is gone or inaccessible
        if not repo_data:
             logger.warning(f"Repository {owner}/{name} returned no data. Treating as NOT_FOUND.")
             return {n: "NOT_FOUND" for n in numbers}

        issue_states = {}
        
        for idx, number in enumerate(numbers):
            issue_data = repo_data.get(f"issue{idx}")
            if issue_data:
                state = issue_data.get("state", "UNKNOWN")
                # Normalize state
                issue_states[number] = state
            else:
                issue_states[number] = "NOT_FOUND"
        
        return issue_states



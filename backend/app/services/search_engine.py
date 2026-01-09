"""Search engine orchestrating query parsing, embedding, and Pinecone search."""

import logging
from datetime import datetime, timedelta, timezone

from app.models.query import SearchQuery, SearchResult, ParsedQuery
from app.services.query_parser import QueryParser
from app.services.embedder import EmbeddingService
from app.services.pinecone_client import PineconeClient

logger = logging.getLogger(__name__)

# Constants for combined scoring
MAX_STARS = 500000  # Normalize stars (e.g., max expected ~500k)
MAX_AGE_DAYS = 365  # Issues older than this get 0 recency score


class SearchEngine:
    """Orchestrates the full search flow."""
    
    def __init__(self):
        self.query_parser = QueryParser()
        self.embedder = EmbeddingService()
        self.pinecone = PineconeClient()
        
    def search(self, query: SearchQuery) -> tuple[list[SearchResult], ParsedQuery]:
        """
        Execute a search query.
        
        Returns:
            Tuple of (results, parsed_query) for transparency
        """
        # 1. Parse natural language query
        logger.info(f"Parsing query: {query.query}")
        parsed = self.query_parser.parse(query.query)
        logger.info(f"Parsed query: {parsed}")
        
        # Override with manual filters if provided
        if query.language:
            # "All" usually means no filter, handled by frontend passing None or specific check here
            parsed.language = query.language if query.language.lower() != "all" else None
            
        if query.labels:
            parsed.labels = query.labels
            
        if query.sort_by:
            parsed.sort_by = query.sort_by
            
        if query.days_ago:
            parsed.days_ago = query.days_ago
            
        if query.unassigned_only:
            parsed.unassigned_only = query.unassigned_only
            
        logger.info(f"Final query config (after manual overrides): {parsed}")
        
        # 2. Generate query embedding
        query_embedding = self.embedder.generate_query_embedding(
            parsed.semantic_query
        )
        
        # 3. Build Pinecone filter
        pinecone_filter = self._build_filter(parsed)
        logger.info(f"Pinecone filter: {pinecone_filter}")
        
        # 4. Search Pinecone - get more results for re-ranking
        raw_results = self.pinecone.search(
            query_embedding=query_embedding,
            top_k=100,  # Get more for combined scoring
            filter_dict=pinecone_filter if pinecone_filter else None
        )
        
        # 5. Convert to SearchResult with combined scoring
        results = self._process_results(raw_results, parsed)
        
        return results, parsed
    
    def get_recent_issues(
        self, 
        limit: int = 20, 
        sort_by: str = "newest",
        languages: list[str] | None = None,
        labels: list[str] | None = None,
        days_ago: int | None = None
    ) -> list[SearchResult]:
        """Get recent issues for default homepage display.
        
        Args:
            limit: Number of results to return
            sort_by: 
                - "newest" (newly created issues - by created_at) - DEFAULT
                - "recently_discussed" (recently updated - by updated_at)
                - "relevance" (combined score)
                - "stars" (popularity)
            languages: Filter by programming languages (list)
            labels: Filter by issue labels (list)
            days_ago: Filter by issues updated within N days
        """
        # Use a generic query embedding for "open source contributions"
        query_embedding = self.embedder.generate_query_embedding(
            "beginner friendly open source contributions help wanted"
        )
        
        # Build filter dict
        filter_dict = {
            "type": {"$ne": "stats"}  # Exclude administrative records
        }
        
        # Time filter based on sort type or explicit days_ago
        if days_ago:
            cutoff_ts = int((datetime.now(timezone.utc) - timedelta(days=days_ago)).timestamp())
            filter_dict["updated_at_ts"] = {"$gte": cutoff_ts}
        elif sort_by == "newest":
            # For "newest", filter by created_at (last 24 hours for truly new issues)
            cutoff_ts = int((datetime.now(timezone.utc) - timedelta(hours=24)).timestamp())
            filter_dict["created_at_ts"] = {"$gte": cutoff_ts}
        else:
            # For other sorts, filter by updated_at (last 30 days)
            cutoff_ts = int((datetime.now(timezone.utc) - timedelta(days=30)).timestamp())
            filter_dict["updated_at_ts"] = {"$gte": cutoff_ts}
        
        # Multi-language filter
        if languages:
            if len(languages) == 1:
                filter_dict["language"] = {"$eq": languages[0]}
            else:
                filter_dict["language"] = {"$in": languages}
        
        raw_results = self.pinecone.search(
            query_embedding=query_embedding,
            top_k=200,  # Fetch more to account for filtering
            filter_dict=filter_dict
        )
        
        # Process results
        results = []
        now = datetime.now(timezone.utc)
        
        for match in raw_results:
            metadata = match["metadata"]
            
            # Label filter (done in Python since Pinecone doesn't support array contains)
            if labels:
                issue_labels = metadata.get("labels", [])
                if not any(lbl.lower() in [l.lower() for l in issue_labels] for lbl in labels):
                    continue
            
            result = self._create_result(match)
            
            # Calculate combined score for display
            result.score = self._calculate_combined_score(
                semantic_score=match["score"],
                stars=metadata["repo_stars"],
                updated_at=metadata["updated_at"],
                now=now
            )
            results.append(result)
        
        # Sort based on user preference
        if sort_by == "newest":
            # Newly created issues first (by created_at timestamp)
            results.sort(key=lambda x: x.created_at, reverse=True)
        elif sort_by == "recently_discussed":
            # Recently updated/commented issues first (by updated_at timestamp)
            results.sort(key=lambda x: x.updated_at, reverse=True)
        elif sort_by == "stars":
            # Sort by stars (popularity)
            results.sort(key=lambda x: x.repo_stars, reverse=True)
        else:
            # Default: combined score (relevance)
            results.sort(key=lambda x: x.score, reverse=True)
        
        return results[:limit]
    
    def _calculate_combined_score(
        self,
        semantic_score: float,
        stars: int,
        updated_at: str,
        now: datetime
    ) -> float:
        """Calculate combined score factoring in relevance, recency, and popularity.
        
        Weights:
        - 40% semantic relevance (Pinecone score)
        - 35% recency (newer is better)
        - 25% popularity (more stars is better)
        """
        # Normalize stars (0-1)
        stars_score = min(stars / MAX_STARS, 1.0)
        
        # Calculate recency score (0-1, newer is higher)
        try:
            updated = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            age_days = (now - updated).days
            recency_score = max(0, 1 - (age_days / MAX_AGE_DAYS))
        except:
            recency_score = 0.5  # Default if parsing fails
        
        # Updated weights (User Request: Remove star bias by default)
        # - 70% semantic relevance 
        # - 30% recency
        # - 0% popularity (stars excluded from default ranking)
        combined = (
            0.70 * semantic_score +
            0.30 * recency_score +
            0.00 * stars_score
        )
        
        return round(combined, 4)
    
    def _build_filter(self, parsed: ParsedQuery) -> dict | None:
        """Build Pinecone filter from parsed query."""
        # Always exclude stats records
        conditions = [{
            "type": {"$ne": "stats"}
        }]
        
        # Language filter
        if parsed.language:
            conditions.append({
                "language": {"$eq": parsed.language}
            })
            
        # Stars filter
        if parsed.min_stars:
            conditions.append({
                "repo_stars": {"$gte": parsed.min_stars}
            })
            
        if parsed.max_stars:
            conditions.append({
                "repo_stars": {"$lte": parsed.max_stars}
            })
            
        # Label filters
        if parsed.labels:
            for label in parsed.labels:
                label_lower = label.lower()
                if label_lower == "good first issue":
                    conditions.append({"is_good_first_issue": {"$eq": True}})
                elif label_lower == "help wanted":
                    conditions.append({"is_help_wanted": {"$eq": True}})
        
        # Unassigned filter
        if parsed.unassigned_only:
            conditions.append({
                "is_assigned": {"$eq": False}
            })
                    
        # Time filter (days_ago)
        if parsed.days_ago:
            cutoff_ts = int((datetime.now(timezone.utc) - timedelta(days=parsed.days_ago)).timestamp())
            conditions.append({
                "updated_at_ts": {"$gte": cutoff_ts}
            })
            
        # Difficulty mapping to labels
        if parsed.difficulty == "beginner":
            conditions.append({
                "$or": [
                    {"is_good_first_issue": {"$eq": True}},
                    {"is_help_wanted": {"$eq": True}}
                ]
            })
            
        if not conditions:
            return None
            
        if len(conditions) == 1:
            return conditions[0]
            
        return {"$and": conditions}
    
    def _create_result(self, match: dict) -> SearchResult:
        """Create a SearchResult from a Pinecone match."""
        metadata = match["metadata"]
        return SearchResult(
            issue_id=metadata["issue_id"],
            issue_number=metadata["issue_number"],
            title=metadata["title"],
            body=metadata.get("body"),
            repo_name=metadata["repo_name"],
            repo_full_name=metadata["repo_full_name"],
            repo_stars=metadata["repo_stars"],
            repo_forks=metadata["repo_forks"],
            language=metadata.get("language"),
            labels=metadata.get("labels", []),
            created_at=metadata["created_at"],
            updated_at=metadata["updated_at"],
            comments_count=metadata["comments_count"],
            issue_url=metadata["issue_url"],
            repo_url=metadata["repo_url"],
            score=match["score"],
            is_assigned=metadata.get("is_assigned", False),
            assignees_count=metadata.get("assignees_count", 0),
            repo_description=metadata.get("repo_description"),
            repo_topics=metadata.get("repo_topics", []),
            repo_license=metadata.get("repo_license")
        )
    
    def _process_results(
        self, 
        raw_results: list[dict], 
        parsed: ParsedQuery
    ) -> list[SearchResult]:
        """Process and sort raw Pinecone results with combined scoring."""
        results = []
        now = datetime.now(timezone.utc)
        
        for match in raw_results:
            metadata = match["metadata"]
            
            # Post-filter by topics if specified
            if parsed.topics:
                repo_topics = metadata.get("repo_topics", [])
                topic_match = any(
                    topic.lower() in [t.lower() for t in repo_topics]
                    for topic in parsed.topics
                )
                if not topic_match:
                    continue
            
            result = self._create_result(match)
            
            # Calculate combined score
            result.score = self._calculate_combined_score(
                semantic_score=match["score"],
                stars=metadata["repo_stars"],
                updated_at=metadata["updated_at"],
                now=now
            )
            results.append(result)
        
        # Apply sorting based on parsed preference
        if parsed.sort_by == "stars":
            results.sort(key=lambda x: x.repo_stars, reverse=True)
        elif parsed.sort_by == "recency":
            results.sort(key=lambda x: x.updated_at, reverse=True)
        else:
            # "relevance" now uses combined score
            results.sort(key=lambda x: x.score, reverse=True)
            
        return results

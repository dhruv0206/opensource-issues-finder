"""Search API routes."""

from fastapi import APIRouter, HTTPException
import logging

from app.models.query import SearchQuery, SearchResult, ParsedQuery, RecentResponse
from app.services.search_engine import SearchEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])

# Initialize search engine
search_engine = SearchEngine()


@router.post("")
async def search(query: SearchQuery) -> dict:
    """
    Search for GitHub issues using natural language.
    
    The query will be parsed to extract:
    - Semantic meaning (for embedding search)
    - Structured filters (language, stars, labels, etc.)
    
    Returns matching issues ranked by combined score (relevance + recency + stars).
    """
    try:
        all_results, parsed_query = search_engine.search(query)
        
        # Calculate pagination
        total = len(all_results)
        total_pages = (total + query.limit - 1) // query.limit if total > 0 else 1
        page = max(1, min(query.page, total_pages))
        
        # Slice results for current page
        start_idx = (page - 1) * query.limit
        end_idx = start_idx + query.limit
        page_results = all_results[start_idx:end_idx]
        
        return {
            "results": [r.model_dump() for r in page_results],
            "parsed_query": parsed_query.model_dump(),
            "total": total,
            "page": page,
            "limit": query.limit,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent", response_model=RecentResponse)
async def get_recent_issues(
    limit: int = 20, 
    sort_by: str = "recently_discussed",
    languages: str | None = None,
    labels: str | None = None,
    days_ago: float | None = None,
    unassigned_only: bool = False
) -> RecentResponse:
    """
    Get recent contribution opportunities for homepage display.
    
    Args:
        limit: Number of results to return
        sort_by: 
            - "newest" (newly created issues - DEFAULT)
            - "recently_discussed" (recently updated/commented)
            - "relevance" (combined score)
            - "stars" (popularity)
        languages: Comma-separated list of languages (e.g., "Python,JavaScript")
        labels: Comma-separated list of labels (e.g., "good first issue,help wanted")
        days_ago: Filter by issues updated within N days
        unassigned_only: Only show unassigned issues
    
    Returns issues from the last 30 days (or 24h for "newest" sort).
    """
    try:
        # Parse comma-separated lists
        language_list = [l.strip() for l in languages.split(",")] if languages else None
        label_list = [l.strip() for l in labels.split(",")] if labels else None

        results = search_engine.get_recent_issues(
            limit=limit, 
            sort_by=sort_by,
            languages=language_list,
            labels=label_list,
            days_ago=days_ago,
            unassigned_only=unassigned_only
        )
        
        return RecentResponse(
            results=results,
            total=len(results)
        )
        
    except Exception as e:
        logger.error(f"Recent issues error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/last-updated")
async def get_last_updated() -> dict:
    """Get the timestamp of the most recently updated issue."""
    try:
        from datetime import datetime
        
        # Use get_recent_issues to find the single newest issue by updated_at
        # This reuses the correct sorting logic defined in SearchEngine
        results = search_engine.get_recent_issues(
            limit=1,
            sort_by="recently_discussed"
        )
        
        if results:
            newest_issue = results[0]
            # Convert ISO string to dt object
            dt = datetime.fromisoformat(newest_issue.updated_at.replace('Z', '+00:00'))
            return {
                "last_updated": newest_issue.updated_at,
                "timestamp": dt.timestamp()
            }
        
        return {"last_updated": None, "timestamp": None}
        
    except Exception as e:
        logger.error(f"Last updated error: {e}")
        return {"last_updated": None, "error": str(e)}


@router.get("/health")
async def health_check() -> dict:
    """Check if search service is healthy."""
    try:
        stats = search_engine.pinecone.get_index_stats()
        return {
            "status": "healthy",
            "index_stats": stats
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@router.get("/stats")
async def get_stats() -> dict:
    """Get index statistics for display on homepage."""
    try:
        stats = search_engine.pinecone.get_index_stats()
        total_issues = stats.get("total_vector_count", 0)
        
        # Estimate unique repos (we'd need to query for this, but for now use cached/estimated)
        # A more accurate count would require a separate query or metadata tracking
        return {
            "total_issues": total_issues,
            "total_repos": None,  # Can be added later with proper tracking
            "last_updated": None
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {
            "total_issues": 0,
            "total_repos": None,
            "error": str(e)
        }

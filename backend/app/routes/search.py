"""Search API routes."""

from fastapi import APIRouter, HTTPException
import logging

from app.models.query import SearchQuery, SearchResult, ParsedQuery
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


@router.get("/recent")
async def get_recent_issues(
    limit: int = 20, 
    sort_by: str = "newest",
    language: str | None = None,
    label: str | None = None,
    days_ago: int | None = None
) -> dict:
    """
    Get recent contribution opportunities for homepage display.
    
    Args:
        limit: Number of results to return
        sort_by: 
            - "newest" (newly created issues - DEFAULT)
            - "recently_discussed" (recently updated/commented)
            - "relevance" (combined score)
            - "stars" (popularity)
        language: Filter by programming language (e.g., "Python", "JavaScript")
        label: Filter by issue label (e.g., "good first issue", "help wanted")
        days_ago: Filter by issues updated within N days
    
    Returns issues from the last 30 days (or 24h for "newest" sort).
    """
    try:
        labels = [label] if label else None
        results = search_engine.get_recent_issues(
            limit=limit, 
            sort_by=sort_by,
            language=language,
            labels=labels,
            days_ago=days_ago
        )
        
        return {
            "results": [r.model_dump() for r in results],
            "total": len(results)
        }
        
    except Exception as e:
        logger.error(f"Recent issues error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/last-updated")
async def get_last_updated() -> dict:
    """Get the timestamp of the most recently ingested issue."""
    try:
        from datetime import datetime
        
        # Query multiple results and find the max ingested_at
        # (Pinecone doesn't support sorting by metadata)
        results = search_engine.pinecone.index.query(
            vector=[0.0] * 768,  # Dummy vector
            top_k=100,  # Get many to find the newest
            include_metadata=True,
            filter={"ingested_at": {"$gt": 0}}
        )
        
        if results.matches:
            # Find max ingested_at
            max_ts = max(m.metadata.get("ingested_at", 0) for m in results.matches)
            if max_ts > 0:
                dt = datetime.fromtimestamp(max_ts)
                return {
                    "last_updated": dt.isoformat(),
                    "timestamp": max_ts
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

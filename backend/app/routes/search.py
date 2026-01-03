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
async def get_recent_issues(limit: int = 20) -> dict:
    """
    Get recent contribution opportunities for homepage display.
    
    Returns issues from the last 30 days, ranked by combined score
    (recency + popularity + relevance to contributions).
    """
    try:
        results = search_engine.get_recent_issues(limit=limit)
        
        return {
            "results": [r.model_dump() for r in results],
            "total": len(results)
        }
        
    except Exception as e:
        logger.error(f"Recent issues error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

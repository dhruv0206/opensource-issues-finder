"""Ingestion API routes."""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import logging

from app.config import get_settings
from app.services.github_fetcher import GitHubFetcher
from app.services.embedder import EmbeddingService
from app.services.pinecone_client import PineconeClient
from app.models.issue import Issue

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


class IngestRequest(BaseModel):
    """Request model for ingestion."""
    languages: list[str] | None = None
    repos_per_language: int = 10
    max_issues_per_repo: int = 20


class IngestStatus(BaseModel):
    """Status of ingestion job."""
    status: str
    message: str


# Track ingestion status
ingestion_status = {"running": False, "message": "No ingestion in progress"}


def run_ingestion(
    languages: list[str],
    repos_per_language: int,
    max_issues_per_repo: int
):
    """Background task to run ingestion."""
    global ingestion_status
    
    try:
        ingestion_status = {"running": True, "message": "Starting ingestion..."}
        
        fetcher = GitHubFetcher()
        embedder = EmbeddingService()
        pinecone = PineconeClient()
        
        # Ensure index exists
        pinecone.ensure_index_exists()
        
        total_issues = 0
        
        for lang in languages:
            ingestion_status["message"] = f"Fetching {lang} repositories..."
            logger.info(f"Processing language: {lang}")
            
            repos = fetcher.get_top_repos(lang, limit=repos_per_language)
            
            for repo in repos:
                ingestion_status["message"] = f"Processing {repo.full_name}..."
                
                # Get issues
                issues_metadata = fetcher.get_contribution_issues(
                    repo, 
                    max_issues=max_issues_per_repo
                )
                
                if not issues_metadata:
                    continue
                    
                # Generate embeddings
                texts = [embedder.create_issue_text(m) for m in issues_metadata]
                embeddings = embedder.generate_embeddings_batch(texts)
                
                # Create Issue objects
                issues = []
                for metadata, embedding in zip(issues_metadata, embeddings):
                    issue = Issue(
                        id=Issue.create_id(metadata.repo_full_name, metadata.issue_number),
                        embedding=embedding,
                        metadata=metadata
                    )
                    issues.append(issue)
                    
                # Upsert to Pinecone
                pinecone.upsert_issues(issues)
                total_issues += len(issues)
                
                logger.info(f"Ingested {len(issues)} issues from {repo.full_name}")
                
        ingestion_status = {
            "running": False, 
            "message": f"Completed! Ingested {total_issues} issues."
        }
        
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        ingestion_status = {"running": False, "message": f"Error: {str(e)}"}


@router.post("/start")
async def start_ingestion(
    request: IngestRequest,
    background_tasks: BackgroundTasks
) -> IngestStatus:
    """
    Start ingestion of GitHub issues into Pinecone.
    
    This runs in the background. Use /status to check progress.
    """
    global ingestion_status
    
    if ingestion_status.get("running"):
        raise HTTPException(
            status_code=400, 
            detail="Ingestion already in progress"
        )
        
    settings = get_settings()
    languages = request.languages or settings.default_languages
    
    background_tasks.add_task(
        run_ingestion,
        languages,
        request.repos_per_language,
        request.max_issues_per_repo
    )
    
    return IngestStatus(
        status="started",
        message=f"Ingestion started for languages: {', '.join(languages)}"
    )


@router.get("/status")
async def get_ingestion_status() -> IngestStatus:
    """Get current ingestion status."""
    return IngestStatus(
        status="running" if ingestion_status.get("running") else "idle",
        message=ingestion_status.get("message", "")
    )


@router.get("/rate-limit")
async def get_rate_limit() -> dict:
    """Get GitHub API rate limit status."""
    fetcher = GitHubFetcher()
    return fetcher.get_rate_limit_status()

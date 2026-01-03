"""Standalone ingestion script for populating Pinecone."""

import sys
import logging
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.config import get_settings
from app.services.github_fetcher import GitHubFetcher
from app.services.embedder import EmbeddingService
from app.services.pinecone_client import PineconeClient
from app.models.issue import Issue

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Ingest GitHub issues into Pinecone"
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        default=None,
        help="Languages to fetch (default: from config)"
    )
    parser.add_argument(
        "--repos-per-language",
        type=int,
        default=10,
        help="Number of repos per language (default: 10)"
    )
    parser.add_argument(
        "--min-stars",
        type=int,
        default=100,
        help="Minimum stars for repos (default: 100)"
    )
    parser.add_argument(
        "--min-contributors",
        type=int,
        default=None,
        help="Minimum contributors for repos (optional)"
    )
    parser.add_argument(
        "--recent-days",
        type=int,
        default=90,
        help="Only fetch issues with activity in the last N days (default: 90)"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing data before ingestion"
    )
    
    args = parser.parse_args()
    
    settings = get_settings()
    languages = args.languages or settings.default_languages
    
    logger.info(f"Starting ingestion for languages: {languages}")
    logger.info(f"Repos per language: {args.repos_per_language}")
    logger.info(f"Min stars: {args.min_stars}")
    if args.min_contributors:
        logger.info(f"Min contributors: {args.min_contributors}")
    logger.info(f"Issues with activity in last {args.recent_days} days")
    
    # Initialize services
    fetcher = GitHubFetcher()
    embedder = EmbeddingService()
    pinecone = PineconeClient()
    
    # Check rate limits first
    rate_limit = fetcher.get_rate_limit_status()
    logger.info(f"GitHub API rate limit: {rate_limit}")
    
    if rate_limit["core_remaining"] < 100:
        logger.warning("Low rate limit remaining. Consider waiting.")
        
    # Ensure index exists
    pinecone.ensure_index_exists()
    
    if args.clear:
        logger.warning("Clearing existing data...")
        pinecone.delete_all()
    
    total_issues = 0
    
    for lang in languages:
        logger.info(f"\n{'='*50}")
        logger.info(f"Processing language: {lang}")
        logger.info(f"{'='*50}")
        
        try:
            # Fetch repos with filters
            repos = fetcher.get_top_repos(
                lang,
                limit=args.repos_per_language,
                min_stars=args.min_stars,
                min_contributors=args.min_contributors
            )
            
            for repo in repos:
                logger.info(f"\nProcessing: {repo.full_name} ({repo.stargazers_count} stars)")
                
                # Get ALL recent contribution issues (no max limit)
                issues_metadata = fetcher.get_contribution_issues(
                    repo,
                    recent_days=args.recent_days
                )
                
                if not issues_metadata:
                    logger.info(f"  No recent contribution issues found")
                    continue
                    
                logger.info(f"  Found {len(issues_metadata)} recent contribution issues")
                
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
                
                logger.info(f"  Ingested {len(issues)} issues (total: {total_issues})")
                
        except Exception as e:
            logger.error(f"Error processing {lang}: {e}")
            continue
            
    logger.info(f"\n{'='*50}")
    logger.info(f"Ingestion complete! Total issues: {total_issues}")
    logger.info(f"{'='*50}")
    
    # Final stats
    stats = pinecone.get_index_stats()
    logger.info(f"Index stats: {stats}")


if __name__ == "__main__":
    main()

"""Improved cleanup script that checks ALL indexed issues against GitHub.

This script:
1. Lists ALL issue IDs from Pinecone
2. Batch-checks each issue on GitHub to get current state
3. Deletes any issues that are now CLOSED or NOT_FOUND

This is more reliable than the old approach which only searched for
recently closed issues and could miss many.

Usage:
    python -m scripts.cleanup_closed_issues
    python -m scripts.cleanup_closed_issues --dry-run
    python -m scripts.cleanup_closed_issues --limit 1000
"""

import argparse
import logging
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from app.services.graphql_fetcher import GraphQLFetcher
from app.services.pinecone_client import PineconeClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Cleanup closed issues from Pinecone by checking ALL indexed issues"
    )
    parser.add_argument(
        "--dry-run", 
        action="store_true",
        help="Only check issues, don't delete anything"
    )
    parser.add_argument(
        "--limit", 
        type=int, 
        default=None,
        help="Limit number of issues to check (default: None = check all)"
    )
    parser.add_argument(
        "--batch-size", 
        type=int, 
        default=500,
        help="Number of issues to check per batch before saving progress"
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("IMPROVED PINECONE CLEANUP - Checking ALL Indexed Issues")
    logger.info("=" * 60)
    
    if args.dry_run:
        logger.info("🔍 DRY RUN MODE - No deletions will be made")
    
    # Initialize clients
    pinecone = PineconeClient()
    fetcher = GraphQLFetcher()
    
    # Step 1: Get index stats
    stats = pinecone.get_index_stats()
    total_vectors = stats.get("total_vector_count", 0)
    logger.info(f"📊 Pinecone index has {total_vectors:,} issues")
    
    # Step 2: List all issue IDs from Pinecone
    logger.info("\n" + "=" * 60)
    logger.info("Step 1: Listing all issue IDs from Pinecone...")
    logger.info("=" * 60)
    
    all_ids = pinecone.list_all_ids()
    logger.info(f"Found {len(all_ids):,} issue IDs in Pinecone")
    
    
    if not all_ids:
        logger.info("No issues to check. Exiting.")
        return 0
    
    # Apply limit if specified
    if args.limit:
        all_ids = all_ids[:args.limit]
        logger.info(f"Limited to {len(all_ids):,} issues for this run")
    
    # Step 3: Batch check issues on GitHub
    logger.info("\n" + "=" * 60)
    logger.info("Step 2: Checking issue states on GitHub...")
    logger.info("=" * 60)
    
    closed_ids = []
    not_found_ids = []
    open_ids = []
    error_ids = []
    
    # Process in batches for memory efficiency
    batch_size = args.batch_size
    total_batches = (len(all_ids) + batch_size - 1) // batch_size
    logger.info(f"Processing {len(all_ids):,} issues in {total_batches} batches")
    
    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(all_ids))
        batch_ids = all_ids[start_idx:end_idx]
        
        logger.info(f"\nProcessing batch {batch_num + 1}/{total_batches} ({len(batch_ids)} issues)")
        
        # Check this batch
        states = fetcher.batch_check_issue_states(batch_ids)
        
        # Categorize results
        for issue_id, state in states.items():
            if state == "CLOSED":
                closed_ids.append(issue_id)
            elif state == "NOT_FOUND":
                not_found_ids.append(issue_id)
            elif state == "OPEN":
                open_ids.append(issue_id)
            else:
                error_ids.append(issue_id)
        
        # Progress summary
        logger.info(f"Batch {batch_num + 1} complete: {len(closed_ids)} closed, {len(not_found_ids)} not found, {len(open_ids)} open")
    
    # Step 4: Summary
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✅ OPEN issues (keep):      {len(open_ids):,}")
    logger.info(f"❌ CLOSED issues (delete):  {len(closed_ids):,}")
    logger.info(f"🔍 NOT FOUND (delete):      {len(not_found_ids):,}")
    logger.info(f"⚠️  ERRORS (skip):           {len(error_ids):,}")
    
    # Combine IDs to delete
    ids_to_delete = closed_ids + not_found_ids
    logger.info(f"\n📌 Total to delete: {len(ids_to_delete):,}")
    
    # Step 5: Delete from Pinecone
    if ids_to_delete and not args.dry_run:
        logger.info("\n" + "=" * 60)
        logger.info("Step 3: Deleting closed/missing issues from Pinecone...")
        logger.info("=" * 60)
        
        deleted = pinecone.delete_by_ids(ids_to_delete)
        logger.info(f"🗑️  Deleted {deleted:,} issues from Pinecone")
        
        # Verify
        new_stats = pinecone.get_index_stats()
        new_total = new_stats.get("total_vector_count", 0)
        logger.info(f"📊 New index size: {new_total:,} (was {total_vectors:,})")
    elif args.dry_run:
        logger.info("\n🔍 DRY RUN - Would have deleted these issues:")
        for issue_id in ids_to_delete[:20]:
            logger.info(f"  - {issue_id}")
        if len(ids_to_delete) > 20:
            logger.info(f"  ... and {len(ids_to_delete) - 20} more")
    else:
        logger.info("\n✨ No issues to delete!")
    
    # Final rate limit check
    logger.info("\n" + "=" * 60)
    try:
        rate_limit = fetcher.get_rate_limit_status()
        logger.info(f"📈 Final rate limit: {rate_limit.get('remaining')}/{rate_limit.get('limit')}")
    except:
        pass
    
    logger.info("=" * 60)
    logger.info("Cleanup complete!")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

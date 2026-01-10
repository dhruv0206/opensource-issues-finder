"""Pinecone vector database client."""

import logging
from pinecone import Pinecone, ServerlessSpec

from app.config import get_settings
from app.models.issue import Issue, IssueMetadata

logger = logging.getLogger(__name__)


class PineconeClient:
    """Manages Pinecone index operations."""
    
    def __init__(self):
        settings = get_settings()
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index_name = settings.pinecone_index_name
        self.dimension = settings.embedding_dimension
        self._index = None
        
    def ensure_index_exists(self) -> None:
        """Create index if it doesn't exist."""
        existing_indexes = [idx.name for idx in self.pc.list_indexes()]
        
        if self.index_name not in existing_indexes:
            logger.info(f"Creating Pinecone index: {self.index_name}")
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
            logger.info(f"Index {self.index_name} created")
        else:
            logger.info(f"Index {self.index_name} already exists")
            
    @property
    def index(self):
        """Get the Pinecone index."""
        if self._index is None:
            self._index = self.pc.Index(self.index_name)
        return self._index
    
    def upsert_issues(
        self, 
        issues: list[Issue], 
        batch_size: int = 100
    ) -> int:
        """Upsert issues into Pinecone."""
        total_upserted = 0
        
        for i in range(0, len(issues), batch_size):
            batch = issues[i:i + batch_size]
            vectors = []
            
            for issue in batch:
                vectors.append({
                    "id": issue.id,
                    "values": issue.embedding,
                    "metadata": issue.metadata.model_dump(exclude_none=True)
                })
                
            self.index.upsert(vectors=vectors)
            total_upserted += len(batch)
            logger.info(f"Upserted batch {i//batch_size + 1}, total: {total_upserted}")
            
        return total_upserted
    
    def search(
        self,
        query_embedding: list[float],
        top_k: int = 20,
        filter_dict: dict | None = None
    ) -> list[dict]:
        """Search for similar issues with optional filters."""
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict
        )
        
        return [
            {
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata
            }
            for match in results.matches
        ]
    
    def get_index_stats(self) -> dict:
        """Get index statistics."""
        return self.index.describe_index_stats()
    
    def delete_all(self) -> None:
        """Delete all vectors from the index."""
        self.index.delete(delete_all=True)
        logger.info("Deleted all vectors from index")
    
    def list_all_ids(self, batch_size: int = 100) -> list[str]:
        """
        List all vector IDs in the index using pagination.
        
        The Pinecone SDK's list() method returns a generator that automatically
        handles pagination internally.
        
        Args:
            batch_size: Number of IDs to fetch per page
            
        Returns:
            List of all vector IDs in the index
        """
        all_ids = []
        
        # The list() method returns a generator that yields pages of IDs
        # Each iteration returns a list of IDs
        try:
            for ids_batch in self.index.list(limit=batch_size):
                # ids_batch is a list of IDs
                all_ids.extend(ids_batch)
                
                if len(all_ids) % 5000 == 0:
                    logger.info(f"Listed {len(all_ids)} IDs so far...")
        except Exception as e:
            logger.error(f"Error listing IDs: {e}")
            # Fallback: try to get IDs by querying with a dummy vector
            logger.info("Falling back to query-based ID extraction...")
            return self._list_ids_via_query()
        
        logger.info(f"Total IDs in index: {len(all_ids)}")
        return all_ids
    
    def _list_ids_via_query(self) -> list[str]:
        """
        Fallback method to list IDs by querying with a dummy vector.
        Less efficient but works on all index types.
        """
        dummy_vector = [0.0] * self.dimension
        
        # Query for a large number of results
        results = self.index.query(
            vector=dummy_vector,
            top_k=10000,
            include_metadata=False
        )
        
        ids = [match["id"] for match in results.get("matches", [])]
        logger.info(f"Found {len(ids)} IDs via query fallback")
        return ids
    
    def fetch_by_ids(self, ids: list[str]) -> dict[str, dict]:
        """
        Fetch existing vectors by their IDs to check for changes.
        
        Uses Read Units (RUs) which are much cheaper than Write Units (WUs).
        This enables the "skip unchanged issues" optimization.
        
        Args:
            ids: List of vector IDs to fetch
            
        Returns:
            Dict mapping id -> metadata (only for IDs that exist)
        """
        if not ids:
            return {}
        
        result = {}
        
        # Pinecone fetch has a limit of 1000 IDs per request
        batch_size = 1000
        for i in range(0, len(ids), batch_size):
            batch = ids[i:i + batch_size]
            try:
                response = self.index.fetch(ids=batch)
                
                # response.vectors is a dict of id -> vector data
                for vector_id, vector_data in response.vectors.items():
                    result[vector_id] = vector_data.metadata if vector_data.metadata else {}
                    
            except Exception as e:
                logger.warning(f"Error fetching batch {i//batch_size + 1}: {e}")
        
        logger.info(f"Fetched {len(result)} existing issues from Pinecone")
        return result
    
    def delete_by_ids(self, ids: list[str], batch_size: int = 100) -> int:
        """
        Delete vectors by their IDs.
        
        Args:
            ids: List of vector IDs to delete
            batch_size: Number of IDs to delete per batch
            
        Returns:
            Number of IDs deleted
        """
        deleted_count = 0
        
        for i in range(0, len(ids), batch_size):
            batch = ids[i:i + batch_size]
            try:
                self.index.delete(ids=batch)
                deleted_count += len(batch)
                if deleted_count % 500 == 0:
                    logger.info(f"Deleted {deleted_count} IDs so far...")
            except Exception as e:
                logger.error(f"Error deleting batch: {e}")
        
        logger.info(f"Total deleted: {deleted_count}")
        return deleted_count

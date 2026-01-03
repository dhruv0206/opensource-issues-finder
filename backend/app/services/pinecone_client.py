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
                    "metadata": issue.metadata.model_dump()
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

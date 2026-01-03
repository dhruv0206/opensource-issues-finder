"""Embedding service using Google GenAI text-embedding-004."""

import logging
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.models.issue import IssueMetadata

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates embeddings using Google GenAI text-embedding-004."""
    
    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "text-embedding-004"
        self.dimension = settings.embedding_dimension
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        result = self.client.models.embed_content(
            model=self.model,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
        )
        return result.embeddings[0].values
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    def generate_query_embedding(self, query: str) -> list[float]:
        """Generate embedding for a search query."""
        result = self.client.models.embed_content(
            model=self.model,
            contents=query,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
        )
        return result.embeddings[0].values
    
    def generate_embeddings_batch(
        self, 
        texts: list[str], 
        batch_size: int = 100
    ) -> list[list[float]]:
        """Generate embeddings for multiple texts in batches."""
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            result = self.client.models.embed_content(
                model=self.model,
                contents=batch,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            )
            all_embeddings.extend([e.values for e in result.embeddings])
            logger.info(f"Generated embeddings for batch {i//batch_size + 1}")
            
        return all_embeddings
    
    def create_issue_text(self, metadata: IssueMetadata) -> str:
        """Create text representation of an issue for embedding."""
        parts = [
            f"Repository: {metadata.repo_full_name}",
            f"Language: {metadata.language or 'Unknown'}",
            f"Stars: {metadata.repo_stars}",
            f"Title: {metadata.title}",
        ]
        
        if metadata.labels:
            parts.append(f"Labels: {', '.join(metadata.labels)}")
            
        if metadata.body:
            body_preview = metadata.body[:1000]
            parts.append(f"Description: {body_preview}")
            
        return "\n".join(parts)

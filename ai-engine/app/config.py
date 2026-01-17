"""Configuration settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""
    
    # GitHub (legacy token - keep for fallback)
    github_token: str | None = None
    
    # GitHub App (preferred) - use GH_ prefix to avoid Actions naming conflict
    gh_app_id: int | None = None
    gh_private_key: str | None = None  # PEM content as string
    gh_private_key_path: str | None = None # Path to PEM file (for local dev)
    
    # Gemini
    gemini_api_key: str
    
    # Pinecone
    pinecone_api_key: str
    pinecone_index_name: str = "github-contributions"
    pinecone_environment: str | None = None
    
    # Database
    database_url: str | None = None
    
    # App settings
    embedding_model: str = "models/text-embedding-004"
    embedding_dimension: int = 768
    
    # Ingestion settings
    default_languages: list[str] = [
        "Python", 
        "JavaScript", 
        "TypeScript", 
        "Java", 
        "C#", 
        "Go", 
        "Rust", 
        "C++", 
        "PHP", 
        "Ruby",
        "Dart"
    ]
    repos_per_language: int = 100
    contribution_labels: list[str] = [
        # Standard GitHub labels
        "good first issue",
        "help wanted",
        # Beginner-friendly variations
        "beginner",
        "beginner friendly",
        "beginner-friendly",
        "good for beginner",
        "good-for-beginner",
        "first-timers-only",
        "first timers only",
        "newbie",
        "starter",
        "easy",
        "easy fix",
        "easy-pick",
        "E-easy",
        # Contribution-specific
        "contribution-starter",
        "contributor-friendly",
        "Good for New Contributors",
        "Good First Bug",
        "beginners-only",
        "up-for-grabs",
        "jump in",
        # Type-based (often beginner-friendly)
        "documentation",
        "docs",
        "typo",
        "low-hanging-fruit",
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

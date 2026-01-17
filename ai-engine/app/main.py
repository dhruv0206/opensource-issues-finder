"""FastAPI main application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.routes import search, ingest, issues

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Create FastAPI app
app = FastAPI(
    title="GitHub Contribution Finder",
    description="AI-powered search for open source contribution opportunities",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for public API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search.router)
app.include_router(ingest.router)
app.include_router(issues.router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "GitHub Contribution Finder API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "search": "POST /api/search",
            "ingest": "POST /api/ingest/start",
            "status": "GET /api/ingest/status",
            "health": "GET /api/search/health"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

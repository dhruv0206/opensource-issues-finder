"""Natural language query parser using Google GenAI."""

import json
import logging
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.models.query import ParsedQuery

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a query parser for a GitHub Contribution Finder - a search system that helps developers find open source contribution opportunities including repositories, issues, and projects to contribute to.

Parse the user's natural language query into structured filters.

You must respond with a JSON object containing these fields:
- semantic_query: string - The main search terms for semantic similarity (what the user is looking for)
- language: string or null - Programming language filter (Python, JavaScript, TypeScript, Go, Rust, Java, C++, etc.)
- min_stars: integer or null - Minimum repository stars (e.g., "popular" = 1000, "very popular" = 5000, "trending" = 500)
- max_stars: integer or null - Maximum repository stars (rarely used)
- labels: array of strings or null - Issue labels to filter by (good first issue, help wanted, bug, documentation, enhancement, etc.)
- difficulty: "beginner", "intermediate", "advanced", or null
- sort_by: "stars", "recency", or "relevance" (default: relevance)
- days_ago: integer or null - Filter by recent activity within X days (e.g., "recent" = 7, "this week" = 7, "this month" = 30, "latest" = 3)
- unassigned_only: boolean - True if user wants only unassigned/unclaimed issues (default: false)
- topics: array of strings or null - GitHub repo topics/categories (e.g., "machine-learning", "web", "cli", "api", "blockchain")

User intent keywords to recognize:
- "recent", "latest", "new", "fresh" → days_ago: 7
- "popular", "trending", "famous" → min_stars: 1000+
- "beginner", "easy", "starter", "first contribution" → difficulty: beginner, labels: ["good first issue"]
- "unassigned", "unclaimed", "nobody working on" → unassigned_only: true
- "help wanted", "needs help" → labels: ["help wanted"]

Examples:
User: "beginner-friendly issues in popular Python repos"
Response: {"semantic_query": "beginner friendly contributions", "language": "Python", "min_stars": 1000, "labels": ["good first issue"], "difficulty": "beginner", "sort_by": "relevance", "days_ago": null, "unassigned_only": false, "topics": null}

User: "unassigned issues in machine learning projects"
Response: {"semantic_query": "machine learning AI", "language": null, "min_stars": null, "labels": null, "difficulty": null, "sort_by": "relevance", "days_ago": null, "unassigned_only": true, "topics": ["machine-learning", "deep-learning", "ai"]}

User: "recent repos needing contributors"
Response: {"semantic_query": "open source contributions", "language": null, "min_stars": null, "labels": ["help wanted"], "difficulty": null, "sort_by": "recency", "days_ago": 7, "unassigned_only": false, "topics": null}

User: "latest open beginner issues"
Response: {"semantic_query": "beginner contributions", "language": null, "min_stars": null, "labels": ["good first issue"], "difficulty": "beginner", "sort_by": "recency", "days_ago": 7, "unassigned_only": false, "topics": null}

User: "easy documentation issues nobody has claimed"
Response: {"semantic_query": "documentation docs", "language": null, "min_stars": null, "labels": ["documentation"], "difficulty": "beginner", "sort_by": "relevance", "days_ago": null, "unassigned_only": true, "topics": null}

User: "trending TypeScript projects"
Response: {"semantic_query": "TypeScript projects", "language": "TypeScript", "min_stars": 500, "labels": null, "difficulty": null, "sort_by": "stars", "days_ago": 30, "unassigned_only": false, "topics": null}

User: "CLI tools needing contributions"
Response: {"semantic_query": "CLI command line tool", "language": null, "min_stars": null, "labels": ["help wanted"], "difficulty": null, "sort_by": "relevance", "days_ago": null, "unassigned_only": false, "topics": ["cli", "command-line", "terminal"]}

Respond ONLY with valid JSON, no markdown or explanation."""


class QueryParser:
    """Parses natural language queries into structured filters using Google GenAI."""
    
    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-2.0-flash"
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    def parse(self, query: str) -> ParsedQuery:
        """Parse a natural language query into structured filters."""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=f"{SYSTEM_PROMPT}\n\nUser query: {query}",
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=500
                )
            )
            
            # Clean response text
            response_text = response.text.strip()
            if response_text.startswith("```"):
                # Remove markdown code blocks
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                    
            parsed = json.loads(response_text)
            
            return ParsedQuery(
                semantic_query=parsed.get("semantic_query", query),
                language=parsed.get("language"),
                min_stars=parsed.get("min_stars"),
                max_stars=parsed.get("max_stars"),
                labels=parsed.get("labels"),
                difficulty=parsed.get("difficulty"),
                sort_by=parsed.get("sort_by", "relevance"),
                days_ago=parsed.get("days_ago"),
                unassigned_only=parsed.get("unassigned_only", False),
                topics=parsed.get("topics")
            )
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return ParsedQuery(semantic_query=query)
        except Exception as e:
            logger.error(f"Query parsing error: {e}")
            return ParsedQuery(semantic_query=query)

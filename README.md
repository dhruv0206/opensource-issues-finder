# GitHub Contribution Finder 🔍

AI-powered search engine to discover open source contribution opportunities on GitHub.

![GitHub Contribution Finder](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue)
![Pinecone](https://img.shields.io/badge/Vector%20DB-Pinecone-green)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)

## 🔗 Live Demo

- **Frontend:** [opensource-search.vercel.app](https://opensource-search.vercel.app)
- **Backend API:** [github-finder-backend-18267677210.us-central1.run.app/docs](https://github-finder-backend-18267677210.us-central1.run.app/docs)
- **Discord:** [Join our community!](https://discord.gg/dZRFt9kN)
## ✨ Features

- **Natural Language Search** - Find issues using plain English: "beginner Python issues in ML projects"
- **AI-Powered Query Parsing** - Gemini extracts filters like language, difficulty, and recency
- **Semantic Search** - Finds conceptually similar issues, not just keyword matches
- **Combined Ranking** - Results scored by relevance (40%) + recency (35%) + popularity (25%)
- **Smart Filters** - Unassigned issues, topics, stars, labels, date ranges
- **Default Recent Issues** - Homepage shows fresh contribution opportunities

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   FastAPI       │────▶│   Pinecone      │
│   Frontend      │     │   Backend       │     │   Vector DB     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Gemini AI     │
                        │   (Embeddings & │
                        │    Query Parse) │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Pinecone](https://www.pinecone.io/) account (free tier works)
- [Google AI Studio](https://aistudio.google.com/) API key
- [GitHub Personal Access Token](https://github.com/settings/tokens)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/github-contributions-search.git
cd github-contributions-search
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

**.env file:**
```env
GITHUB_TOKEN=ghp_your_github_token
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=github-contributions
```

### 3. Ingest Data (GitHub App + GraphQL 🚀)

The new GraphQL-based ingestion is 10-20x faster than REST and uses a GitHub App for higher rate limits.

```bash
# Efficient ingestion (Auto-detects active issues)
python -m scripts.ingest_graphql --min-stars 200 --recent-hours 24
```

**Common Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--min-stars` | 200 | Minimum repo stars (0 for catch-all) |
| `--recent-hours` | - | Fetch issues updated in last N hours |
| `--recent-days` | - | Fetch issues updated in last N days |
| `--max-issues` | 100 | Max issues to ingest per language |
| `--any-label` | - | If set, ignores label filters (fetches everything) |

## ⏱️ Ingestion Schedule

The system runs a **Tiered Ingestion Strategy** via GitHub Actions to balance freshness vs. quality.

| Frequency | Star Filter | Time Window | Purpose |
| :--- | :--- | :--- | :--- |
| **⚡ Every 2 Hours** | **0+** (Catch All) | Last 2.5 Hours | Catch fast-moving & new issues (Velocity) |
| **🌙 Nightly (4 AM)** | **100+** | Last 7 Days | Deep refresh of established content (Quality) |
| **☀️ Daily (6 AM)** | **100+** | Last 24 Hours | Complete "Daily Digest" gap-fill |
| **🌟 Popular** | **5000+** | Recent | High-visibility issues from top repos |


## 🎯 Search Modes

The AI query parser understands these intents:

| User Intent | Keywords Recognized | What Happens |
|-------------|---------------------|--------------|
| **Recent Issues** | "recent", "latest", "new", "fresh", "today" | Filters to last 7 days |
| **Popular Repos** | "popular", "trending", "famous" | min_stars: 1000+ |
| **Beginner-Friendly** | "beginner", "easy", "starter", "first" | difficulty: beginner + good first issue label |
| **Unassigned** | "unassigned", "unclaimed", "nobody working" | Only issues with no assignees |
| **Help Wanted** | "help wanted", "needs help" | Filters by help wanted label |
| **By Language** | "Python", "JavaScript", "Rust", etc. | Language filter |
| **By Topic** | "machine learning", "CLI", "web" | Matches repo topics |
| **Sort by Stars** | "most stars", "most popular" | Sorts by repo stars |
| **Sort by Date** | "newest", "most recent" | Sorts by updated_at |

### 4. Start Backend

```bash
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 5. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# UI available at http://localhost:3000
```

## 🔍 Example Searches

| Query | What it finds |
|-------|---------------|
| `beginner Python issues` | Good first issues in Python repos |
| `unassigned help wanted` | Unclaimed issues needing contributors |
| `recent TypeScript CLI tools` | Fresh issues in CLI projects |
| `documentation fixes in popular repos` | Doc issues in 1000+ star repos |
| `machine learning projects` | Issues in ML-related repos |
| `easy issues nobody working on` | Beginner-friendly unassigned issues |

## 📁 Project Structure

```
github-contributions-search/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings & env vars
│   │   ├── models/
│   │   │   ├── issue.py         # Issue data models
│   │   │   └── query.py         # Search query models
│   │   ├── services/
│   │   │   ├── github_fetcher.py    # GitHub API client
│   │   │   ├── embedder.py          # Gemini embeddings
│   │   │   ├── query_parser.py      # NL → structured query
│   │   │   ├── pinecone_client.py   # Vector DB client
│   │   │   └── search_engine.py     # Search orchestrator
│   │   └── routes/
│   │       └── search.py        # API endpoints
│   └── scripts/
│       └── ingest_graphql.py    # Data ingestion CLI (GraphQL)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx         # Main page
        │   ├── layout.tsx       # Root layout
        │   └── globals.css      # Styles
        ├── components/
        │   ├── SearchBar.tsx
        │   ├── SearchResults.tsx
        │   ├── IssueCard.tsx
        │   ├── Pagination.tsx
        │   └── ParsedQueryDisplay.tsx
        ├── hooks/
        │   └── useSearch.ts     # Search state hook
        └── lib/
            └── api.ts           # Backend API client
```

## 🔧 API Reference

### Search Issues
```http
POST /api/search
Content-Type: application/json

{
  "query": "beginner Python issues",
  "limit": 20,
  "page": 1
}
```

### Get Recent Issues
```http
GET /api/search/recent?limit=20
```

### Health Check
```http
GET /api/search/health
```

## 📊 Combined Scoring

Results are ranked by a combined score:

| Factor | Weight | Description |
|--------|--------|-------------|
| Semantic Relevance | 40% | How well content matches query |
| Recency | 35% | Newer issues score higher |
| Popularity | 25% | More stars = higher score |

## 🏷️ Contribution Labels Recognized

The ingestion fetches issues with these labels:
- `good first issue`, `help wanted`
- `beginner`, `beginner friendly`, `easy`, `starter`
- `first-timers-only`, `newbie`, `up-for-grabs`
- `documentation`, `docs`, `hacktoberfest`
- And 20+ more variations

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python web framework)
- Pinecone (Vector database)
- Google Gemini AI (Embeddings + query parsing)
- PyGithub (GitHub API client)

**Frontend:**
- Next.js 15 (React framework)
- TypeScript
- Tailwind CSS
- shadcn/ui (Component library)
- Framer Motion (Animations)

## 📝 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions welcome! This project was built to help people find contribution opportunities - ironic, right? 😄

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

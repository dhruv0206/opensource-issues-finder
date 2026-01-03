# Backend - GitHub Contribution Finder

Python backend using FastAPI, PyGithub, Pinecone, and Gemini API.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and fill in your API keys.

4. Run the server:
```bash
uvicorn app.main:app --reload
```

## Ingestion

Run the ingestion script to populate Pinecone:
```bash
python -m scripts.ingest_data
```

# Contributing to OpenSource Issues Finder 🎉

Thank you for your interest in contributing! This project helps developers find their next open source contribution opportunity.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker (optional, for containerized setup)

### Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/dhruv0206/opensource-issues-finder.git
   cd opensource-issues-finder
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Create .env file with your API keys
   cp .env.example .env
   # Edit .env with your keys
   
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Or use Docker**
   ```bash
   docker-compose up --build
   ```

## 🐛 Found a Bug?

1. Check if it's already reported in [Issues](https://github.com/dhruv0206/opensource-issues-finder/issues)
2. If not, [create a new issue](https://github.com/dhruv0206/opensource-issues-finder/issues/new)
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)

## 💡 Want to Add a Feature?

1. Check [existing issues](https://github.com/dhruv0206/opensource-issues-finder/issues) for similar ideas
2. Create an issue describing your feature
3. Wait for approval before starting work
4. Reference the issue in your PR

## 📝 Making Changes

### Workflow

1. **Fork the repo** and clone your fork
2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test locally** - ensure both frontend and backend work
5. **Commit with clear messages**
   ```bash
   git commit -m "Add: feature description"
   ```
6. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format
- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for changes to existing features
- `Refactor:` for code improvements
- `Docs:` for documentation changes

## 📂 Project Structure

```
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── models/    # Pydantic models
│   │   ├── routes/    # API endpoints
│   │   └── services/  # Business logic
│   └── scripts/       # Data ingestion scripts
│
├── frontend/          # Next.js React frontend
│   └── src/
│       ├── app/       # Pages and layouts
│       ├── components/# React components
│       ├── hooks/     # Custom React hooks
│       └── lib/       # Utilities and API client
│
└── .github/workflows/ # GitHub Actions
```

## 🏷️ Good First Issues

Look for issues labeled:
- `good first issue` - Great for beginners
- `help wanted` - We need your help!
- `documentation` - Help improve docs

## 💬 Need Help?

- Open an issue with your question
- Tag it with `question` label

## 📜 Code of Conduct

Be kind, respectful, and inclusive. We're all here to learn and build together.

---

Thank you for contributing! Every PR, issue, and suggestion makes this project better. 🙏

FROM python:3.11-slim

WORKDIR /app

# Copy from project root context with -f backend/Dockerfile
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

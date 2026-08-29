# ==============================================================================
# Production Dockerfile for Syncnode Cryptocurrency Exchange API & Engine
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=5050 \
    HOST=0.0.0.0

# Install minimal OS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code and config
COPY syncnode/ ./syncnode/
COPY pyproject.toml .

# Expose backend service port
EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5050}/api/v1/health || exit 1

# Start production server using uvicorn with dynamic cloud port injection
CMD ["sh", "-c", "uvicorn syncnode.server:app --host 0.0.0.0 --port ${PORT:-5050}"]

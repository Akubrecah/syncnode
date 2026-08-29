# ==============================================================================
# Multi-Stage Production Dockerfile for Syncnode Cryptocurrency Exchange
# Stage 1: Build React Vite Client
# Stage 2: Fast & Lightweight Python 3.12 Slim Runtime
# ==============================================================================

FROM node:20-alpine AS frontend-builder
WORKDIR /app/apps/web

# Install frontend dependencies
COPY apps/web/package*.json ./
RUN npm ci --silent

# Build optimized static bundle
COPY apps/web/ ./
RUN npm run build

# ==============================================================================
# Runtime Stage: Python 3.12 Slim
# ==============================================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=4000 \
    HOST=0.0.0.0

# Install minimal OS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy backend source code
COPY syncnode/ ./syncnode/
COPY pyproject.toml .

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

# Expose backend service port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Start production server using uvicorn with dynamic cloud port injection
CMD ["sh", "-c", "uvicorn syncnode.server:app --host 0.0.0.0 --port ${PORT:-4000}"]

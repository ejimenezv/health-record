# ==============================================================
# Dockerfile — MedRecord AI Service
# Multi-stage build: builder -> runtime -> development
# ==============================================================

# ── Stage 1: Builder ──────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY src/ ./src/

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    NUMBA_CACHE_DIR=/tmp/numba_cache

RUN chown -R appuser:appgroup /home/appuser/.local /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ── Stage 3: Development ─────────────────────────────────────
FROM runtime AS development

USER root
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
USER appuser

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

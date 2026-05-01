"""
Entry point de la API FastAPI.
Configura middleware, routers y documentación OpenAPI.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.endpoints.costs import router as costs_router
from src.api.endpoints.health import router as health_router
from src.api.middleware.logging import LoggingMiddleware
from src.api.middleware.metrics import MetricsMiddleware
from src.api.routes import router
from src.api.websocket.streaming import router as websocket_router
from src.core.config import get_settings
from src.core.health import setup_health_checks
from src.core.logging import configure_logging, get_logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hooks para startup/shutdown."""
    configure_logging()
    setup_health_checks()
    logger = get_logger(__name__)
    logger.info(
        "Starting MedRecord AI Service",
        environment=settings.environment,
        version=settings.app_version,
    )
    # Why: Silero VAD downloads on first call. Warm it here so the first
    # WebSocket session doesn't stall (or time out) waiting for the model.
    try:
        from silero_vad import load_silero_vad

        load_silero_vad()
        logger.info("Silero VAD warmed at startup")
    except Exception as exc:
        logger.warning("Silero VAD warm-up failed", error=str(exc))

    # Resemblyzer's encoder loads <100ms but librosa/numba on first
    # call can take a few seconds (mel transforms get JIT-compiled).
    # Pre-warm so the first session's first slice isn't slow.
    if settings.diarizer_kind == "audio":
        try:
            # numba (used by librosa, used by resemblyzer) needs a writable
            # cache dir. The slim runtime image has a non-writable home, so
            # set it before importing librosa downstream.
            import os
            os.environ.setdefault("NUMBA_CACHE_DIR", "/tmp/numba_cache")
            os.makedirs(os.environ["NUMBA_CACHE_DIR"], exist_ok=True)

            from resemblyzer import VoiceEncoder
            import numpy as np

            enc = VoiceEncoder(verbose=False)
            enc.embed_utterance(np.zeros(16000 * 2, dtype=np.float32))
            logger.info("Resemblyzer speaker encoder warmed at startup")
        except Exception as exc:
            logger.warning("Resemblyzer warm-up failed", error=str(exc))
    yield
    logger.info("Shutting down MedRecord AI Service")


app = FastAPI(
    title=settings.project_name,
    description="Servicio de IA para transcripción y extracción médica en español",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(LoggingMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger = get_logger(__name__)
    logger.exception(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_type": type(exc).__name__},
    )


app.include_router(health_router)
app.include_router(costs_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")
app.include_router(websocket_router)


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": settings.project_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "docs": "/docs",
    }

"""
Configuración centralizada desde variables de entorno.
Sigue el patrón de 12-factor app para configuración externa.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración de la aplicación."""

    # ─── General ────────────────────────────────────────────────
    environment: Literal["development", "staging", "production", "testing"] = "development"
    project_name: str = "MedRecord AI Service"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    log_level: str = "INFO"
    app_version: str = "1.0.0"

    # ─── OpenAI / LLM ───────────────────────────────────────────
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 2048
    openai_temperature: float = 0.1
    openai_timeout_seconds: int = 30
    openai_max_retries: int = 3

    # ─── Whisper (Transcription) ────────────────────────────────
    whisper_model: str = "whisper-1"
    whisper_language: str = "es"
    whisper_response_format: str = "verbose_json"

    # ─── Diarization ────────────────────────────────────────────
    # "audio" uses Resemblyzer speaker embeddings + online clustering
    # (replaces the keyword-only fallback). "keyword" uses the legacy
    # text-only diarizer (set this if Resemblyzer install fails).
    diarizer_kind: Literal["audio", "keyword"] = "audio"
    diarizer_same_speaker_threshold: float = 0.70
    diarizer_max_speakers: int = 4

    # ─── Embeddings ─────────────────────────────────────────────
    embeddings_provider: str = "openai"
    embeddings_model: str = "text-embedding-3-small"
    embeddings_dimensions: int = 1536
    embeddings_batch_size: int = 100

    # ─── Vector Store (ChromaDB) ────────────────────────────────
    vector_db_provider: str = "chromadb"
    chromadb_host: str = "chromadb"
    chromadb_port: int = 8000
    chromadb_collection_name: str = "medrecord_spanish_medical"

    # ─── RAG Configuration ──────────────────────────────────────
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.75
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50
    rag_chunking_strategy: str = "recursive"

    # ─── Database ───────────────────────────────────────────────
    database_url: str | None = None

    # ─── Redis (Session Storage) ────────────────────────────────
    redis_url: str | None = "redis://redis:6379"

    # ─── WebSocket ──────────────────────────────────────────────
    websocket_base_url: str = "ws://localhost:8000"

    # ─── Security ───────────────────────────────────────────────
    jwt_secret_key: str = Field(..., description="JWT signing key")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    rate_limit_per_minute: int = 60

    # ─── Observability ──────────────────────────────────────────
    langfuse_enabled: bool = False
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str = "https://cloud.langfuse.com"

    # ─── Cost Tracking ──────────────────────────────────────────
    cost_tracking_enabled: bool = True
    monthly_budget_usd: float = 50.0

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.upper()

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Singleton para configuración."""
    return Settings()

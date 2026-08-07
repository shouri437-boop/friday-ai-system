"""
FRIDAY Backend — Pydantic Settings & Environment Loader.
Loads GROQ_API_KEY_FAST, GROQ_API_KEY_HEAVY, and GROQ_API_KEY_BALANCED via dotenv and os.getenv().
"""
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Multi-Groq API Keys (Strict Model Mapping) ───────────────────────────
    groq_api_key_fast: str = os.getenv("GROQ_API_KEY_FAST", "")
    groq_api_key_heavy: str = os.getenv("GROQ_API_KEY_HEAVY", "")
    groq_api_key_balanced: str = os.getenv("GROQ_API_KEY_BALANCED", "")

    # ── Server Config ─────────────────────────────────────────────────────────
    backend_host: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3003")


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()

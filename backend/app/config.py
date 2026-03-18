"""
config.py — Application settings loaded from .env
===================================================
All environment variables with defaults. Import the `settings` singleton
everywhere — never instantiate Settings() more than once.

Usage:
    from app.config import settings
    print(settings.MONGODB_URL)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── MongoDB ──────────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB:  str = "aquarium"

    # ── MQTT ─────────────────────────────────────────────────────────────────
    MQTT_BROKER:    str = "localhost"
    MQTT_PORT:      int = 1883
    MQTT_TOPIC:     str = "aquarium/telemetry"
    MQTT_CLIENT_ID: str = "aquaguard-backend"

    # ── System ───────────────────────────────────────────────────────────────
    # INSTALL_DATE is only used on first boot to seed the system_state document.
    # For demo: set to 2026-01-01 so tank is 70+ days old → ADAPTIVE mode active.
    INSTALL_DATE: str = "2026-01-01"

    # JSON list of allowed CORS origins, e.g. '["http://localhost:5173"]'
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Computed ─────────────────────────────────────────────────────────────
    # PROJECT_ROOT is resolved at startup: two levels up from this file
    # (backend/app/config.py → backend/ → project root)
    @property
    def PROJECT_ROOT(self) -> Path:
        return Path(__file__).resolve().parent.parent.parent

    # ── Validators ───────────────────────────────────────────────────────────
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Accept both a Python list and a JSON-encoded string from .env."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass
            # Fallback: single origin as plain string
            return [v.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Module-level singleton — import this, never re-instantiate
settings = Settings()

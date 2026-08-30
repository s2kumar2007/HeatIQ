"""Central config, loaded from environment / .env."""
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # Groq LLM (https://console.groq.com)
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"

    # FortyGuard Temperature API (https://fortyguard.com/dashboard)
    fortyguard_base_url: str = "https://api.fortyguard.com"
    fortyguard_api_key: str = ""
    fortyguard_heatmap_id: str = ""

    # Thresholds (documented in agent/thresholds.py; overridable via env)
    default_safe_max_c: float = 35.0
    default_caution_max_c: float = 40.0

    # Polling (for async FortyGuard endpoints, if applicable)
    poll_interval_seconds: float = 3.0
    poll_timeout_seconds: float = 120.0

    # Phase 3 (optional)
    alert_webhook_url: str = ""
    alert_tracked_locations_file: str = "app/tracked_locations.json"


settings = Settings()

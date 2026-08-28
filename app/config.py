"""Central config, loaded from environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Grok
    grok_api_key: str = ""
    grok_model: str = "grok-beta"

    # FortyGuard
    fortyguard_base_url: str = "https://api.fortyguard.com"
    fortyguard_api_key: str = ""

    # Thresholds (documented in agent/thresholds.py; overridable via env)
    default_safe_max_c: float = 35.0
    default_caution_max_c: float = 40.0

    # Polling (for async FortyGuard endpoints, if applicable)
    poll_interval_seconds: float = 2.0
    poll_timeout_seconds: float = 30.0

    # Phase 3 (optional)
    alert_webhook_url: str = ""
    alert_tracked_locations_file: str = "app/tracked_locations.json"


settings = Settings()

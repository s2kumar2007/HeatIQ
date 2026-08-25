"""
PHASE 3 STUB — Background alert automation. Not wired into app/main.py
yet; run separately or import + call `start_scheduler()` from main.py
once ready.

Intent: periodically call get_exceedance/get_current_heat for a small
list of tracked locations (app/tracked_locations.json). If a location
crosses the Unsafe threshold, generate an alert message using the same
reasoning approach as the core agent and fire it (console log / webhook
POST / email — keep it simple, this is about demonstrating autonomous
monitoring + decision, not real alert infra).
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

import httpx

from app.agent.thresholds import classify_point
from app.config import settings
from app.fortyguard_client import fortyguard_client

logger = logging.getLogger("heat_agent.alerts")

CHECK_INTERVAL_SECONDS = 15 * 60  # every 15 minutes; tune as needed


def _load_tracked_locations() -> list[dict]:
    path = Path(settings.alert_tracked_locations_file)
    if not path.exists():
        logger.warning("No tracked locations file at %s — skipping alert check", path)
        return []
    return json.loads(path.read_text())


async def _check_all_locations():
    locations = _load_tracked_locations()
    for loc in locations:
        try:
            snapshot = await fortyguard_client.get_current_heat(loc["lat"], loc["lon"])
            heat_index = snapshot.get("heat_index_c", snapshot.get("temperature_c"))
            band = classify_point(heat_index)
            if band == "Unsafe":
                await _fire_alert(loc, snapshot, band)
        except Exception:  # noqa: BLE001
            logger.exception("Failed checking location %s", loc)


async def _fire_alert(location: dict, snapshot: dict, band: str):
    message = (
        f"[HEAT ALERT] {location.get('label', location)} is currently "
        f"classified '{band}' — heat index {snapshot.get('heat_index_c')}C. "
        f"Snapshot: {snapshot}"
    )
    logger.warning(message)
    print(message)  # simple console "firing" for the demo

    if settings.alert_webhook_url:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                await client.post(settings.alert_webhook_url, json={"message": message, "location": location})
            except Exception:  # noqa: BLE001
                logger.exception("Failed to POST alert webhook")


async def run_forever():
    """Simple loop; swap for APScheduler's AsyncIOScheduler if preferred."""
    while True:
        await _check_all_locations()
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_forever())

"""
Background alert scheduler — monitors tracked_locations.json and exposes
in-memory state for GET /alerts/status.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from app.agent.thresholds import classify_point
from app.config import settings
from app.fortyguard_client import fortyguard_client

logger = logging.getLogger("heat_agent.alerts")

CHECK_INTERVAL_SECONDS = 15 * 60  # every 15 minutes

# ---------------------------------------------------------------------------
# In-memory state (read by /alerts/status)
# ---------------------------------------------------------------------------
_state: dict[str, Any] = {
    "last_check": None,          # ISO timestamp str
    "tracked_count": 0,
    "unsafe_locations": [],      # list of label strings
}


def get_status() -> dict[str, Any]:
    return dict(_state)


def _load_tracked() -> list[dict]:
    path = Path(settings.alert_tracked_locations_file)
    if not path.exists():
        return []
    return json.loads(path.read_text())


async def _check_all():
    locations = _load_tracked()
    _state["tracked_count"] = len(locations)
    unsafe = []
    for loc in locations:
        try:
            snap = await fortyguard_client.get_current_heat(loc["lat"], loc["lon"])
            hi = snap.get("heat_index_c", snap.get("temperature_c", 0))
            band = classify_point(hi)
            if band == "Unsafe":
                label = loc.get("label", f"{loc['lat']},{loc['lon']}")
                unsafe.append(label)
                await _fire_alert(loc, snap, band)
        except Exception as e:
            logger.error("Failed checking %s: %s", loc.get("label", str(loc)), str(e))
    _state["unsafe_locations"] = unsafe
    _state["last_check"] = datetime.now(timezone.utc).isoformat()


async def _fire_alert(location: dict, snapshot: dict, band: str):
    msg = (
        f"[HEAT ALERT] {location.get('label', location)} is '{band}' — "
        f"heat index {snapshot.get('heat_index_c')}°C"
    )
    logger.warning(msg)
    print(msg)
    if settings.alert_webhook_url:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                await client.post(settings.alert_webhook_url, json={"message": msg, "location": location})
            except Exception:
                logger.exception("Webhook failed")


async def run_forever():
    while True:
        await _check_all()
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_forever())

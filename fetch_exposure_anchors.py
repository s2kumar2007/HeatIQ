"""
fetch_exposure_anchors.py

Fetches current snapshot conditions for each location from the FortyGuard API.
One API call per location — no duplicate calls, no placeholder fallbacks.
Locations that fail are skipped with a warning; only real readings are saved.

Requires FORTYGUARD_API_KEY and FORTYGUARD_BASE_URL in .env.
"""
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.append(Path(__file__).parent.as_posix())

from app.fortyguard_client import fortyguard_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def fetch_anchors() -> None:
    locations_file = Path("data/locations.json")
    anchors_out = Path("data/exposure_anchors.json")

    with open(locations_file) as f:
        locations = json.load(f)

    anchors = []
    for loc in locations:
        try:
            snapshot = await fortyguard_client.get_current_heat(loc["lat"], loc["lon"])

            # Only accept rows with a real temperature value
            temp_c = snapshot.get("temperature_c") or snapshot.get("heat_index_c")
            if temp_c is None:
                logger.warning(f"Skipping {loc['name']}: API returned no temperature.")
                continue

            hi_c = snapshot.get("heat_index_c") or temp_c
            anchors.append({
                "location":       loc["name"],
                "location_type":  loc["type"],
                "lat":            loc["lat"],
                "lon":            loc["lon"],
                "current_temp_c": float(temp_c),
                "heat_index_c":   float(hi_c),
            })
            logger.info(f"OK  {loc['name']}: {hi_c:.1f}°C HI")

        except Exception as e:
            logger.warning(f"SKIP {loc['name']}: {type(e).__name__} — {e}")

    if not anchors:
        logger.error(
            "No anchors collected. Check FORTYGUARD_API_KEY / FORTYGUARD_BASE_URL in .env."
        )
        sys.exit(1)

    with open(anchors_out, "w") as f:
        json.dump(anchors, f, indent=2)
    logger.info(f"Saved {len(anchors)} real anchor(s) to {anchors_out}")


if __name__ == "__main__":
    asyncio.run(fetch_anchors())

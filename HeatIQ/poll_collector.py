"""
poll_collector.py

Polls the FortyGuard Temperature API for each location on a fixed interval
and appends real readings to data/historical_data.csv.

No placeholder or synthetic values — rows with failed API calls are skipped
entirely so the CSV contains only genuine data points.

Requires FORTYGUARD_API_KEY and FORTYGUARD_BASE_URL in .env.
"""
import asyncio
import csv
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(Path(__file__).parent.as_posix())

from app.fortyguard_client import fortyguard_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("PollCollector")

LOCATIONS_FILE      = Path("data/locations.json")
OUTPUT_CSV          = Path("data/historical_data.csv")
POLL_INTERVAL_SECS  = 30 * 60   # 30 minutes
INTER_CALL_DELAY    = 2          # seconds between successive API calls

FIELDNAMES = [
    "location", "location_type", "timestamp",
    "current_temp", "exceedance_duration", "exceedance_magnitude", "forecast_trend",
]


def _append_row(row: dict) -> None:
    new_file = not OUTPUT_CSV.exists()
    with open(OUTPUT_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if new_file:
            writer.writeheader()
        writer.writerow(row)


async def _fetch_location(loc: dict, now: datetime) -> dict | None:
    """
    Calls snapshot, exceedance, and forecast for one location.
    Returns a dict on success, None if any critical call fails.
    """
    lat, lon  = loc["lat"], loc["lon"]
    name      = loc["name"]
    start_str = now.isoformat() + "Z"
    end_str   = (now + timedelta(hours=24)).isoformat() + "Z"

    try:
        snapshot    = await fortyguard_client.get_current_heat(lat, lon)
        temp_c      = snapshot.get("temperature_c") or snapshot.get("heat_index_c")
        if temp_c is None:
            logger.warning(f"SKIP {name}: snapshot returned no temperature.")
            return None

        exceedance  = await fortyguard_client.get_exceedance(lat, lon, start_str, end_str)
        forecast    = await fortyguard_client.get_forecast(lat, lon, start_str, end_str)

        return {
            "location":             name,
            "location_type":        loc["type"],
            "timestamp":            start_str,
            "current_temp":         float(temp_c),
            "exceedance_duration":  exceedance.get("exceedance_duration_hours")
                                    or exceedance.get("total_hours_above", 0),
            "exceedance_magnitude": exceedance.get("max_exceedance_c")
                                    or exceedance.get("max_temp_c", temp_c),
            "forecast_trend":       forecast.get("trend", "unknown"),
        }

    except Exception as e:
        logger.warning(f"SKIP {name}: {type(e).__name__} — {e}")
        return None


async def main() -> None:
    if not LOCATIONS_FILE.exists():
        logger.error(f"Locations file not found: {LOCATIONS_FILE}")
        sys.exit(1)

    with open(LOCATIONS_FILE) as f:
        locations = json.load(f)

    logger.info(f"Polling {len(locations)} location(s) every {POLL_INTERVAL_SECS // 60} minutes.")

    while True:
        now     = datetime.utcnow()
        saved   = 0
        skipped = 0

        for loc in locations:
            row = await _fetch_location(loc, now)
            if row:
                _append_row(row)
                logger.info(f"  ✓  {loc['name']}: {row['current_temp']}°C")
                saved += 1
            else:
                skipped += 1
            await asyncio.sleep(INTER_CALL_DELAY)

        logger.info(f"Cycle done — {saved} saved, {skipped} skipped. "
                    f"Next poll in {POLL_INTERVAL_SECS // 60} min.")
        await asyncio.sleep(POLL_INTERVAL_SECS)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Collector stopped.")

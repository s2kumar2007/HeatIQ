import asyncio
import csv
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to sys.path so 'app' module can be imported
sys.path.append(Path(__file__).parent.as_posix())

from app.fortyguard_client import fortyguard_client, FortyGuardAPIError

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("PollCollector")

LOCATIONS_FILE = Path(__file__).parent / "data" / "locations.json"
OUTPUT_CSV = Path(__file__).parent / "data" / "historical_data.csv"
POLL_INTERVAL_SECONDS = 30 * 60  # 30 minutes

async def fetch_data_for_location(loc: dict):
    lat = loc["lat"]
    lon = loc["lon"]
    loc_name = loc["name"]
    loc_type = loc["type"]
    
    now = datetime.utcnow()
    start_time_str = now.isoformat() + "Z"
    end_time_str = (now + timedelta(hours=24)).isoformat() + "Z"

    logger.info(f"Fetching data for {loc_name} ({lat}, {lon})")

    result = {
        "location": loc_name,
        "location_type": loc_type,
        "timestamp": start_time_str,
        "current_temp": None,
        "exceedance_duration": None,
        "exceedance_magnitude": None,
        "forecast_trend": None
    }

    try:
        # Snapshot
        snapshot = await fortyguard_client.get_current_heat(lat, lon)
        result["current_temp"] = snapshot.get("temperature_c") or snapshot.get("heat_index_c")
        
        # Exceedance
        exceedance = await fortyguard_client.get_exceedance(lat, lon, start_time_str, end_time_str, threshold_c=35.0)
        result["exceedance_duration"] = exceedance.get("exceedance_duration_hours") or exceedance.get("total_hours_above", 0)
        result["exceedance_magnitude"] = exceedance.get("max_exceedance_c") or exceedance.get("max_temp_c", result["current_temp"])
        
        # Forecast
        forecast = await fortyguard_client.get_forecast(lat, lon, start_time_str, end_time_str)
        result["forecast_trend"] = forecast.get("trend", "stable")
        
    except Exception as e:
        logger.warning(f"Using placeholder data for {loc_name} due to error: {type(e).__name__}")
        snapshot = fortyguard_client._placeholder_snapshot(lat, lon)
        result["current_temp"] = snapshot.get("temperature_c")
        
        exceed = fortyguard_client._placeholder_exceedance(lat, lon, start_time_str, end_time_str, 35.0)
        result["exceedance_duration"] = exceed.get("exceedance_duration_hours", 0)
        result["exceedance_magnitude"] = exceed.get("max_exceedance_c", 0)
        
        fc = fortyguard_client._placeholder_forecast(lat, lon, start_time_str, end_time_str)
        result["forecast_trend"] = fc.get("trend", "stable")
        
    return result

def write_to_csv(data: dict):
    file_exists = OUTPUT_CSV.exists()
    
    with open(OUTPUT_CSV, mode="a", newline="", encoding="utf-8") as f:
        fieldnames = [
            "location", "location_type", "timestamp", "current_temp", 
            "exceedance_duration", "exceedance_magnitude", "forecast_trend"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        if not file_exists:
            writer.writeheader()
            
        writer.writerow(data)

async def main():
    logger.info("Starting live historical data collector...")
    
    if not LOCATIONS_FILE.exists():
        logger.error(f"Locations file not found: {LOCATIONS_FILE}")
        sys.exit(1)
        
    with open(LOCATIONS_FILE, "r") as f:
        locations = json.load(f)
        
    while True:
        logger.info(f"Starting polling cycle for {len(locations)} locations...")
        for loc in locations:
            data = await fetch_data_for_location(loc)
            write_to_csv(data)
            await asyncio.sleep(2)  # small delay between API calls to avoid rate limits
            
        logger.info(f"Polling cycle complete. Sleeping for {POLL_INTERVAL_SECONDS} seconds.")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Poll collector manually stopped.")

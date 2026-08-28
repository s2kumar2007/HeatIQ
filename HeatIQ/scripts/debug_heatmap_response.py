"""
Quick diagnostic: print the raw FortyGuard heatmap response
to see the actual JSON structure returned by the API.
"""
from __future__ import annotations
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.fortyguard_client import fortyguard_client

async def main():
    # Phoenix, AZ — US location (FortyGuard heatmap coverage is US-only)
    lat, lon = 33.4484, -112.0740
    polygon = fortyguard_client._make_polygon(lat, lon)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    date_time_req = {
        "start_date": today,
        "start_time": "10:00",
        "filter_type": 1
    }
    print(f"Submitting heatmap job for {today}...")
    raw = await fortyguard_client._submit_and_poll_heatmap(polygon, date_time_req, 60, "tcm")
    print("=== Raw response (all keys) ===")
    print(json.dumps(raw, indent=2, default=str))
    
    # Check what temp we'd extract
    stats = raw.get("stats_data", {})
    temp_stats = stats.get("Temperature_stats", {})
    print(f"\nn_cells: {stats.get('n_cells')}")
    print(f"Temperature_stats: {temp_stats}")
    print(f"Mean temp: {temp_stats.get('Mean')}")

asyncio.run(main())

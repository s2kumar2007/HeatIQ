"""
fetch_exposure_anchors.py

Fetches current snapshot conditions for locations to serve as anchor points 
for generating the exposure duration training dataset.
"""
import asyncio
import json
import logging
from pathlib import Path

# Add project root to path
import sys
sys.path.append(Path(__file__).parent.as_posix())

from app.fortyguard_client import fortyguard_client, FortyGuardAPIError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

async def fetch_anchors():
    locations_file = Path("data/locations.json")
    anchors_out = Path("data/exposure_anchors.json")
    
    with open(locations_file, "r") as f:
        locations = json.load(f)
        
    anchors = []
    for loc in locations:
        try:
            snapshot = await fortyguard_client.get_current_heat(loc["lat"], loc["lon"])
            temp_c = snapshot.get("temperature_c") or 30.0
            hi_c = snapshot.get("heat_index_c") or temp_c
            
            anchors.append({
                "location": loc["name"],
                "location_type": loc["type"],
                "lat": loc["lat"],
                "lon": loc["lon"],
                "current_temp_c": float(temp_c),
                "heat_index_c": float(hi_c),
            })
            logging.info(f"Fetched {loc['name']}: {hi_c}°C HI")
        except (FortyGuardAPIError, Exception) as e:
            import tenacity
            if isinstance(e, tenacity.RetryError) or isinstance(e, Exception):
                logger = logging.getLogger()
                logger.warning(f"Using placeholder data for {loc['name']} due to API Error.")
                snapshot = fortyguard_client._placeholder_snapshot(loc["lat"], loc["lon"])
                hi_c = snapshot.get("heat_index_c", 35.0)
                anchors.append({
                    "location": loc["name"],
                    "location_type": loc["type"],
                    "lat": loc["lat"],
                    "lon": loc["lon"],
                    "current_temp_c": snapshot.get("temperature_c", 34.0),
                    "heat_index_c": hi_c,
                })
            else:
                logging.error(f"Failed {loc['name']}: {e}")
                
    with open(anchors_out, "w") as f:
        json.dump(anchors, f, indent=2)
    logging.info(f"Saved {len(anchors)} anchors to {anchors_out}")

if __name__ == "__main__":
    asyncio.run(fetch_anchors())

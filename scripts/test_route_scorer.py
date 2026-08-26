import asyncio
import json
import sys
from pathlib import Path

# Add the parent directory to sys.path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.route_scorer import score_routes

async def main():
    # T Nagar to Adyar coordinates
    start_lat = 13.0418
    start_lon = 80.2341
    end_lat = 13.0067
    end_lon = 80.2570
    
    print(f"Testing route comparison from ({start_lat}, {start_lon}) to ({end_lat}, {end_lon})...")
    
    result = await score_routes(start_lat, start_lon, end_lat, end_lon)
    
    print("\nResult:")
    print(json.dumps(result, indent=2))
    
if __name__ == "__main__":
    asyncio.run(main())

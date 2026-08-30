import asyncio
import httpx
import json
import time
from datetime import datetime, timezone

async def test_heatmap():
    """Test the heatmap endpoint which might be faster."""
    api_key = "831365c53bdb7fa18d5489808340932b"
    now = datetime.now(timezone.utc)
    hour = now.hour
    if now.minute >= 30:
        hour += 1
    date_str = now.strftime("%Y-%m-%d")
    time_str = f"{hour:02d}:00"
    
    # Build polygon around Anna Nagar
    lat, lon = 13.085, 80.2101
    offset = 0.05
    polygon = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [lon - offset, lat - offset],
                    [lon + offset, lat - offset],
                    [lon + offset, lat + offset],
                    [lon - offset, lat + offset],
                    [lon - offset, lat - offset]
                ]]
            },
            "properties": {}
        }]
    }
    
    payload = {
        "polygon_aoi": polygon,
        "date_time": {
            "start_date": date_str,
            "start_time": time_str,
            "filter_type": 1
        },
        "granularity": 60,
        "analytic_type": "tcm"
    }
    
    print(f"Query: {date_str} {time_str} UTC (heatmap)")
    start = time.time()
    async with httpx.AsyncClient(
        base_url="https://api.fortyguard.com",
        timeout=10.0,
        headers={"api-key": api_key, "Content-Type": "application/json"}
    ) as client:
        r = await client.post("/v1/heatmap", json=payload)
        data = r.json()
        activity_id = data.get("data", {}).get("activity_id")
        print(f"Submitted: {activity_id} ({time.time()-start:.1f}s)")
        
        for i in range(30):
            await asyncio.sleep(2)
            elapsed = time.time() - start
            r = await client.get(f"/v1/status/{activity_id}")
            raw = r.json()
            status_data = raw.get("data", raw)
            status = status_data.get("status", "unknown")
            
            if status.lower() in ("completed", "succeeded"):
                result = status_data.get("result", status_data)
                print(f"Completed in {time.time()-start:.1f}s")
                print(json.dumps(result, indent=2, default=str)[:2000])
                return
            if status.lower() in ("failed", "error"):
                print(f"  FAILED: {raw}")
                return
            
            if i % 5 == 0:
                print(f"  Poll {i+1}: {status} ({elapsed:.1f}s)")
        
        print(f"  TIMED OUT after {time.time()-start:.1f}s")

asyncio.run(test_heatmap())

import asyncio
import httpx
import json
import time
from datetime import datetime, timezone

async def test_current_time():
    """Test with current time rounded to nearest hour."""
    api_key = "831365c53bdb7fa18d5489808340932b"
    now = datetime.now(timezone.utc)
    hour = now.hour
    if now.minute >= 30:
        hour += 1
    date_str = now.strftime("%Y-%m-%d")
    time_str = f"{hour:02d}:00"
    
    print(f"Query time: {date_str} {time_str} UTC")
    
    payload = {
        "latitude": 13.085,
        "longitude": 80.2101,
        "date_time": {
            "start_date": date_str,
            "start_time": time_str,
            "filter_type": 1
        },
        "temperature": 38.4,
        "analysis": ["heat_index_celsius", "relative_humidity_percent", "wet_bulb_temperature_celsius"]
    }
    
    start = time.time()
    async with httpx.AsyncClient(
        base_url="https://api.fortyguard.com",
        timeout=10.0,
        headers={"api-key": api_key, "Content-Type": "application/json"}
    ) as client:
        r = await client.post("/v1/env_params", json=payload)
        data = r.json()
        activity_id = data["data"]["activity_id"]
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
                locs = result.get("locations", [])
                if locs:
                    params = locs[0].get("parameters", {})
                    print(f"  heat_index: {params.get('heat_index_celsius')}")
                    print(f"  humidity: {params.get('relative_humidity_percent')}")
                print(f"  Total: {time.time()-start:.1f}s")
                return
            if status.lower() in ("failed", "error"):
                print(f"  FAILED")
                return
            
            if i % 5 == 0:
                print(f"  Poll {i+1}: {status} ({elapsed:.1f}s)")
        
        print(f"  TIMED OUT after {time.time()-start:.1f}s")

asyncio.run(test_current_time())

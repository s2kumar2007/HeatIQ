import asyncio
import httpx
import json
import time

async def test_submit_and_poll():
    api_key = "831365c53bdb7fa18d5489808340932b"
    
    payload = {
        "latitude": 13.085,
        "longitude": 80.2101,
        "date_time": {
            "start_date": "2026-08-30",
            "start_time": "14:00",
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
        # Submit
        print("Submitting env_params...")
        r = await client.post("/v1/env_params", json=payload)
        data = r.json()
        activity_id = data["data"]["activity_id"]
        print(f"  activity_id: {activity_id} ({time.time()-start:.1f}s)")
        
        # Poll
        for i in range(20):
            await asyncio.sleep(2)
            elapsed = time.time() - start
            r = await client.get(f"/v1/status/{activity_id}")
            raw = r.json()
            status_data = raw.get("data", raw)
            status = status_data.get("status", "unknown")
            print(f"  Poll {i+1}: status={status} elapsed={elapsed:.1f}s")
            
            if status.lower() in ("completed", "succeeded"):
                result = status_data.get("result", status_data)
                locs = result.get("locations", [])
                if locs:
                    params = locs[0].get("parameters", {})
                    print(f"  heat_index_celsius: {params.get('heat_index_celsius')}")
                    print(f"  humidity: {params.get('relative_humidity_percent')}")
                    print(f"  wet_bulb: {params.get('wet_bulb_temperature_celsius')}")
                print(f"  Total time: {time.time()-start:.1f}s")
                return
            if status.lower() in ("failed", "error"):
                print(f"  FAILED: {raw}")
                return
        
        print(f"  TIMED OUT after {time.time()-start:.1f}s")

asyncio.run(test_submit_and_poll())

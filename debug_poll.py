import asyncio
import httpx
import json

async def test_poll():
    api_key = "831365c53bdb7fa18d5489808340932b"
    activity_id = "c52612ea-033d-4f76-860c-d277be1ffd48"

    async with httpx.AsyncClient(
        base_url="https://api.fortyguard.com",
        timeout=10.0,
        headers={"api-key": api_key, "Content-Type": "application/json"},
    ) as client:
        resp = await client.get(f"/v1/status/{activity_id}")
        raw = resp.json()
        print("Raw response keys:", list(raw.keys()))
        data = raw.get("data", raw)
        print("data keys:", list(data.keys()) if isinstance(data, dict) else type(data))
        status = data.get("status", "NONE")
        print(f"Status (raw): {repr(status)}")
        print(f"Status (lower): {repr(status.lower())}")
        print(f"Match completed: {status.lower() in ('completed', 'succeeded')}")

        result = data.get("result", data)
        if isinstance(result, dict):
            print(f"Result keys: {list(result.keys())}")
            locs = result.get("locations", [])
            if locs:
                params = locs[0].get("parameters", {})
                hi = params.get("heat_index_celsius")
                hum = params.get("relative_humidity_percent")
                wb = params.get("wet_bulb_temperature_celsius")
                print(f"Heat index: {hi}")
                print(f"Humidity: {hum}")
                print(f"Wet bulb: {wb}")

asyncio.run(test_poll())

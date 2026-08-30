import asyncio
import httpx
import json
import time

async def test_heatmap_daytime():
    """Test heatmap at 14:00 IST (08:30 UTC) — peak daytime."""
    api_key = "831365c53bdb7fa18d5489808340932b"
    
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
    
    # Test multiple time slots
    for time_str in ["08:00", "10:00", "12:00", "14:00"]:
        payload = {
            "polygon_aoi": polygon,
            "date_time": {
                "start_date": "2026-08-30",
                "start_time": time_str,
                "filter_type": 1
            },
            "granularity": 60,
            "analytic_type": "tcm"
        }
        
        start = time.time()
        async with httpx.AsyncClient(
            base_url="https://api.fortyguard.com",
            timeout=10.0,
            headers={"api-key": api_key, "Content-Type": "application/json"}
        ) as client:
            r = await client.post("/v1/heatmap", json=payload)
            data = r.json()
            activity_id = data.get("data", {}).get("activity_id")
            
            for i in range(20):
                await asyncio.sleep(2)
                elapsed = time.time() - start
                r = await client.get(f"/v1/status/{activity_id}")
                raw = r.json()
                status_data = raw.get("data", raw)
                status = status_data.get("status", "unknown")
                
                if status.lower() in ("completed", "succeeded"):
                    result = status_data.get("result", status_data)
                    n_cells = result.get("stats_data", {}).get("n_cells", 0)
                    stats = result.get("stats_data", {}).get("temperature_stats", {})
                    print(f"  {time_str} IST: Completed in {elapsed:.1f}s, n_cells={n_cells}, temp_stats={stats}")
                    break
                if status.lower() in ("failed", "error"):
                    print(f"  {time_str} IST: FAILED")
                    break
                if i == 19:
                    print(f"  {time_str} IST: TIMEOUT after {elapsed:.1f}s")

asyncio.run(test_heatmap_daytime())

import asyncio
import sys
import json
sys.path.insert(0, r"C:\Users\nicol\OneDrive\Desktop\tt1\HeatIQ")

from app.fortyguard_client import fortyguard_client

async def test():
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    
    print(f"Date: {date_str}, Time: {time_str}")
    env_data = await fortyguard_client.get_environmental_params(13.085, 80.2101, date_str, time_str)
    print(f"env_data keys: {list(env_data.keys()) if isinstance(env_data, dict) else type(env_data)}")
    print(json.dumps(env_data, indent=2, default=str)[:3000])
    await fortyguard_client.aclose()

asyncio.run(test())

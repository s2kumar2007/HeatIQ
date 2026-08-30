import asyncio
import sys
sys.path.insert(0, r"C:\Users\nicol\OneDrive\Desktop\tt1\HeatIQ")

from app.fortyguard_client import fortyguard_client

async def test():
    print("Testing get_current_heat for Anna Nagar...")
    try:
        result = await fortyguard_client.get_current_heat(13.085, 80.2101)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
    finally:
        await fortyguard_client.aclose()

asyncio.run(test())

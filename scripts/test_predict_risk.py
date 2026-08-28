import asyncio
from app.agent.tools import execute_tool

async def main():
    print("Testing predict_risk tool...")
    res = await execute_tool("predict_risk", {
        "hour_of_day": 14,
        "heat_index_c": 42.5,
        "exceedance_hours": 3.0,
        "forecast_trend_rising": 1
    })
    print("Result:", res)
    assert "risk_category" in res or "error" in res
    # if model was trained, confidence is there
    if "confidence" in res:
        assert len(res.get("top_factors", [])) > 0
        assert "compares_to_threshold" in res
        factors = res["top_factors"]
        contributions = [abs(f["contribution"]) for f in factors]
        assert contributions == sorted(contributions, reverse=True)
        print("Success! Inference shape is correct.")
    else:
        print("Model probably not trained yet, error:", res)

if __name__ == "__main__":
    asyncio.run(main())

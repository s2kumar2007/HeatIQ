import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.agent.loop import run_agent
from app.alerts_scheduler import get_status, run_forever
from app.config import settings
from app.fortyguard_client import fortyguard_client, FortyGuardAPIError
from app.models import AskRequest, AskResponse

logging.basicConfig(level=logging.INFO)

# LA sensor locations
LA_SENSORS = [
    {"id": "LA-001", "label": "Downtown LA", "lat": 34.0522, "lon": -118.2437, "canopy": 12, "albedo": 0.15},
    {"id": "LA-002", "label": "Griffith Park", "lat": 34.1365, "lon": -118.2940, "canopy": 72, "albedo": 0.24},
    {"id": "LA-003", "label": "Hollywood Blvd", "lat": 34.1016, "lon": -118.3267, "canopy": 8, "albedo": 0.11},
    {"id": "LA-004", "label": "Venice Beach", "lat": 33.9850, "lon": -118.4695, "canopy": 34, "albedo": 0.22},
    {"id": "LA-005", "label": "Koreatown", "lat": 34.0578, "lon": -118.3015, "canopy": 18, "albedo": 0.16},
    {"id": "LA-006", "label": "Echo Park", "lat": 34.0781, "lon": -118.2606, "canopy": 42, "albedo": 0.20},
]

HEATMAP_ID = settings.fortyguard_heatmap_id

# Heatmap usage counter
_heatmap_count = 0

app = FastAPI(
    title="HeatIQ Decision Agent",
    description="Autonomous agent that answers heat-safety questions using real FortyGuard data.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Keep monitoring autonomous; the scheduler holds the latest structured
    # state exposed by /alerts/status while /api/monitor remains on-demand.
    app.state.alert_task = asyncio.create_task(run_forever())


@app.on_event("shutdown")
async def shutdown():
    task = getattr(app.state, "alert_task", None)
    if task:
        task.cancel()
    await fortyguard_client.aclose()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "groq_configured": bool(settings.groq_api_key),
        "fortyguard_configured": bool(settings.fortyguard_api_key),
    }


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest, request: Request) -> AskResponse:
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")

    groq_key_override: Optional[str] = request.headers.get("X-Groq-Api-Key") or None
    fg_key_override: Optional[str] = request.headers.get("X-FortyGuard-Api-Key") or None

    try:
        return await run_agent(
            req.question,
            groq_api_key=groq_key_override,
            fortyguard_api_key=fg_key_override,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent failed: {e}") from e


@app.get("/sensors/live")
async def sensors_live():
    """Fetch live heat data from FortyGuard for all LA sensor locations."""
    results = []
    for sensor in LA_SENSORS:
        try:
            heat = await fortyguard_client.get_current_heat(sensor["lat"], sensor["lon"])
            temp_c = heat.get("heat_index_c", heat.get("temperature_c", 0))
            humidity = heat.get("humidity", 50)
            wet_bulb = heat.get("wet_bulb_c", 20.0)
            source = "fortyguard"
        except FortyGuardAPIError as e:
            logging.warning("FortyGuard failed for %s: %s", sensor["label"], e)
            temp_c = None
            humidity = None
            wet_bulb = None
            source = "unavailable"
        except Exception as e:
            logging.warning("Unexpected error for %s: %s", sensor["label"], e)
            temp_c = None
            humidity = None
            wet_bulb = None
            source = "error"

        # Classify status
        if temp_c is None:
            status = "unavailable"
        elif temp_c >= 32:
            status = "critical"
        elif temp_c >= 28:
            status = "elevated"
        else:
            status = "nominal"

        wbgt = wet_bulb if isinstance(wet_bulb, (int, float)) else 20.0
        results.append({
            "id": sensor["id"],
            "name": sensor["label"],
            "lat": sensor["lat"],
            "lng": sensor["lon"],
            "tempC": round(temp_c, 1) if isinstance(temp_c, (int, float)) else None,
            "humidity": round(humidity, 1) if isinstance(humidity, (int, float)) else None,
            "wbgt": round(wbgt, 1) if isinstance(wbgt, (int, float)) else 20.0,
            "solarW": 650,
            "status": status,
            "trend": "up" if isinstance(temp_c, (int, float)) and temp_c > 30 else "stable",
            "canopyCover": sensor["canopy"],
            "albedo": sensor["albedo"],
            "source": source,
        })

    return {"sensors": results, "fetched_at": datetime.now(timezone.utc).isoformat()}


@app.post("/heatmap/generate")
async def heatmap_generate(request: Request):
    """Generate a FortyGuard heatmap for a given area. Tracks usage count."""
    global _heatmap_count
    body = await request.json()
    lat = body.get("lat", 34.0522)
    lon = body.get("lon", -118.2437)
    offset = body.get("offset", 0.05)

    polygon = fortyguard_client._make_polygon(lat, lon, offset)
    now = datetime.now(timezone.utc)
    hour = now.hour
    if now.minute >= 30:
        hour += 1
    date_time = {
        "start_date": now.strftime("%Y-%m-%d"),
        "start_time": f"{hour:02d}:00",
        "filter_type": 1,
    }

    try:
        result = await fortyguard_client._submit_and_poll_heatmap(
            polygon, date_time, 60, "tcm"
        )
        _heatmap_count += 1
        return {"status": "ok", "result": result, "heatmap_count": _heatmap_count}
    except Exception as e:
        _heatmap_count += 1
        return {"status": "fallback", "error": str(e), "heatmap_count": _heatmap_count}


@app.get("/heatmap/count")
async def heatmap_count():
    return {"heatmap_count": _heatmap_count}


@app.get("/heatmap/active")
async def heatmap_active():
    """Return the active heatmap ID and metadata."""
    return {
        "active": True,
        "heatmap_id": HEATMAP_ID,
        "city": "Los Angeles",
        "state": "California",
        "sensor_count": len(LA_SENSORS),
        "sensors": [{"id": s["id"], "label": s["label"], "lat": s["lat"], "lon": s["lon"]} for s in LA_SENSORS],
    }


@app.get("/alerts/status")
async def alerts_status():
    s = get_status()
    last = s.get("last_check")
    if last:
        delta = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds()
        minutes_ago = round(delta / 60, 1)
    else:
        minutes_ago = None
    return {
        "last_check": last,
        "minutes_ago": minutes_ago,
        "tracked_count": s.get("tracked_count", 0),
        "unsafe_locations": s.get("unsafe_locations", []),
    }


@app.get("/heatmap/{heatmap_id}")
async def get_heatmap_by_id(heatmap_id: str):
    """Retrieve heatmap status/result by FortyGuard heatmap ID."""
    try:
        result = await fortyguard_client.get_heatmap_by_id(heatmap_id)
        return {"status": "ok", "heatmap_id": heatmap_id, "result": result}
    except FortyGuardAPIError as e:
        raise HTTPException(status_code=502, detail=f"FortyGuard API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.get("/api/monitor")
async def monitor():
    """Check monitored coordinates against configured safety thresholds."""
    THRESHOLD_C = settings.default_safe_max_c
    alerts = []
    all_sensors = []

    for sensor in LA_SENSORS:
        try:
            heat = await fortyguard_client.get_current_heat(sensor["lat"], sensor["lon"])
            temp_c = heat.get("heat_index_c", heat.get("temperature_c", 0))
            humidity = heat.get("humidity", 50)
            wet_bulb = heat.get("wet_bulb_c", 20.0)
            source = "fortyguard"
        except FortyGuardAPIError as e:
            logging.warning("FortyGuard failed for %s: %s", sensor["label"], e)
            temp_c = None
            humidity = None
            wet_bulb = None
            source = "unavailable"
        except Exception as e:
            logging.warning("Unexpected error for %s: %s", sensor["label"], e)
            temp_c = None
            humidity = None
            wet_bulb = None
            source = "error"

        sensor_reading = {
            "id": sensor["id"],
            "name": sensor["label"],
            "lat": sensor["lat"],
            "lon": sensor["lon"],
            "temp_c": round(temp_c, 1) if isinstance(temp_c, (int, float)) else None,
            "humidity": round(humidity, 1) if isinstance(humidity, (int, float)) else None,
            "wet_bulb_c": round(wet_bulb, 1) if isinstance(wet_bulb, (int, float)) else None,
            "source": source,
        }
        all_sensors.append(sensor_reading)

        if isinstance(temp_c, (int, float)) and temp_c >= THRESHOLD_C:
            alerts.append({
                "sensor_id": sensor["id"],
                "location": sensor["label"],
                "lat": sensor["lat"],
                "lon": sensor["lon"],
                "temp_c": round(temp_c, 1),
                "humidity": round(humidity, 1) if isinstance(humidity, (int, float)) else None,
                "wet_bulb_c": round(wet_bulb, 1) if isinstance(wet_bulb, (int, float)) else None,
                "threshold_c": THRESHOLD_C,
                "severity": "critical" if temp_c > settings.default_caution_max_c else "high",
                "source": source,
                "message": f"{sensor['label']} at {round(temp_c, 1)}°C exceeds {THRESHOLD_C}°C threshold",
            })

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "threshold_c": THRESHOLD_C,
        "total_sensors": len(LA_SENSORS),
        "alerts_count": len(alerts),
        "alerts": alerts,
        "sensors": all_sensors,
    }


@app.post("/routes/safest")
async def safest_route(request: Request):
    """Return only the lowest heat-cost route, as a GeoJSON FeatureCollection."""
    from app.route_scorer import score_routes
    body = await request.json()
    required = ("start_lat", "start_lon", "end_lat", "end_lon")
    if any(body.get(key) is None for key in required):
        raise HTTPException(status_code=400, detail="start_lat, start_lon, end_lat and end_lon are required")
    result = await score_routes(**{key: float(body[key]) for key in required})
    route_id = (result.get("recommended_route") or {}).get("route_id")
    result["features"] = [
        feature for feature in result.get("features", [])
        if feature.get("properties", {}).get("route_id") == route_id
    ]
    return result

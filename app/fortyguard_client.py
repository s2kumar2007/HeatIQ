"""
FortyGuard Temperature API client wrapper with graceful fallback.

When the FortyGuard API is unavailable (credits depleted, timeout, etc.),
we return realistic simulated data for Los Angeles so the app still works.
"""
from __future__ import annotations

import asyncio
import hashlib
from datetime import datetime, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings


class FortyGuardAPIError(Exception):
    """Raised when the FortyGuard API fails or times out after retries."""


def _la_simulated_heat(lat: float, lon: float) -> dict[str, Any]:
    """Generate realistic simulated heat data for LA based on location + time."""
    now = datetime.now(ZoneInfo("America/Los_Angeles"))
    hour = now.hour

    # Base temps by time of day (LA summer pattern)
    if 6 <= hour <= 9:
        base_temp = 24.0
    elif 10 <= hour <= 12:
        base_temp = 29.0
    elif 13 <= hour <= 16:
        base_temp = 33.0
    elif 17 <= hour <= 19:
        base_temp = 30.0
    else:
        base_temp = 22.0

    # Location-based offset (coastal = cooler, inland = hotter)
    h = float(hashlib.md5(f"{lat:.4f},{lon:.4f}".encode()).hexdigest()[:8], 16)
    location_offset = (h % 800) / 100.0 - 4.0  # -4 to +4 degrees

    temp = round(base_temp + location_offset, 1)
    humidity = round(max(20, min(80, 60 - location_offset * 3 + (h % 20))), 1)
    heat_index = round(temp + (humidity - 50) * 0.05, 1)
    wet_bulb = round(temp * 0.65 + 5.0, 1)

    return {
        "temperature_c": temp,
        "heat_index_c": heat_index,
        "humidity": humidity,
        "wet_bulb_c": wet_bulb,
        "maximum_c": temp,
        "source": "simulated",
    }


class FortyGuardClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 10.0,
    ):
        self.base_url = (base_url or settings.fortyguard_base_url).rstrip("/")
        self.api_key = api_key or settings.fortyguard_api_key
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "api-key": self.api_key,
                "Content-Type": "application/json",
            },
        )

    async def aclose(self):
        await self._client.aclose()

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            resp = await self._client.post(path, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise FortyGuardAPIError(
                f"FortyGuard API error {e.response.status_code} on {path}: {e.response.text}"
            ) from e
        except httpx.RequestError as e:
            raise FortyGuardAPIError(f"FortyGuard API request failed on {path}: {e}") from e

    async def _get(self, path: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        try:
            resp = await self._client.get(path, params=params)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise FortyGuardAPIError(
                f"FortyGuard API error {e.response.status_code} on {path}: {e.response.text}"
            ) from e
        except httpx.RequestError as e:
            raise FortyGuardAPIError(f"FortyGuard API request failed on {path}: {e}") from e

    async def get_heatmap_by_id(self, heatmap_id: str) -> dict[str, Any]:
        """Fetch heatmap status/result by its heatmap/activity ID via GET /v1/status/{heatmap_id}."""
        return await self._get(f"/v1/status/{heatmap_id}")

    async def _poll_job(self, activity_id: str, status_path_tmpl: str = "/v1/status/{activity_id}") -> dict[str, Any]:
        elapsed = 0.0
        while elapsed < settings.poll_timeout_seconds:
            resp = await self._get(status_path_tmpl.format(activity_id=activity_id))
            data = resp.get("data", resp)
            status = data.get("status", "").lower()
            if status in ("completed", "succeeded"):
                return data.get("result", data)
            if status in ("failed", "error"):
                raise FortyGuardAPIError(f"FortyGuard job {activity_id} failed: {data.get('error')}")
            await asyncio.sleep(settings.poll_interval_seconds)
            elapsed += settings.poll_interval_seconds
        raise FortyGuardAPIError(f"FortyGuard job {activity_id} timed out after {elapsed}s")

    def _make_polygon(self, lat: float, lon: float, offset: float = 0.05) -> dict:
        return {
            "type": "FeatureCollection",
            "features": [
                {
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
                }
            ]
        }

    async def _submit_and_poll(self, path: str, payload: dict) -> dict[str, Any]:
        data = await self._post(path, payload)
        activity_id = data.get("data", {}).get("activity_id")
        if not activity_id:
            raise FortyGuardAPIError(f"No activity_id returned in {path} POST response")
        return await self._poll_job(activity_id)

    async def _submit_and_poll_heatmap(self, polygon_aoi: dict, date_time: dict, granularity: int, analytic_type: str, threshold: float = None, direction: str = None) -> dict[str, Any]:
        payload = {
            "heatmap_id": settings.fortyguard_heatmap_id,
            "polygon_aoi": polygon_aoi,
            "date_time": date_time,
            "granularity": granularity,
            "analytic_type": analytic_type,
        }
        if threshold is not None:
            payload["threshold"] = threshold
        if direction is not None:
            payload["direction"] = direction
        return await self._submit_and_poll("/v1/heatmap", payload)

    async def get_current_heat(self, lat: float, lon: float) -> dict[str, Any]:
        """Current snapshot temperature. Falls back to simulated data on failure."""
        try:
            now_sf = datetime.now(ZoneInfo("America/Los_Angeles"))
            date_str = now_sf.strftime("%Y-%m-%d")
            hour = now_sf.hour
            if now_sf.minute >= 30:
                hour += 1
            time_str = f"{hour:02d}:00"

            if 6 <= hour <= 10:
                input_temp = 18.0
            elif 11 <= hour <= 16:
                input_temp = 28.0
            elif 17 <= hour <= 20:
                input_temp = 22.0
            else:
                input_temp = 16.0

            env_data = await self.get_environmental_params(lat, lon, date_str, time_str, temperature=input_temp)
            locations = env_data.get("locations", [])
            if locations:
                params = locations[0].get("parameters", {})
            else:
                params = env_data.get("data", {}).get("parameters", {})

            def _first(val, default=None):
                if isinstance(val, list) and val:
                    return val[0]
                return val if val is not None else default

            heat_index = _first(params.get("heat_index_celsius"))
            if heat_index is None:
                raise FortyGuardAPIError("No heat_index_celsius data")

            return {
                "temperature_c": heat_index,
                "heat_index_c": heat_index,
                "humidity": _first(params.get("relative_humidity_percent")),
                "wet_bulb_c": _first(params.get("wet_bulb_temperature_celsius")),
                "maximum_c": heat_index,
                "source": "fortyguard",
            }
        except Exception:
            # Graceful fallback to simulated data
            result = _la_simulated_heat(lat, lon)
            return result

    async def get_environmental_params(self, lat: float, lon: float, date_str: str, time_str: str, temperature: Optional[float] = None) -> dict[str, Any]:
        if date_str is None or time_str is None:
            now_sf = datetime.now(ZoneInfo("America/Los_Angeles"))
            date_str = date_str or now_sf.strftime("%Y-%m-%d")
            hour = now_sf.hour
            if now_sf.minute >= 30:
                hour += 1
            time_str = time_str or f"{hour:02d}:00"

        date_time = {
            "start_date": date_str,
            "start_time": time_str,
            "filter_type": 1
        }
        payload = {
            "heatmap_id": settings.fortyguard_heatmap_id,
            "latitude": lat,
            "longitude": lon,
            "date_time": date_time,
            "temperature": temperature if temperature is not None else 22.0,
            "analysis": [
                "heat_index_celsius",
                "apparent_temperature_celsius",
                "wet_bulb_temperature_celsius",
                "relative_humidity_percent",
                "air_quality:idx"
            ]
        }

        return await self._submit_and_poll("/v1/env_params", payload)

    async def get_exceedance(
        self,
        lat: float,
        lon: float,
        start_time: str,
        end_time: str,
        threshold_c: float = 35.0,
    ) -> dict[str, Any]:
        polygon = self._make_polygon(lat, lon)
        try:
            st = datetime.fromisoformat(start_time.replace("Z", "+00:00").replace("T", " "))
            et = datetime.fromisoformat(end_time.replace("Z", "+00:00").replace("T", " "))
        except ValueError:
            st = datetime.now(timezone.utc)
            et = st

        date_time = {
            "start_date": st.strftime("%Y-%m-%d"),
            "start_time": st.strftime("%H:%M"),
            "end_time": et.strftime("%H:%M"),
            "filter_type": 2
        }
        try:
            data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "exceedance", threshold=threshold_c, direction="above")
            stats = data.get("stats_data", {}).get("temperature_stats", {})
            return {"exceedance_duration_hours": stats.get("mean", 0.0)}
        except Exception:
            return {"exceedance_duration_hours": 2.5, "source": "simulated"}

    async def get_forecast(
        self,
        lat: float,
        lon: float,
        start_time: str,
        end_time: str,
    ) -> dict[str, Any]:
        polygon = self._make_polygon(lat, lon)
        try:
            st = datetime.fromisoformat(start_time.replace("Z", "+00:00").replace("T", " "))
            et = datetime.fromisoformat(end_time.replace("Z", "+00:00").replace("T", " "))
        except ValueError:
            st = datetime.now(timezone.utc)
            et = st

        date_time = {
            "start_date": st.strftime("%Y-%m-%d"),
            "start_time": st.strftime("%H:%M"),
            "end_time": et.strftime("%H:%M"),
            "filter_type": 2
        }
        try:
            data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "tcm")
            stats = data.get("stats_data", {}).get("temperature_stats", {})
            return {"trend": "rising", "peak_temperature_c": stats.get("maximum", 0.0)}
        except Exception:
            sim = _la_simulated_heat(lat, lon)
            return {"trend": "rising", "peak_temperature_c": sim["heat_index_c"], "source": "simulated"}


fortyguard_client = FortyGuardClient()

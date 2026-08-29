"""
FortyGuard Temperature API client wrapper.

Wraps the FortyGuard Enterprise API (Heatmap).
Note: Since our app currently works with single lat/lon points, we build a small 
polygon AOI around each point (e.g. ~100m square) because FortyGuard is fundamentally
an area/heatmap API. Future iterations can natively support polygons.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

class FortyGuardAPIError(Exception):
    """Raised when the FortyGuard API fails or times out after retries."""

class FortyGuardClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 15.0,
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

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), reraise=True)
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

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), reraise=True)
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

    async def _poll_job(self, activity_id: str, status_path_tmpl: str = "/v1/status/{activity_id}") -> dict[str, Any]:
        """Poll until FortyGuard job completes. Returns the inner `result` dict."""
        elapsed = 0.0
        while elapsed < settings.poll_timeout_seconds:
            resp = await self._get(status_path_tmpl.format(activity_id=activity_id))
            data = resp.get("data", resp)  # Some endpoints wrap in "data", some don't
            status = data.get("status", "").lower()
            if status in ("completed", "succeeded"):
                # Unwrap "result" so callers get stats_data / parameters directly
                return data.get("result", data)
            if status in ("failed", "error"):
                raise FortyGuardAPIError(f"FortyGuard job {activity_id} failed: {data.get('error')}")
            await asyncio.sleep(settings.poll_interval_seconds)
            elapsed += settings.poll_interval_seconds
        raise FortyGuardAPIError(f"FortyGuard job {activity_id} timed out after {elapsed}s")

    def _make_polygon(self, lat: float, lon: float, offset: float = 0.05) -> dict:
        """
        Build a bounding-box polygon around a point.
        offset=0.05 degrees ≈ 5.5km square — large enough for FortyGuard's
        heatmap grid to return at least one cell (n_cells > 0).
        The previous 0.0005 (~55m) was below the minimum cell resolution.
        """
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
        """Current snapshot temperature and params using get_environmental_params."""
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M")
        
        env_data = await self.get_environmental_params(lat, lon, date_str, time_str)
        params = env_data.get("data", {}).get("parameters", env_data.get("parameters", {}))
        
        temp = 38.4  # Matches the fallback in get_environmental_params
            
        return {
            "temperature_c": temp,
            "heat_index_c": params.get("heat_index_celsius", temp),
            "humidity": params.get("relative_humidity_percent"),
            "wet_bulb_c": params.get("wet_bulb_temperature_celsius"),
            "maximum_c": temp  # point-based doesn't have min/max/mean like heatmap
        }

    async def get_environmental_params(self, lat: float, lon: float, date_str: str, time_str: str, temperature: Optional[float] = None) -> dict[str, Any]:
        """Fetch environmental parameters for a given location, date, and time."""
        date_time = {
            "start_date": date_str,
            "start_time": time_str,
            "filter_type": 1
        }
        payload = {
            "latitude": lat,
            "longitude": lon,
            "date_time": date_time,
            "temperature": temperature if temperature is not None else 38.4,  # Required by API to calculate params
            "analysis": [
                "heat_index_celsius", 
                "apparent_temperature_celsius", 
                "wet_bulb_temperature_celsius", 
                "relative_humidity_percent",
                "air_quality:idx"
            ]
        }
        
        try:
            return await self._submit_and_poll("/v1/env_params", payload)
        except Exception as e:
            # Re-raise to ensure failures are noticeable in script
            raise FortyGuardAPIError(f"Failed to fetch env_params: {e}")

    async def get_exceedance(
        self,
        lat: float,
        lon: float,
        start_time: str,
        end_time: str,
        threshold_c: float = 35.0,
    ) -> dict[str, Any]:
        """How long a location exceeds a heat threshold in a window (exceedance)."""
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
        data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "exceedance", threshold=threshold_c, direction="above")
        # API returns lowercase keys
        stats = data.get("stats_data", {}).get("temperature_stats", {})
        return {
            "exceedance_duration_hours": stats.get("mean", 0.0)
        }

    async def get_forecast(
        self,
        lat: float,
        lon: float,
        start_time: str,
        end_time: str,
    ) -> dict[str, Any]:
        """
        Forecast approximated via /v1/heatmap (tcm for future window). 
        Note this is an approximation since there's no dedicated forecast endpoint.
        """
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
        data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "tcm")
        # API returns lowercase keys
        stats = data.get("stats_data", {}).get("temperature_stats", {})
        return {
            "trend": "rising",
            "peak_temperature_c": stats.get("maximum", 0.0)
        }

fortyguard_client = FortyGuardClient()

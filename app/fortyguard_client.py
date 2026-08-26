"""
FortyGuard Temperature API client wrapper.

Wraps the FortyGuard Enterprise API (Heatmap).
Note: Since our app currently works with single lat/lon points, we build a small 
polygon AOI around each point (e.g. ~100m square) because FortyGuard is fundamentally
an area/heatmap API. Future iterations can natively support polygons.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
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
        """Generic submit-and-poll helper for FortyGuard endpoints."""
        elapsed = 0.0
        while elapsed < settings.poll_timeout_seconds:
            resp = await self._get(status_path_tmpl.format(activity_id=activity_id))
            data = resp.get("data", {})
            status = data.get("status", "").lower()
            if status in ("completed", "succeeded"):
                return data
            if status in ("failed", "error"):
                raise FortyGuardAPIError(f"FortyGuard job {activity_id} failed: {data.get('error')}")
            await asyncio.sleep(settings.poll_interval_seconds)
            elapsed += settings.poll_interval_seconds
        raise FortyGuardAPIError(f"FortyGuard job {activity_id} timed out after {elapsed}s")

    def _make_polygon(self, lat: float, lon: float, offset: float = 0.0005) -> dict:
        """Approximates a point as a ~100m polygon for Heatmap API"""
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
            
        data = await self._post("/v1/heatmap", payload)
        activity_id = data.get("data", {}).get("activity_id")
        if not activity_id:
            raise FortyGuardAPIError("No activity_id returned in heatmap POST response")
        return await self._poll_job(activity_id)

    async def get_current_heat(self, lat: float, lon: float) -> dict[str, Any]:
        """Current snapshot temperature using filter_type=1 (tcm)."""
        polygon = self._make_polygon(lat, lon)
        now = datetime.utcnow()
        date_time = {
            "start_date": now.strftime("%Y-%m-%d"),
            "start_time": now.strftime("%H:%M"),
            "filter_type": 1
        }
        data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "tcm")
        stats = data.get("stats_data", {}).get("Temperature_stats", {})
        mean_temp = stats.get("Mean", 0.0)
        return {
            "temperature_c": mean_temp,
            "heat_index_c": mean_temp,
            "maximum_c": stats.get("Maximum", mean_temp)
        }

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
            # We want just the HH:MM properly stripped for the API
            st = datetime.fromisoformat(start_time.replace("Z", "+00:00").replace("T", " "))
            et = datetime.fromisoformat(end_time.replace("Z", "+00:00").replace("T", " "))
        except ValueError:
            st = datetime.utcnow()
            et = st
            
        date_time = {
            "start_date": st.strftime("%Y-%m-%d"),
            "start_time": st.strftime("%H:%M"),
            "end_time": et.strftime("%H:%M"),
            "filter_type": 2
        }
        data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "exceedance", threshold=threshold_c, direction="above")
        stats = data.get("stats_data", {}).get("Temperature_stats", {})
        return {
            "exceedance_duration_hours": stats.get("Mean", 0.0)
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
            st = datetime.utcnow()
            et = st
            
        date_time = {
            "start_date": st.strftime("%Y-%m-%d"),
            "start_time": st.strftime("%H:%M"),
            "end_time": et.strftime("%H:%M"),
            "filter_type": 2
        }
        data = await self._submit_and_poll_heatmap(polygon, date_time, 60, "tcm")
        stats = data.get("stats_data", {}).get("Temperature_stats", {})
        return {
            "trend": "rising",
            "peak_temperature_c": stats.get("Maximum", 0.0)
        }

fortyguard_client = FortyGuardClient()

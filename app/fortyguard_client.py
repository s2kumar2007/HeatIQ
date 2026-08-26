"""
FortyGuard Temperature API client wrapper.

IMPORTANT: Endpoint paths, field names, and the submit/poll pattern below
are PLACEHOLDERS based on typical hyperlocal-sensor API design. Confirm
the following against the real FortyGuard docs / API key dashboard before
relying on this in a demo:

  - Exact base URL and auth scheme (assumed: `Authorization: Bearer <key>`)
  - Exact endpoint paths (assumed: POST /v1/snapshot, /v1/exceedance,
    /v1/forecast)
  - Whether snapshot is synchronous and exceedance/forecast are
    async (submit -> poll job id -> result), or all are synchronous
  - Exact request/response field names (assumed: lat, lon, start_time,
    end_time, threshold_c)
  - Rate limits, to tune RETRY/backoff behavior

Everything FortyGuard-specific lives in this file so that once the real
docs are confirmed, only this module (and maybe config.py) needs to
change -- the agent loop and FastAPI layer are unaffected.
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
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

    async def aclose(self):
        await self._client.aclose()

    # ------------------------------------------------------------------
    # Low-level helpers
    # ------------------------------------------------------------------

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), reraise=True)
    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            resp = await self._client.post(path, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            # Let 4xx surface without endless retries where possible;
            # tenacity will still retry per its policy, so raise a
            # FortyGuardAPIError on the final failure for the caller.
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

    async def _poll_job(self, job_id: str, status_path_tmpl: str = "/v1/jobs/{job_id}") -> dict[str, Any]:
        """Generic submit-and-poll helper for async FortyGuard endpoints.

        TODO: confirm whether FortyGuard actually uses a job-polling
        pattern, and if so, the real status endpoint shape / field names
        for `status` and `result` below.
        """
        elapsed = 0.0
        while elapsed < settings.poll_timeout_seconds:
            result = await self._get(status_path_tmpl.format(job_id=job_id))
            status = result.get("status", "unknown")
            if status == "completed":
                return result.get("result", {})
            if status == "failed":
                raise FortyGuardAPIError(f"FortyGuard job {job_id} failed: {result.get('error')}")
            await asyncio.sleep(settings.poll_interval_seconds)
            elapsed += settings.poll_interval_seconds
        raise FortyGuardAPIError(f"FortyGuard job {job_id} timed out after {elapsed}s")

    # ------------------------------------------------------------------
    # Public API — mirrors the three agent tools
    # ------------------------------------------------------------------

    async def get_current_heat(self, lat: float, lon: float) -> dict[str, Any]:
        """Current snapshot temperature / heat index at a point.

        Assumed synchronous endpoint: POST /v1/snapshot
        """
        payload = {"lat": lat, "lon": lon}
        try:
            data = await self._post("/v1/snapshot", payload)
        except FortyGuardAPIError:
            # Placeholder fallback so the agent loop / demo can run before
            # real credentials are wired up. Remove once confirmed live.
            return self._placeholder_snapshot(lat, lon)
        return data

    async def get_exceedance(
        self,
        lat: float,
        lon: float,
        start_time: str,
        end_time: str,
        threshold_c: float = 35.0,
    ) -> dict[str, Any]:
        """How long / how much a location exceeds a heat threshold in a window.

        Assumed async endpoint: POST /v1/exceedance (submit) -> poll job.
        Falls back to synchronous parse if the response has no job_id.
        """
        payload = {
            "lat": lat,
            "lon": lon,
            "start_time": start_time,
            "end_time": end_time,
            "threshold_c": threshold_c,
        }
        try:
            data = await self._post("/v1/exceedance", payload)
            if "job_id" in data:
                return await self._poll_job(data["job_id"])
            return data
        except FortyGuardAPIError:
            return self._placeholder_exceedance(lat, lon, start_time, end_time, threshold_c)

    async def get_forecast(
        self,
        lat: float,
        lon: float,
        start_time: str,
        end_time: str,
    ) -> dict[str, Any]:
        """Forecasted heat trend for a location over a window.

        Assumed async endpoint: POST /v1/forecast (submit) -> poll job.
        """
        payload = {"lat": lat, "lon": lon, "start_time": start_time, "end_time": end_time}
        try:
            data = await self._post("/v1/forecast", payload)
            if "job_id" in data:
                return await self._poll_job(data["job_id"])
            return data
        except FortyGuardAPIError:
            return self._placeholder_forecast(lat, lon, start_time, end_time)

    # ------------------------------------------------------------------
    # Placeholder fallbacks (used only until real API is confirmed/live)
    # ------------------------------------------------------------------

    @staticmethod
    def _placeholder_snapshot(lat: float, lon: float) -> dict[str, Any]:
        return {
            "lat": lat,
            "lon": lon,
            "temperature_c": 34.5,
            "heat_index_c": 38.0,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "source": "PLACEHOLDER — FortyGuard API not yet confirmed/live",
        }

    @staticmethod
    def _placeholder_exceedance(
        lat: float, lon: float, start_time: str, end_time: str, threshold_c: float
    ) -> dict[str, Any]:
        return {
            "lat": lat,
            "lon": lon,
            "start_time": start_time,
            "end_time": end_time,
            "threshold_c": threshold_c,
            "exceeded": True,
            "exceedance_duration_hours": 1.5,
            "max_exceedance_c": 3.2,
            "source": "PLACEHOLDER — FortyGuard API not yet confirmed/live",
        }

    @staticmethod
    def _placeholder_forecast(lat: float, lon: float, start_time: str, end_time: str) -> dict[str, Any]:
        return {
            "lat": lat,
            "lon": lon,
            "start_time": start_time,
            "end_time": end_time,
            "trend": "rising",
            "peak_temperature_c": 41.0,
            "peak_time": end_time,
            "source": "PLACEHOLDER — FortyGuard API not yet confirmed/live",
        }


# Module-level singleton for convenience in the FastAPI app
fortyguard_client = FortyGuardClient()

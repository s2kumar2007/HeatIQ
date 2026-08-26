"""
Tool schemas (Anthropic tool-use format) and the dispatcher that executes
them against fortyguard_client. The LLM decides which of these to call,
in what order, and with what arguments — nothing here hardcodes a fixed
call sequence.
"""
from __future__ import annotations

from typing import Any

from app.fortyguard_client import FortyGuardAPIError, fortyguard_client
from predict_safe_duration import predict_safe_duration

# ----------------------------------------------------------------------
# Tool schemas — passed to the Claude API `tools` parameter
# ----------------------------------------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_current_heat",
        "description": (
            "Get the current snapshot heat conditions (temperature and "
            "heat index) at a specific lat/lon point. Use this for "
            "'right now' style questions or as a first check before "
            "deciding whether deeper analysis (exceedance/forecast) is "
            "needed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Latitude"},
                "lon": {"type": "number", "description": "Longitude"},
                "location_label": {
                    "type": "string",
                    "description": "Human-readable name of the location, e.g. 'Anna Nagar'",
                },
            },
            "required": ["lat", "lon"],
        },
    },
    {
        "name": "get_exceedance",
        "description": (
            "Get how long and by how much a location's heat has "
            "exceeded (or is expected to exceed) a temperature threshold "
            "within a time window. Use this for duration-of-exposure "
            "questions, e.g. planning an outdoor event or activity over "
            "a span of hours."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "lat": {"type": "number"},
                "lon": {"type": "number"},
                "location_label": {"type": "string"},
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start of the window, e.g. 2026-08-26T13:00:00",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end of the window, e.g. 2026-08-26T17:00:00",
                },
                "threshold_c": {
                    "type": "number",
                    "description": "Heat index threshold in Celsius to check exceedance against. Defaults to 35.",
                },
            },
            "required": ["lat", "lon", "start_time", "end_time"],
        },
    },
    {
        "name": "get_forecast",
        "description": (
            "Get the forecasted heat trend for a location over a future "
            "time window (rising/falling/peak). Use this for "
            "'tomorrow'/'this weekend' style questions about future "
            "conditions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "lat": {"type": "number"},
                "lon": {"type": "number"},
                "location_label": {"type": "string"},
                "start_time": {"type": "string", "description": "ISO 8601 start of window"},
                "end_time": {"type": "string", "description": "ISO 8601 end of window"},
            },
            "required": ["lat", "lon", "start_time", "end_time"],
        },
    },
    {
        "name": "compare_route",
        "description": (
            "STRETCH / PHASE 2 — NOT YET IMPLEMENTED. Compare 2-3 candidate "
            "routes between two points by aggregate heat exposure. Only "
            "call this if explicitly asked; it currently returns an "
            "'unimplemented' error the agent should explain to the user "
            "rather than treat as a data source."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "start_lat": {"type": "number"},
                "start_lon": {"type": "number"},
                "end_lat": {"type": "number"},
                "end_lon": {"type": "number"},
            },
            "required": ["start_lat", "start_lon", "end_lat", "end_lon"],
        },
    },
    {
        "name": "predict_safe_duration",
        "description": (
            "Predict how many minutes of continuous outdoor exposure are safe "
            "at a location given current temperature and humidity conditions. "
            "Returns safe_minutes and a confidence range. Use this when someone "
            "asks how long they can safely stay outside, or how long outdoor "
            "activities/operations can safely continue."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "current_temp": {
                    "type": "number",
                    "description": "Current air temperature in Celsius.",
                },
                "humidity": {
                    "type": "number",
                    "description": "Relative humidity as a percentage (0-100). Defaults to 50 if unknown.",
                },
                "exceedance_duration": {
                    "type": "number",
                    "description": "Hours the location has already been above the heat threshold (0 if unknown).",
                },
                "hour_of_day": {
                    "type": "integer",
                    "description": "Current hour of the day in 24h format (0-23).",
                },
                "location_type": {
                    "type": "string",
                    "enum": ["open_street", "park", "bus_stop", "residential"],
                    "description": "Type of outdoor location.",
                },
            },
            "required": ["current_temp"],
        },
    },
]


# ----------------------------------------------------------------------
# Geocoding helper (very small, static — swap for a real geocoder later)
# ----------------------------------------------------------------------

# TODO: replace with a real geocoding call (e.g. Mapbox/Nominatim) once
# available. Kept tiny and explicit so the agent's location resolution
# is inspectable during the hackathon demo.
_KNOWN_LOCATIONS: dict[str, tuple[float, float]] = {
    "anna nagar": (13.0850, 80.2101),
    "chennai": (13.0827, 80.2707),
    "t nagar": (13.0418, 80.2341),
    "adyar": (13.0067, 80.2570),
    "velachery": (12.9791, 80.2212),
}


def resolve_location(label: str) -> tuple[float, float] | None:
    return _KNOWN_LOCATIONS.get(label.strip().lower())


# ----------------------------------------------------------------------
# Dispatcher
# ----------------------------------------------------------------------

async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a single tool call and return a JSON-serializable result.

    Raises are caught by the caller (agent loop) so a tool failure can be
    reported back to the LLM as a tool_result error rather than crashing
    the whole request.
    """
    if tool_name == "get_current_heat":
        return await fortyguard_client.get_current_heat(
            lat=tool_input["lat"], lon=tool_input["lon"]
        )

    if tool_name == "get_exceedance":
        return await fortyguard_client.get_exceedance(
            lat=tool_input["lat"],
            lon=tool_input["lon"],
            start_time=tool_input["start_time"],
            end_time=tool_input["end_time"],
            threshold_c=tool_input.get("threshold_c", 35.0),
        )

    if tool_name == "get_forecast":
        return await fortyguard_client.get_forecast(
            lat=tool_input["lat"],
            lon=tool_input["lon"],
            start_time=tool_input["start_time"],
            end_time=tool_input["end_time"],
        )

    if tool_name == "compare_route":
        # Phase 2 stub — see README "What's implemented vs. stretch"
        raise NotImplementedError(
            "compare_route (Phase 2) is not implemented yet. It will sample "
            "points along 2-3 OSRM-generated candidate routes and score them "
            "by aggregate heat exposure via get_current_heat/get_exceedance."
        )

    if tool_name == "predict_safe_duration":
        return predict_safe_duration(
            current_temp=tool_input["current_temp"],
            humidity=tool_input.get("humidity", 50.0),
            exceedance_duration=tool_input.get("exceedance_duration", 0.0),
            hour_of_day=tool_input.get("hour_of_day", 12),
            location_type=tool_input.get("location_type", "open_street"),
        )

    raise ValueError(f"Unknown tool: {tool_name}")

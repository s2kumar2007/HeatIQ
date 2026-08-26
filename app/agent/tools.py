"""
Tool schemas (Anthropic tool-use format) and the dispatcher that executes
them against fortyguard_client. The LLM decides which of these to call,
in what order, and with what arguments — nothing here hardcodes a fixed
call sequence.
"""
from __future__ import annotations

from typing import Any

from app.fortyguard_client import FortyGuardAPIError, fortyguard_client

# ----------------------------------------------------------------------
# Tool schemas — passed to the Claude API `tools` parameter
# ----------------------------------------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_current_heat",
            "description": (
                "Get the current snapshot heat conditions (temperature and "
                "heat index) at a specific lat/lon point. Use this for "
                "'right now' style questions or as a first check before "
                "deciding whether deeper analysis (exceedance/forecast) is "
                "needed."
            ),
            "parameters": {
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
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_exceedance",
            "description": (
                "Get how long and by how much a location's heat has "
                "exceeded (or is expected to exceed) a temperature threshold "
                "within a time window. Use this for duration-of-exposure "
                "questions, e.g. planning an outdoor event or activity over "
                "a span of hours."
            ),
            "parameters": {
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
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": (
                "Get the forecasted heat trend for a location over a future "
                "time window (rising/falling/peak). Use this for "
                "'tomorrow'/'this weekend' style questions about future "
                "conditions."
            ),
            "parameters": {
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
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_route",
            "description": (
                "Compare 2-3 candidate routes between two points by aggregate "
                "heat exposure. Call this when asked to compare routes or find "
                "the coolest/safest path between two locations."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_lat": {"type": "number"},
                    "start_lon": {"type": "number"},
                    "end_lat": {"type": "number"},
                    "end_lon": {"type": "number"},
                },
                "required": ["start_lat", "start_lon", "end_lat", "end_lon"],
            },
        }
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
        from app.route_scorer import score_routes
        return await score_routes(
            start_lat=tool_input["start_lat"],
            start_lon=tool_input["start_lon"],
            end_lat=tool_input["end_lat"],
            end_lon=tool_input["end_lon"],
        )

    raise ValueError(f"Unknown tool: {tool_name}")

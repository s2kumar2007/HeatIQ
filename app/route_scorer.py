from typing import Any
import asyncio

from app.routing_client import get_candidate_routes
from app.fortyguard_client import fortyguard_client

DEFAULT_ALPHA = 0.05


async def score_routes(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    alpha: float = DEFAULT_ALPHA,
) -> dict[str, Any]:
    """Score candidate routes using Cost = Distance * (1 + alpha * Temperature).

    Returns a GeoJSON FeatureCollection where each Feature is a LineString
    route with cost metadata in its properties.
    """
    routes = await get_candidate_routes(start_lat, start_lon, end_lat, end_lon)

    scored_routes: list[dict[str, Any]] = []

    for route in routes:
        total_temp = 0.0
        points_count = len(route["sampled_points"])

        for pt in route["sampled_points"]:
            heat_data = await fortyguard_client.get_current_heat(pt["lat"], pt["lon"])
            total_temp += heat_data.get("temperature_c", 0)

        avg_temp = total_temp / points_count if points_count > 0 else 0
        distance_m = route["distance_m"]

        cost = distance_m * (1 + alpha * avg_temp)

        scored_routes.append({
            "route_id": route["route_id"],
            "distance_m": distance_m,
            "duration_s": route["duration_s"],
            "avg_temperature_c": avg_temp,
            "cost": cost,
            "geometry": route.get("geometry", {}),
        })

    if not scored_routes:
        return {
            "type": "FeatureCollection",
            "features": [],
            "error": "No routes found",
            "recommended_route": None,
        }

    scored_routes.sort(key=lambda r: r["cost"])

    features = []
    for r in scored_routes:
        feature: dict[str, Any] = {
            "type": "Feature",
            "properties": {
                "route_id": r["route_id"],
                "distance_m": r["distance_m"],
                "duration_s": r["duration_s"],
                "avg_temperature_c": round(r["avg_temperature_c"], 2),
                "cost": round(r["cost"], 2),
                "recommended": r is scored_routes[0],
            },
            "geometry": r["geometry"],
        }
        features.append(feature)

    recommended = scored_routes[0]

    return {
        "type": "FeatureCollection",
        "features": features,
        "recommended_route": {
            "route_id": recommended["route_id"],
            "cost": round(recommended["cost"], 2),
            "avg_temperature_c": round(recommended["avg_temperature_c"], 2),
            "distance_m": recommended["distance_m"],
            "duration_s": recommended["duration_s"],
        },
        "reasoning": (
            f"Route {recommended['route_id']} is recommended with the lowest cost "
            f"({recommended['cost']:.1f}) = distance ({recommended['distance_m']:.0f}m) "
            f"* (1 + {alpha} * {recommended['avg_temperature_c']:.1f}°C) "
            f"among {len(scored_routes)} candidate routes."
        ),
    }

from typing import Any
import asyncio

from app.routing_client import get_candidate_routes
from app.fortyguard_client import fortyguard_client

async def score_routes(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> dict[str, Any]:
    """Score candidate routes based on heat exposure."""
    routes = await get_candidate_routes(start_lat, start_lon, end_lat, end_lon)
    
    scored_routes = []
    
    for route in routes:
        total_temp = 0.0
        total_heat_index = 0.0
        points_count = len(route["sampled_points"])
        
        # In a real app we might use asyncio.gather to fetch in parallel
        for pt in route["sampled_points"]:
            heat_data = await fortyguard_client.get_current_heat(pt["lat"], pt["lon"])
            total_temp += heat_data.get("temperature_c", 0)
            total_heat_index += heat_data.get("heat_index_c", 0)
            
        avg_temp = total_temp / points_count if points_count > 0 else 0
        avg_heat_index = total_heat_index / points_count if points_count > 0 else 0
        
        scored_routes.append({
            "route_id": route["route_id"],
            "distance_m": route["distance_m"],
            "duration_s": route["duration_s"],
            "avg_temperature_c": avg_temp,
            "avg_heat_index_c": avg_heat_index,
        })
        
    if not scored_routes:
        return {"error": "No routes found", "recommended_route": None, "all_routes_scored": []}
        
    # Sort by avg heat index ascending (coolest first)
    scored_routes.sort(key=lambda r: r["avg_heat_index_c"])
    
    recommended = scored_routes[0]
    
    return {
        "recommended_route": recommended,
        "all_routes_scored": scored_routes,
        "reasoning": f"Route {recommended['route_id']} is recommended as it has the lowest average heat index ({recommended['avg_heat_index_c']:.1f}°C) among candidate routes."
    }

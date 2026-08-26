import httpx
from typing import Any

async def get_candidate_routes(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> list[dict[str, Any]]:
    """Fetch candidate routes from OSRM and return them with sampled coordinates."""
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?alternatives=true&geometries=geojson&overview=full"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        
    routes = []
    if "routes" in data:
        for idx, route in enumerate(data["routes"]):
            # Coordinates are [lon, lat] in GeoJSON
            coords = route.get("geometry", {}).get("coordinates", [])
            
            # Sample up to 5 points along the route
            sampled = []
            if len(coords) > 0:
                step = max(1, len(coords) // 5)
                sampled_coords = coords[::step][:5]
                
                sampled = [{"lat": c[1], "lon": c[0]} for c in sampled_coords]
                
            routes.append({
                "route_id": idx + 1,
                "distance_m": route.get("distance", 0),
                "duration_s": route.get("duration", 0),
                "sampled_points": sampled
            })
            
    return routes

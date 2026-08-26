"""
heat_exposure_guidelines.py

A lookup table based on established generic heat-stress guidelines (e.g., OSHA, NIOSH) 
mapping WBGT or Heat Index bands to recommended maximum continuous outdoor exposure duration.
"""

def get_baseline_safe_duration(heat_index_c: float) -> int:
    """
    Given a heat index in Celsius, return a baseline safe duration in minutes
    for moderate outdoor activity.
    
    References general occupational guidelines:
    - < 28°C: Indefinite/no limits (480 mins for an 8-hour shift)
    - 28°C - 31°C: 120 mins
    - 31°C - 33°C: 90 mins
    - 33°C - 35°C: 45 mins
    - 35°C - 38°C: 30 mins
    - > 38°C: 15 mins
    """
    if heat_index_c < 28.0:
        return 480
    elif heat_index_c < 31.0:
        return 120
    elif heat_index_c < 33.0:
        return 90
    elif heat_index_c < 35.0:
        return 45
    elif heat_index_c < 38.0:
        return 30
    else:
        return 15

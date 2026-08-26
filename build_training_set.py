"""
build_training_set.py

Generates the training dataset by combining anchor data with baseline WBGT guidelines,
and introducing controlled variations (e.g., hour_of_day, exceedance_duration, location_type).
"""
import json
import random
import csv
from pathlib import Path
from heat_exposure_guidelines import get_baseline_safe_duration

def generate_row(anchor, hour_of_day, exceedance_hours):
    # Anchor conditions
    base_temp = anchor["current_temp_c"]
    base_hi = anchor["heat_index_c"]
    
    # Introduce deterministic but varied noise based on time of day
    # Hottest at 14:00 (2pm)
    temp_variation = -abs(14 - hour_of_day) * 0.5 + 4.0 
    
    # Introduce noise based on location type
    loc_type_multiplier = {
        "open_street": 1.5,
        "park": -1.0,
        "bus_stop": 0.5,
        "residential": 0.0
    }.get(anchor["location_type"], 0.0)
    
    # Simulated effective heat index at this time
    eff_hi = base_hi + temp_variation + loc_type_multiplier
    
    # Exceedance fatigue overhead: for every continuous hour in exceedance, safe time drops 10%
    baseline_duration = get_baseline_safe_duration(eff_hi)
    
    penalty_factor = max(0.4, 1.0 - (exceedance_hours * 0.1))
    
    # Add minor noise
    final_duration = int(baseline_duration * penalty_factor * random.uniform(0.95, 1.05))
    final_duration = max(5, final_duration)  # At least 5 mins
    
    return {
        "location": anchor["location"],
        "location_type": anchor["location_type"],
        "temp_c": round(base_temp + temp_variation + loc_type_multiplier, 1),
        "heat_index_c": round(eff_hi, 1),
        "hour_of_day": hour_of_day,
        "exceedance_duration": exceedance_hours,
        "safe_duration_minutes": final_duration
    }

def main():
    anchors_file = Path("data/exposure_anchors.json")
    out_file = Path("data/exposure_training_data.csv")
    
    if not anchors_file.exists():
        print("Run fetch_exposure_anchors.py first.")
        return
        
    with open(anchors_file, "r") as f:
        anchors = json.load(f)
        
    dataset = []
    
    # Generate 100 variations per anchor
    random.seed(42)
    for anchor in anchors:
        for _ in range(100):
            hr = random.randint(6, 20)  # Active hours
            exc = random.randint(0, 4)
            dataset.append(generate_row(anchor, hr, exc))
            
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "location", "location_type", "temp_c", "heat_index_c", 
            "hour_of_day", "exceedance_duration", "safe_duration_minutes"
        ])
        writer.writeheader()
        writer.writerows(dataset)
        
    print(f"Dataset securely generated with {len(dataset)} rows to {out_file}")

if __name__ == "__main__":
    main()

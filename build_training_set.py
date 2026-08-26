"""
build_training_set.py

Builds a training CSV from real API anchor data plus publicly-documented
OSHA/NIOSH heat-stress guidelines.

Design:
  - Temperature and heat-index values come from the real API (via exposure_anchors.json).
  - Safe-duration labels are derived from the established guideline table.
  - Variation is introduced only through the real range of locations and times:
    hour_of_day is sampled across the day, exceedance_duration from 0-4 h.
    No synthetic noise is added to the temperature — it stays as fetched.

One guideline lookup per row; no extra API calls.
"""
import csv
import json
from pathlib import Path

from heat_exposure_guidelines import get_baseline_safe_duration

# Location-type penalty (°C added to effective heat-index for exposure calculation)
# Based on general environmental physics: exposed surfaces absorb more radiant heat.
LOCATION_TYPE_HI_OFFSET = {
    "open_street":  2.0,   # road surface radiates heat
    "park":        -1.5,   # shade / grass cooling
    "bus_stop":     1.0,   # shelter with limited airflow
    "residential":  0.0,   # neutral reference
}


def baseline_for_row(heat_index_c: float, location_type: str, exceedance_hours: int) -> int:
    offset = LOCATION_TYPE_HI_OFFSET.get(location_type, 0.0)
    eff_hi = heat_index_c + offset

    # Each hour already spent in exceedance reduces safe duration by 10 % (fatigue / dehydration)
    baseline = get_baseline_safe_duration(eff_hi)
    penalty  = max(0.4, 1.0 - exceedance_hours * 0.10)
    return max(5, int(baseline * penalty))


def main() -> None:
    anchors_file = Path("data/exposure_anchors.json")
    out_file     = Path("data/exposure_training_data.csv")

    if not anchors_file.exists():
        print("ERROR: data/exposure_anchors.json not found. Run fetch_exposure_anchors.py first.")
        return

    with open(anchors_file) as f:
        anchors = json.load(f)

    if not anchors:
        print("ERROR: No anchors found. Make sure fetch_exposure_anchors.py collected real data.")
        return

    dataset = []
    # Iterate over real anchor readings × a fixed grid (no random noise)
    for anchor in anchors:
        for hour in range(6, 21):       # 06:00 – 20:00
            for exc in range(0, 5):     # 0 – 4 hours exceedance
                dataset.append({
                    "location":             anchor["location"],
                    "location_type":        anchor["location_type"],
                    "temp_c":               anchor["current_temp_c"],
                    "heat_index_c":         anchor["heat_index_c"],
                    "hour_of_day":          hour,
                    "exceedance_duration":  exc,
                    "safe_duration_minutes": baseline_for_row(
                        anchor["heat_index_c"], anchor["location_type"], exc
                    ),
                })

    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "location", "location_type", "temp_c", "heat_index_c",
            "hour_of_day", "exceedance_duration", "safe_duration_minutes",
        ])
        writer.writeheader()
        writer.writerows(dataset)

    print(f"Training set written: {len(dataset)} rows from {len(anchors)} real anchor(s) → {out_file}")


if __name__ == "__main__":
    main()

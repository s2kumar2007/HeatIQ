"""
predict_safe_duration.py

Inference wrapper for the safe outdoor exposure duration regression model.
Returns estimated safe continuous exposure time and a ±MAE confidence range.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

_MODEL_PATH = Path(__file__).parent / "exposure_model.pkl"

# Cache the model in memory between calls
_cached_payload: dict[str, Any] | None = None


def _load_model() -> dict[str, Any]:
    global _cached_payload
    if _cached_payload is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file not found at {_MODEL_PATH}. Run train_exposure_model.py first."
            )
        _cached_payload = joblib.load(_MODEL_PATH)
    return _cached_payload


def predict_safe_duration(
    current_temp: float,
    humidity: float = 50.0,  # default to 50% RH if not available
    exceedance_duration: float = 0.0,
    hour_of_day: int = 12,
    location_type: str = "open_street",
) -> dict[str, Any]:
    """
    Predict safe continuous outdoor exposure duration.

    Args:
        current_temp:       Current temperature in °C.
        humidity:           Relative humidity in % (0-100). Defaults to 50%.
        exceedance_duration: Hours the location has been above heat threshold.
        hour_of_day:        Hour of day (0-23).
        location_type:      One of 'open_street', 'park', 'bus_stop', 'residential'.

    Returns:
        dict with 'safe_minutes' (int) and 'confidence_range' (str).
    """
    payload = _load_model()
    model = payload["model"]
    features = payload["features"]
    mae = payload["mae"]

    # Approximate heat index from temp + humidity using NWS formula variant
    # Only valid for temp >= 27°C; otherwise just use temp
    if current_temp >= 27.0:
        hi = (-8.78469475556
              + 1.61139411 * current_temp
              + 2.33854883889 * humidity
              - 0.14611605 * current_temp * humidity
              - 0.012308094 * current_temp ** 2
              - 0.0164248277778 * humidity ** 2
              + 0.002211732 * current_temp ** 2 * humidity
              + 0.00072546 * current_temp * humidity ** 2
              - 0.000003582 * current_temp ** 2 * humidity ** 2)
    else:
        hi = current_temp

    # Build feature row (one-hot encode location_type)
    all_types = ["open_street", "park", "bus_stop", "residential"]
    row: dict[str, float] = {
        "temp_c": current_temp,
        "heat_index_c": hi,
        "hour_of_day": float(hour_of_day),
        "exceedance_duration": exceedance_duration,
    }
    for t in all_types:
        col = f"location_type_{t}"
        if col in features:
            row[col] = 1.0 if location_type == t else 0.0

    # Align to training feature order
    X = pd.DataFrame([row])[features]
    pred = float(model.predict(X)[0])
    safe_mins = max(5, int(round(pred)))
    low = max(1, int(round(pred - mae)))
    high = int(round(pred + mae))

    return {
        "safe_minutes": safe_mins,
        "confidence_range": f"{low}–{high} mins",
        "heat_index_c": round(hi, 1),
    }


if __name__ == "__main__":
    # Quick smoke-test
    cases = [
        dict(current_temp=24.0, humidity=40, hour_of_day=9,  location_type="park",         label="Cool morning, park"),
        dict(current_temp=33.0, humidity=55, hour_of_day=14, location_type="open_street",  label="Hot afternoon, street"),
        dict(current_temp=38.0, humidity=70, hour_of_day=15, location_type="bus_stop",     label="Very hot, humid, bus stop"),
        dict(current_temp=41.0, humidity=80, hour_of_day=13, location_type="residential",  label="Extreme heat"),
        dict(current_temp=29.0, humidity=60, hour_of_day=8,  location_type="park",         label="Warm but mild, park"),
    ]

    for c in cases:
        label = c.pop("label")
        result = predict_safe_duration(**c)
        print(f"{label}: safe {result['safe_minutes']} min  ({result['confidence_range']})  HI={result['heat_index_c']}°C")

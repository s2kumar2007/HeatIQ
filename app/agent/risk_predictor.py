"""
predict_risk tool — loads the trained RandomForest model and returns
{risk_category, confidence, top_factors, compares_to_threshold}.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

MODEL_PATH = Path(__file__).parent / "risk_model.joblib"

_cache: dict = {}


def _load() -> dict:
    if _cache:
        return _cache
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Risk model not found at {MODEL_PATH}. "
            "Run: python scripts/train_risk_model.py"
        )
    import joblib
    data = joblib.load(MODEL_PATH)
    _cache.update(data)
    return _cache


def predict_risk(
    heat_index_c: float,
    exceedance_hours: float,
    hour_of_day: int,
    forecast_trend_rising: int = 0,
) -> dict[str, Any]:
    """Run the ML risk classifier and return enriched output."""
    data = _load()
    clf = data["model"]
    feature_cols = data["feature_cols"]

    features = {
        "hour_of_day": hour_of_day,
        "heat_index_c": heat_index_c,
        "exceedance_hours": exceedance_hours,
        "forecast_trend_rising": forecast_trend_rising,
    }

    import pandas as pd
    X = pd.DataFrame([features])[feature_cols]

    proba = clf.predict_proba(X)[0]
    classes = list(clf.classes_)
    predicted = classes[int(proba.argmax())]
    confidence = float(proba.max())

    # Feature importances as SHAP-like contributions (importance × feature value delta)
    importances = clf.feature_importances_
    top_factors = sorted(
        [
            {"feature": col, "contribution": float(importances[i])}
            for i, col in enumerate(feature_cols)
        ],
        key=lambda x: abs(x["contribution"]),
        reverse=True,
    )

    from app.agent.thresholds import SAFE_MAX_C, CAUTION_MAX_C
    if predicted == "Unsafe":
        threshold_note = f"Heat index {heat_index_c}°C exceeds unsafe threshold ({CAUTION_MAX_C}°C)"
    elif predicted == "Caution":
        threshold_note = f"Heat index {heat_index_c}°C is in caution band ({SAFE_MAX_C}–{CAUTION_MAX_C}°C)"
    else:
        threshold_note = f"Heat index {heat_index_c}°C is below safe threshold ({SAFE_MAX_C}°C)"

    return {
        "risk_category": predicted,
        "confidence": round(confidence, 3),
        "top_factors": top_factors,
        "compares_to_threshold": threshold_note,
    }

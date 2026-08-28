"""
Train a lightweight RandomForest risk classifier.

Since FortyGuard is currently in placeholder mode (fixed values), we
generate a synthetic but realistic training dataset spanning the full
heat-index / exceedance-hours / hour-of-day space. Labels are derived
from app.agent.thresholds.classify_point — the same function used
everywhere else in the app — for consistency.

Run:
    python scripts/train_risk_model.py
"""
from __future__ import annotations

import random
import sys
import asyncio
from pathlib import Path

# Allow running as `python scripts/train_risk_model.py` from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer

from app.agent.thresholds import classify_point
from app.fortyguard_client import fortyguard_client

MODEL_OUT = Path("app/agent/risk_model.joblib")
FEATURE_COLS = [
    "hour_of_day", 
    "heat_index_c", 
    "exceedance_hours", 
    "forecast_trend_rising",
    "wet_bulb_temperature_celsius",
    "relative_humidity_percent",
    "air_quality_idx"
]
RANDOM_SEED = 42
N_SAMPLES = 2000


async def _simulate_get_current_heat(lat: float, lon: float, rng: random.Random) -> dict:
    """
    Simulates calling get_current_heat for training data generation to avoid
    hitting the FortyGuard API thousands of times during model training.
    In a real pipeline, you would call fortyguard_client.get_current_heat(lat, lon)
    """
    heat_index = round(rng.uniform(28.0, 48.0), 2)
    
    # Simulate nulls about 10% of the time for env params
    if rng.random() < 0.1:
        wet_bulb = None
        rh = None
        aqi = None
    else:
        wet_bulb = round(heat_index - rng.uniform(2.0, 8.0), 2)
        rh = round(rng.uniform(30.0, 90.0), 1)
        aqi = rng.randint(20, 150)
        
    return {
        "temperature_c": heat_index - 1,
        "heat_index_c": heat_index,
        "apparent_temperature_c": heat_index,
        "wet_bulb_temperature_c": wet_bulb,
        "relative_humidity_percent": rh,
        "air_quality_idx": aqi,
        "maximum_c": heat_index + 2
    }


async def build_dataset_async(n: int = N_SAMPLES) -> pd.DataFrame:
    rng = random.Random(RANDOM_SEED)
    rows = []
    
    # We simulate the API calls here to quickly build a large training set
    # The actual fortyguard_client.get_current_heat is used in production.
    for _ in range(n):
        lat = 13.0 + rng.uniform(-0.1, 0.1)
        lon = 80.2 + rng.uniform(-0.1, 0.1)
        
        heat_data = await _simulate_get_current_heat(lat, lon, rng)
        
        exceedance_hours = round(rng.uniform(0.0, 6.0), 2)
        hour_of_day = rng.randint(0, 23)
        trend_rising = rng.randint(0, 1)
        
        heat_index_c = heat_data["heat_index_c"]
        label = classify_point(heat_index_c, exceedance_hours)
        
        rows.append({
            "hour_of_day": hour_of_day,
            "heat_index_c": heat_index_c,
            "exceedance_hours": exceedance_hours,
            "forecast_trend_rising": trend_rising,
            "wet_bulb_temperature_celsius": heat_data.get("wet_bulb_temperature_c"),
            "relative_humidity_percent": heat_data.get("relative_humidity_percent"),
            "air_quality_idx": heat_data.get("air_quality_idx"),
            "label": label,
        })
    return pd.DataFrame(rows)


def build_dataset(n: int = N_SAMPLES) -> pd.DataFrame:
    return asyncio.run(build_dataset_async(n))


def train(df: pd.DataFrame):
    # Handle nulls explicitly: median imputation with indicator columns
    impute_cols = ["wet_bulb_temperature_celsius", "relative_humidity_percent", "air_quality_idx"]
    
    # Create flag columns for imputed values before imputing
    for col in impute_cols:
        df[f"{col}_was_imputed"] = df[col].isnull().astype(int)
        if f"{col}_was_imputed" not in FEATURE_COLS:
            FEATURE_COLS.append(f"{col}_was_imputed")
            
    # Impute missing values with median
    imputer = SimpleImputer(strategy="median")
    df[impute_cols] = imputer.fit_transform(df[impute_cols])
    
    X = df[FEATURE_COLS]
    y = df["label"]

    stratify = y if y.nunique() > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=stratify
    )

    clf = RandomForestClassifier(n_estimators=200, random_state=RANDOM_SEED, n_jobs=-1)
    clf.fit(X_train, y_train)

    acc = clf.score(X_test, y_test)
    print(f"Holdout accuracy: {acc:.4f}  (n_train={len(X_train)}, n_test={len(X_test)})")
    print("Label distribution:\n", y.value_counts().to_string())

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "feature_cols": FEATURE_COLS, "imputer": imputer}, MODEL_OUT)
    print(f"\nSaved -> {MODEL_OUT}")


if __name__ == "__main__":
    print(f"Generating {N_SAMPLES} training samples…")
    df = build_dataset()
    train(df)

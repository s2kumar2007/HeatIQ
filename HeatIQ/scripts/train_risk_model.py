"""Train the risk classifier from cached and live FortyGuard observations."""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Allow running as `python scripts/train_risk_model.py` from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split

from app.agent.thresholds import classify_point
from app.fortyguard_client import fortyguard_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

MODEL_OUT = Path("app/agent/risk_model.joblib")
CACHE_DIR = Path("data/training_cache")

FEATURE_COLS = [
    "hour_of_day",
    "heat_index_c",
    "exceedance_hours",
    "forecast_trend_rising",
    "relative_humidity_percent",
    "wet_bulb_temperature_celsius",
    "air_quality_idx"
]
RANDOM_SEED = 42

def load_locations() -> list[dict[str, Any]]:
    loc_file = Path("data/locations.json")
    if not loc_file.exists():
        loc_file = Path("app/tracked_locations.json")
    if not loc_file.exists():
        logging.warning("No locations file found. Using default locations.")
        return [
            {"id": "anna_nagar", "lat": 13.0850, "lon": 80.2101},
            {"id": "chennai_central", "lat": 13.0827, "lon": 80.2707},
            {"id": "t_nagar", "lat": 13.0418, "lon": 80.2341},
            {"id": "velachery", "lat": 12.9791, "lon": 80.2212}
        ]
    with open(loc_file, "r") as f:
        return json.load(f)

def get_cache_path(lat: float, lon: float, date_str: str, time_str: str) -> Path:
    filename = f"{lat:.5f}_{lon:.5f}_{date_str}_{time_str.replace(':', '')}.json"
    return CACHE_DIR / filename

async def fetch_data_for_point(lat: float, lon: float, date_str: str, time_str: str, hour: int) -> dict[str, Any] | None:
    cache_path = get_cache_path(lat, lon, date_str, time_str)
    if cache_path.exists():
        with cache_path.open("r") as cache_file:
            cached = json.load(cache_file)
        return cached.get("sample", cached)

    logging.info(f"Fetching data for {lat},{lon} at {date_str} {time_str}")
    try:
        # First, fetch raw temperature using heatmap API (tcm) to pass to env_params
        polygon = fortyguard_client._make_polygon(lat, lon)
        date_time_req = {
            "start_date": date_str,
            "start_time": time_str,
            "filter_type": 1
        }
        heatmap_data = await fortyguard_client._submit_and_poll_heatmap(polygon, date_time_req, 60, "tcm")
        stats = heatmap_data.get("stats_data", {}).get("temperature_stats", {})
        temp = stats.get("mean")
        if temp is None:
            logging.error("Failed to get raw temp from heatmap.")
            with cache_path.open("w") as cache_file:
                json.dump({"sample": None, "responses": {"heatmap": heatmap_data}}, cache_file)
            return None

        # Next, get environmental parameters
        env_data = await fortyguard_client.get_environmental_params(lat, lon, date_str, time_str, temp)
        params = env_data.get("data", {}).get("parameters", env_data.get("parameters", {}))
        
        # Get exceedance hours
        # Using a dummy start/end around the hour to get exceedance
        start_dt = f"{date_str}T{time_str}:00"
        end_dt = f"{date_str}T{min(hour + 2, 23):02d}:00:00"
        exc_data = await fortyguard_client.get_exceedance(lat, lon, start_dt, end_dt)
        exc_hours = exc_data.get("exceedance_duration_hours")

        # Get trend from forecast
        forecast = await fortyguard_client.get_forecast(lat, lon, start_dt, end_dt)
        trend_rising = 1 if forecast.get("trend") == "rising" else 0

        def first_val(value: Any) -> Any:
            if isinstance(value, list):
                return value[0] if value else None
            return value

        result = {
            "hour_of_day": hour,
            "temperature_c": temp,
            "heat_index_c": first_val(params.get("heat_index_celsius")),
            "exceedance_hours": exc_hours,
            "forecast_trend_rising": trend_rising,
            "relative_humidity_percent": first_val(params.get("relative_humidity_percent")),
            "wet_bulb_temperature_celsius": first_val(params.get("wet_bulb_temperature_celsius")),
            "air_quality_idx": first_val(params.get("air_quality:idx"))
        }

        # Keep the complete endpoint responses so reruns do not spend credits.

        if result["heat_index_c"] is None or exc_hours is None:
            logging.warning("Skipping sample with missing label inputs at %s %s", date_str, time_str)
            return None
        with cache_path.open("w") as cache_file:
            json.dump({
                "sample": result,
                "responses": {
                    "heatmap": heatmap_data,
                    "environmental_params": env_data,
                    "exceedance": exc_data,
                    "forecast": forecast,
                },
            }, cache_file)

        return result
    except Exception as e:
        logging.error(f"Error fetching {lat},{lon} at {time_str}: {e}")
        return None

async def build_dataset_async(limit: int) -> pd.DataFrame:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    locations = load_locations()

    base_date = datetime.now(timezone.utc)
    dates = [(base_date - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(3)]

    # Hours to sample (6am–8pm every 2 hours)
    hours = [6, 8, 10, 12, 14, 16, 18, 20]

    rows = []
    count = 0

    for loc in locations:
        lat = loc.get("lat")
        lon = loc.get("lon")
        loc_name = loc.get("name", f"{lat},{lon}")
        if lat is None or lon is None:
            continue

        for date_str in dates:
            for h in hours:
                time_str = f"{h:02d}:00"
                requested = datetime.fromisoformat(f"{date_str}T{time_str}").replace(tzinfo=timezone.utc)
                if requested > base_date + timedelta(hours=12):
                    continue
                data = await fetch_data_for_point(lat, lon, date_str, time_str, h)
                if data:
                    heat_index_c = data["heat_index_c"]
                    exc_hours = data["exceedance_hours"]
                    label = classify_point(heat_index_c, exc_hours)
                    data["label"] = label
                    rows.append(data)
                    count += 1
                    logging.info(f"  [{count}/{limit}] {loc_name} {date_str} {time_str} -> hi={heat_index_c:.1f}C label={label}")

                if count >= limit:
                    break
            if count >= limit:
                break
        if count >= limit:
            break

    return pd.DataFrame(rows)

def train(df: pd.DataFrame):
    if df.empty:
        print("Total rows: 0")
        print("Class balance (Safe/Caution/Unsafe):")
        print("Safe       0\nCaution    0\nUnsafe     0")
        logging.error("Empty dataframe. Cannot train model.")
        return

    # Handle nulls explicitly: median imputation with indicator columns
    impute_cols = [
        "wet_bulb_temperature_celsius",
        "relative_humidity_percent",
        "air_quality_idx",
    ]
    feature_cols = FEATURE_COLS.copy()
    available_impute_cols = [col for col in impute_cols if df[col].notna().any()]
    unavailable_cols = set(impute_cols) - set(available_impute_cols)
    feature_cols = [col for col in feature_cols if col not in unavailable_cols]
    
    # Create flag columns for imputed values before imputing
    for col in available_impute_cols:
        df[f"{col}_was_imputed"] = df[col].isnull().astype(int)
        feature_cols.append(f"{col}_was_imputed")
            
    # Impute missing values with median
    imputer = None
    if available_impute_cols:
        imputer = SimpleImputer(strategy="median")
        df[available_impute_cols] = imputer.fit_transform(df[available_impute_cols])
    
    X = df[feature_cols]
    y = df["label"]

    stratify = y if y.nunique() > 1 else None
    
    if len(df) < 2 or df["label"].nunique() < 2:
        logging.warning("Not enough samples or classes to split. Using full set for both.")
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=stratify
        )

    clf = RandomForestClassifier(n_estimators=200, random_state=RANDOM_SEED, n_jobs=-1)
    clf.fit(X_train, y_train)

    import shap
    explainer = shap.TreeExplainer(clf)

    acc = clf.score(X_test, y_test)
    
    print("\n--- Training Results ---")
    print(f"Total rows: {len(df)}")
    print(f"Holdout accuracy: {acc:.4f} (n_train={len(X_train)}, n_test={len(X_test)})")
    print("\nClass balance (Safe/Caution/Unsafe):")
    print(y.value_counts().reindex(["Safe", "Caution", "Unsafe"], fill_value=0).to_string())

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": clf,
        "explainer": explainer,
        "feature_cols": feature_cols,
        "imputer": imputer,
        "impute_cols": available_impute_cols,
    }, MODEL_OUT)
    print(f"\nSaved model to {MODEL_OUT}")

def main():
    parser = argparse.ArgumentParser(description="Train Risk Model on FortyGuard data")
    parser.add_argument("--limit", type=int, default=50, help="Max samples to fetch (default: 50)")
    parser.add_argument("--full", action="store_true", help="Fetch the full dataset (ignores limit)")
    args = parser.parse_args()

    limit = 999999 if args.full else args.limit
    
    print(f"Building training set (limit={limit})...")
    df = asyncio.run(build_dataset_async(limit))
    train(df)

if __name__ == "__main__":
    main()

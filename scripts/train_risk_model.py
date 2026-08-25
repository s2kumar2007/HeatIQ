"""
PHASE 4 STUB — Train a lightweight risk classifier from FortyGuard
features and bootstrapped labels (no ground truth available, so labels
are derived from the same thresholds used elsewhere in the app —
app.agent.thresholds.classify_point — for consistency).

Once trained, wire the saved model into a new `predict_risk` tool in
app/agent/tools.py (input: feature dict; output: {risk_category,
confidence}) and add its schema to TOOLS, then update loop.py's
SYSTEM_PROMPT to mention it as an additional signal the agent can use.

Run:
    python scripts/train_risk_model.py
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.agent.thresholds import classify_point
from app.agent.tools import _KNOWN_LOCATIONS  # small set of demo locations
from app.fortyguard_client import fortyguard_client

MODEL_OUT_PATH = "app/agent/risk_model.joblib"


async def collect_training_rows() -> pd.DataFrame:
    rows = []
    now = datetime.utcnow()
    for label, (lat, lon) in _KNOWN_LOCATIONS.items():
        for hour_offset in range(0, 24, 3):  # sample every 3 hours across a day
            ts = now + timedelta(hours=hour_offset)
            snapshot = await fortyguard_client.get_current_heat(lat, lon)
            exceedance = await fortyguard_client.get_exceedance(
                lat, lon,
                start_time=ts.isoformat(),
                end_time=(ts + timedelta(hours=2)).isoformat(),
            )
            forecast = await fortyguard_client.get_forecast(
                lat, lon,
                start_time=ts.isoformat(),
                end_time=(ts + timedelta(hours=6)).isoformat(),
            )

            heat_index = snapshot.get("heat_index_c", snapshot.get("temperature_c", 0.0))
            exceedance_hours = exceedance.get("exceedance_duration_hours", 0.0)
            trend_rising = 1 if forecast.get("trend") == "rising" else 0

            label_band = classify_point(heat_index, exceedance_hours)

            rows.append(
                {
                    "location": label,
                    "hour_of_day": ts.hour,
                    "heat_index_c": heat_index,
                    "exceedance_hours": exceedance_hours,
                    "forecast_trend_rising": trend_rising,
                    "label": label_band,
                }
            )
    return pd.DataFrame(rows)


def train(df: pd.DataFrame):
    feature_cols = ["hour_of_day", "heat_index_c", "exceedance_hours", "forecast_trend_rising"]
    X = df[feature_cols]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y if y.nunique() > 1 else None
    )

    clf = RandomForestClassifier(n_estimators=200, random_state=42)
    clf.fit(X_train, y_train)

    acc = clf.score(X_test, y_test) if len(X_test) else float("nan")
    print(f"Holdout accuracy: {acc:.3f} (n_test={len(X_test)})")

    joblib.dump({"model": clf, "feature_cols": feature_cols}, MODEL_OUT_PATH)
    print(f"Saved model to {MODEL_OUT_PATH}")


async def main():
    df = await collect_training_rows()
    print(f"Collected {len(df)} training rows")
    print(df["label"].value_counts())
    train(df)


if __name__ == "__main__":
    asyncio.run(main())

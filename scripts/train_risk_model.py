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
from pathlib import Path

# Allow running as `python scripts/train_risk_model.py` from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.agent.thresholds import classify_point

MODEL_OUT = Path("app/agent/risk_model.joblib")
FEATURE_COLS = ["hour_of_day", "heat_index_c", "exceedance_hours", "forecast_trend_rising"]
RANDOM_SEED = 42
N_SAMPLES = 2000


def build_dataset(n: int = N_SAMPLES) -> pd.DataFrame:
    rng = random.Random(RANDOM_SEED)
    rows = []
    for _ in range(n):
        heat_index_c     = round(rng.uniform(28.0, 48.0), 2)
        exceedance_hours = round(rng.uniform(0.0, 6.0),   2)
        hour_of_day      = rng.randint(0, 23)
        trend_rising     = rng.randint(0, 1)
        label = classify_point(heat_index_c, exceedance_hours)
        rows.append({
            "hour_of_day": hour_of_day,
            "heat_index_c": heat_index_c,
            "exceedance_hours": exceedance_hours,
            "forecast_trend_rising": trend_rising,
            "label": label,
        })
    return pd.DataFrame(rows)


def train(df: pd.DataFrame):
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
    joblib.dump({"model": clf, "feature_cols": FEATURE_COLS}, MODEL_OUT)
    print(f"\nSaved -> {MODEL_OUT}")


if __name__ == "__main__":
    print(f"Generating {N_SAMPLES} training samples…")
    df = build_dataset()
    train(df)

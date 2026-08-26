"""
train_exposure_model.py

Trains a regression model to predict safe outdoor exposure duration based on current heat conditions.
Compares RandomForest and GradientBoosting to choose the best based on Mean Absolute Error (MAE).
"""
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
import joblib
from pathlib import Path

def main():
    data_path = Path("data/exposure_training_data.csv")
    if not data_path.exists():
        print("Dataset not found. Run build_training_set.py first.")
        return
        
    df = pd.read_csv(data_path)
    
    # Feature engineering for categorical data
    df = pd.get_dummies(df, columns=["location_type"], drop_first=False)
    
    # Target and Features
    y = df["safe_duration_minutes"]
    X = df.drop(columns=["location", "safe_duration_minutes"])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Random Forest
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_mae = mean_absolute_error(y_test, rf_preds)
    
    # Train Gradient Boosting
    gb = GradientBoostingRegressor(n_estimators=100, random_state=42)
    gb.fit(X_train, y_train)
    gb_preds = gb.predict(X_test)
    gb_mae = mean_absolute_error(y_test, gb_preds)
    
    print("\n--- Model Evaluation ---")
    print(f"RandomForestRegressor MAE: {rf_mae:.2f} mins")
    print(f"GradientBoostingRegressor MAE: {gb_mae:.2f} mins")
    
    # Select Best Model
    best_model = rf if rf_mae < gb_mae else gb
    best_mae = min(rf_mae, gb_mae)
    print(f"\nBest Model: {type(best_model).__name__}")
    
    # Save Model & Feature Names mapping
    model_payload = {
        "model": best_model,
        "features": list(X.columns),
        "mae": best_mae
    }
    joblib.dump(model_payload, "exposure_model.pkl")
    print(f"Model saved to 'exposure_model.pkl'.")
    
    out_features = list(X.columns)
    importances = best_model.feature_importances_
    
    print("\n--- Feature Importances ---")
    sorted_idx = importances.argsort()[::-1]
    for i in sorted_idx:
        print(f"{out_features[i]}: {importances[i]:.4f}")

if __name__ == "__main__":
    main()

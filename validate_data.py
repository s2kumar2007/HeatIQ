import pandas as pd
from pathlib import Path
from datetime import datetime

INPUT_CSV = Path(__file__).parent / "data" / "historical_data.csv"
OUTPUT_CSV = Path(__file__).parent / "data" / "training_data.csv"

def validate_and_clean():
    if not INPUT_CSV.exists():
        print(f"Error: {INPUT_CSV} does not exist.")
        return

    df = pd.read_csv(INPUT_CSV)
    
    print(f"--- Data Validation Report ---")
    print(f"Total rows loaded: {len(df)}")
    
    # Rows per location
    print("\nRows per location:")
    print(df["location"].value_counts())
    
    # Nulls check
    null_counts = df.isnull().sum()
    print("\nNull values per column:")
    print(null_counts)
    
    # Temp range
    if not df["current_temp"].isnull().all():
        print(f"\nTemperature range: {df['current_temp'].min()}°C to {df['current_temp'].max()}°C")
    
    # Cleaning
    print("\nCleaning data...")
    clean_df = df.dropna().copy()
    
    # Removing rows where the placeholder message or API errors might have snuck into numerical columns 
    # (assuming they are floats, coerce errors to NaN and drop again)
    clean_df['current_temp'] = pd.to_numeric(clean_df['current_temp'], errors='coerce')
    clean_df['exceedance_duration'] = pd.to_numeric(clean_df['exceedance_duration'], errors='coerce')
    clean_df['exceedance_magnitude'] = pd.to_numeric(clean_df['exceedance_magnitude'], errors='coerce')
    clean_df = clean_df.dropna()
    
    print(f"Rows dropped due to nulls or invalid values: {len(df) - len(clean_df)}")
    print(f"Clean rows remaining: {len(clean_df)}")
    
    if len(clean_df) > 0:
        # Derive hour_of_day from timestamp
        # Ensure timestamp is datetime
        clean_df['timestamp'] = pd.to_datetime(clean_df['timestamp'])
        clean_df['hour_of_day'] = clean_df['timestamp'].dt.hour
        
        # Select required columns
        final_cols = [
            "location", "location_type", "timestamp", "current_temp", 
            "exceedance_duration", "exceedance_magnitude", "hour_of_day", "forecast_trend"
        ]
        final_df = clean_df[final_cols]
        
        final_df.to_csv(OUTPUT_CSV, index=False)
        print(f"\nSuccessfully wrote {len(final_df)} rows to {OUTPUT_CSV}")
    else:
        print("\nNo valid data left to write to training_data.csv.")

if __name__ == "__main__":
    validate_and_clean()

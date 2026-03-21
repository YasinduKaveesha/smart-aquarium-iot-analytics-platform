"""
seed_via_api.py — Seed data by POSTing to the backend API (like mqtt_to_mongo.py does)
=======================================================================================
Reads CSV data and sends each row to POST /api/telemetry.
The backend runs it through the ML pipeline and stores enriched documents in Atlas.

No pH sensor — simulates real ESP32 setup (triggers SENSOR_ERROR mode).

Usage:
    1. Start the backend:  cd backend && uvicorn app.main:app --reload --port 8000
    2. Run this script:    python seed_via_api.py --rows 50

Options:
    --rows N     Number of readings to send (default: 50)
    --delay S    Seconds between requests (default: 0.1)
    --with-ph    Include pH data (simulate full 4-sensor setup)
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_CSV = PROJECT_ROOT / "data" / "smart_aquarium_dataset_v6.1.csv"
API_URL = "http://localhost:8000/api/telemetry"


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed data via backend API")
    parser.add_argument("--rows", type=int, default=50, help="Number of readings to send")
    parser.add_argument("--delay", type=float, default=0.5, help="Seconds between requests")
    parser.add_argument("--with-ph", action="store_true", help="Include pH data")
    args = parser.parse_args()

    if not DATA_CSV.exists():
        print(f"[ERROR] CSV not found: {DATA_CSV}")
        sys.exit(1)

    df = pd.read_csv(DATA_CSV)
    # Use last N rows from the dataset
    df = df.tail(args.rows).reset_index(drop=True)
    print(f"[SEED] Loaded {len(df)} rows from {DATA_CSV.name}")
    print(f"[SEED] API: {API_URL}")
    print(f"[SEED] pH sensor: {'included' if args.with_ph else 'excluded (SENSOR_ERROR mode)'}")
    print()

    success = 0
    errors = 0

    for i, row in df.iterrows():
        payload = {
            "temperature": float(row["temperature"]),
            "tds":         float(row["tds"]),
            "turbidity":   float(row["turbidity"]),
        }

        if args.with_ph:
            payload["ph"] = float(row["ph"])

        try:
            resp = requests.post(API_URL, json=payload, timeout=30)
            if resp.ok:
                data = resp.json()
                mode = data.get("mode", "?")
                wqi = data.get("wqi_score")
                wqi_str = f"{wqi:.1f}" if wqi is not None else "N/A"
                print(f"  [{i+1}/{len(df)}] mode={mode}  WQI={wqi_str}  "
                      f"temp={payload['temperature']:.1f}  tds={payload['tds']:.0f}  "
                      f"turb={payload['turbidity']:.1f}")
                success += 1
            else:
                print(f"  [{i+1}/{len(df)}] ERROR {resp.status_code}: {resp.text[:100]}")
                errors += 1
        except requests.exceptions.ConnectionError:
            print(f"  [{i+1}/{len(df)}] Backend not reachable — is it running?")
            errors += 1
            break

        if args.delay > 0:
            time.sleep(args.delay)

    print()
    print("=" * 50)
    print(f"  Sent: {success}  |  Errors: {errors}")
    print("=" * 50)


if __name__ == "__main__":
    main()

"""
seed_sensor_failure_demo.py — Seed 7 days of data with pH sensor failure after day 5
======================================================================================
Simulates a realistic scenario: all 4 sensors work for 5 days, then the pH sensor
disconnects on day 6. This lets you test SENSOR_ERROR mode on the dashboard without
needing real hardware.

Days 1–5: Full 4-sensor data (ADAPTIVE mode, WQI computed)
Days 6–7: No pH data (SENSOR_ERROR mode, WQI = None)

Usage:
    cd <project-root>
    python backend/seed_sensor_failure_demo.py

Idempotent: deletes existing docs from last 8 days before inserting.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient

# ── Resolve paths ─────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.config import settings  # noqa: E402

DATA_CSV = PROJECT_ROOT / "data" / "smart_aquarium_dataset_v6.1.csv"
ROWS_7DAYS = 2016  # 7 days × 288 readings/day (5-min intervals)
PH_FAILURE_DAY = 5  # pH sensor "disconnects" after this many days


async def seed() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB]

    print(f"[SEED] Connected to {settings.MONGODB_URL}/{settings.MONGODB_DB}")
    print(f"[SEED] pH sensor failure starts after day {PH_FAILURE_DAY}")

    # ── Load CSV ──────────────────────────────────────────────────────────────
    if not DATA_CSV.exists():
        print(f"[SEED] ERROR: CSV not found at {DATA_CSV}")
        client.close()
        return

    df = pd.read_csv(DATA_CSV)
    print(f"[SEED] Loaded {len(df)} rows from {DATA_CSV.name}")

    df = df.tail(ROWS_7DAYS).reset_index(drop=True)
    print(f"[SEED] Using last {len(df)} rows (7 days)")

    # ── Timestamps ────────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(days=7)
    interval = timedelta(minutes=5)
    ph_cutoff_time = start_time + timedelta(days=PH_FAILURE_DAY)

    # ── Delete existing rows (idempotency) ────────────────────────────────────
    cutoff = now - timedelta(days=8)
    result = await db.telemetry.delete_many({"timestamp": {"$gte": cutoff}})
    print(f"[SEED] Deleted {result.deleted_count} existing docs (last 8 days)")

    # ── Build documents ───────────────────────────────────────────────────────
    docs = []
    ph_failure_count = 0
    normal_count = 0

    for i, row in df.iterrows():
        ts = start_time + i * interval

        # Derive maintenance mode
        raw_maintenance = row.get("maintenance_state", False)
        if isinstance(raw_maintenance, str):
            is_maintenance = raw_maintenance.lower() in ("true", "1", "yes")
        else:
            is_maintenance = bool(raw_maintenance)

        # Check if pH sensor has "failed" (after day 5)
        ph_failed = ts >= ph_cutoff_time

        if ph_failed:
            # pH sensor disconnected — SENSOR_ERROR mode
            doc = {
                "timestamp":     ts,
                "ph":            None,
                "temperature":   float(row["temperature"]) if not pd.isna(row.get("temperature", float("nan"))) else None,
                "tds":           float(row["tds"])          if not pd.isna(row.get("tds", float("nan")))          else None,
                "turbidity":     float(row["turbidity"])    if not pd.isna(row.get("turbidity", float("nan")))    else None,
                "wqi_score":     None,
                "anomaly_flag":  0,
                "mode":          "SENSOR_ERROR",
                "sensor_errors": ["pH sensor not connected — no data received"],
                "breakdown":     {},
            }
            ph_failure_count += 1
        elif is_maintenance:
            # Maintenance mode — WQI paused
            doc = {
                "timestamp":     ts,
                "ph":            float(row["ph"])          if not pd.isna(row.get("ph", float("nan")))          else None,
                "temperature":   float(row["temperature"]) if not pd.isna(row.get("temperature", float("nan"))) else None,
                "tds":           float(row["tds"])          if not pd.isna(row.get("tds", float("nan")))          else None,
                "turbidity":     float(row["turbidity"])    if not pd.isna(row.get("turbidity", float("nan")))    else None,
                "wqi_score":     None,
                "anomaly_flag":  0,
                "mode":          "MAINTENANCE",
                "sensor_errors": [],
                "breakdown":     {},
            }
            normal_count += 1
        else:
            # Normal ADAPTIVE mode — all 4 sensors working
            wqi_score = float(row["computed_WQI"]) if not pd.isna(row.get("computed_WQI", float("nan"))) else None
            anomaly_flag = int(row.get("is_anomaly", 0))

            doc = {
                "timestamp":     ts,
                "ph":            float(row["ph"])          if not pd.isna(row.get("ph", float("nan")))          else None,
                "temperature":   float(row["temperature"]) if not pd.isna(row.get("temperature", float("nan"))) else None,
                "tds":           float(row["tds"])          if not pd.isna(row.get("tds", float("nan")))          else None,
                "turbidity":     float(row["turbidity"])    if not pd.isna(row.get("turbidity", float("nan")))    else None,
                "wqi_score":     wqi_score,
                "anomaly_flag":  anomaly_flag,
                "mode":          "ADAPTIVE",
                "sensor_errors": [],
                "breakdown":     {},
            }
            normal_count += 1

        docs.append(doc)

    # ── Bulk insert ───────────────────────────────────────────────────────────
    if docs:
        await db.telemetry.insert_many(docs)
        print(f"[SEED] Inserted {len(docs)} telemetry documents")

    # ── Upsert system_state ───────────────────────────────────────────────────
    await db.system_state.update_one(
        {"_id": 1},
        {"$set": {
            "install_date":       settings.INSTALL_DATE,
            "maintenance_active": False,
            "stabilizing_until":  None,
            "last_mode":          "SENSOR_ERROR",
        }},
        upsert=True,
    )
    print(f"[SEED] system_state upserted  install_date={settings.INSTALL_DATE}")

    # ── Summary ───────────────────────────────────────────────────────────────
    anomaly_count = sum(1 for d in docs if d["anomaly_flag"] == 1)
    maintenance_count = sum(1 for d in docs if d["mode"] == "MAINTENANCE")

    print()
    print("=" * 60)
    print(f"  Days 1-{PH_FAILURE_DAY}: {normal_count} docs (ADAPTIVE + MAINTENANCE)")
    print(f"  Days {PH_FAILURE_DAY + 1}-7: {ph_failure_count} docs (SENSOR_ERROR, no pH)")
    print(f"  Anomalies: {anomaly_count}  |  Maintenance: {maintenance_count}")
    print("=" * 60)
    print()
    print("Run the backend and open the dashboard to test SENSOR_ERROR mode.")
    print("The latest readings should show pH sensor failure with WQI = N/A.")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())

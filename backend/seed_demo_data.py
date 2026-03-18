"""
seed_demo_data.py — Seed MongoDB with 7 days of historical data from CSV
=========================================================================
Run this ONCE before starting the server to populate the telemetry collection
so the dashboard charts show realistic historical data immediately.

The script is idempotent: it deletes any existing rows in the last 8 days
before inserting, so it is safe to re-run.

Usage:
    cd <project-root>
    python backend/seed_demo_data.py

    # or with a custom .env location:
    MONGODB_URL=mongodb://localhost:27017 python backend/seed_demo_data.py

What it does:
  1. Load data/smart_aquarium_dataset_v6.1.csv (8,640 rows)
  2. Take the last 2016 rows (7 days × 288 readings/day at 5-min intervals)
  3. Remap timestamps: row[0] → now - 7 days, each subsequent row + 5 minutes
  4. Map CSV columns:
       computed_WQI          → wqi_score
       is_anomaly (0/1)      → anomaly_flag
       maintenance_state     → mode ("MAINTENANCE" or "ADAPTIVE")
  5. Delete existing docs from the last 8 days (idempotency)
  6. Bulk insert all 2016 documents
  7. Upsert system_state with install_date=2026-01-01, maintenance_active=False
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

# Load settings (reads .env if present)
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
from app.config import settings   # noqa: E402

DATA_CSV   = PROJECT_ROOT / "data" / "smart_aquarium_dataset_v6.1.csv"
ROWS_7DAYS = 2016   # 7 days × 288 readings/day (5-min intervals)


async def seed() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db     = client[settings.MONGODB_DB]

    print(f"[SEED] Connected to {settings.MONGODB_URL}/{settings.MONGODB_DB}")

    # ── Load CSV ──────────────────────────────────────────────────────────────
    if not DATA_CSV.exists():
        print(f"[SEED] ERROR: CSV not found at {DATA_CSV}")
        client.close()
        return

    df = pd.read_csv(DATA_CSV)
    print(f"[SEED] Loaded {len(df)} rows from {DATA_CSV.name}")

    # Take the last 2016 rows (most realistic recent data)
    df = df.tail(ROWS_7DAYS).reset_index(drop=True)
    print(f"[SEED] Using last {len(df)} rows (7 days)")

    # ── Remap timestamps ──────────────────────────────────────────────────────
    now         = datetime.now(timezone.utc)
    start_time  = now - timedelta(days=7)
    interval    = timedelta(minutes=5)

    # ── Delete existing rows in the last 8 days (idempotency) ─────────────────
    cutoff = now - timedelta(days=8)
    result = await db.telemetry.delete_many({"timestamp": {"$gte": cutoff}})
    print(f"[SEED] Deleted {result.deleted_count} existing docs (last 8 days)")

    # ── Build documents ───────────────────────────────────────────────────────
    docs = []
    for i, row in df.iterrows():
        ts = start_time + i * interval   # type: ignore[operator]

        # Derive mode from maintenance_state column
        raw_maintenance = row.get("maintenance_state", False)
        if isinstance(raw_maintenance, str):
            is_maintenance = raw_maintenance.lower() in ("true", "1", "yes")
        else:
            is_maintenance = bool(raw_maintenance)

        mode = "MAINTENANCE" if is_maintenance else "ADAPTIVE"

        wqi_score = float(row["computed_WQI"]) if not pd.isna(row.get("computed_WQI", float("nan"))) else None
        if is_maintenance:
            wqi_score = None

        anomaly_flag = int(row.get("is_anomaly", 0))

        doc = {
            "timestamp":     ts,
            "ph":            float(row["ph"])          if not pd.isna(row.get("ph", float("nan")))          else None,
            "temperature":   float(row["temperature"]) if not pd.isna(row.get("temperature", float("nan"))) else None,
            "tds":           float(row["tds"])          if not pd.isna(row.get("tds", float("nan")))          else None,
            "turbidity":     float(row["turbidity"])    if not pd.isna(row.get("turbidity", float("nan")))    else None,
            "wqi_score":     wqi_score,
            "anomaly_flag":  anomaly_flag,
            "mode":          mode,
            "sensor_errors": [],
            "breakdown":     {},  # empty for seeded rows — frontend must handle gracefully
        }
        docs.append(doc)

    # ── Bulk insert ───────────────────────────────────────────────────────────
    if docs:
        await db.telemetry.insert_many(docs)
        print(f"[SEED] Inserted {len(docs)} telemetry documents")

    # ── Upsert system_state ───────────────────────────────────────────────────
    await db.system_state.update_one(
        {"_id": 1},
        {"$setOnInsert": {
            "_id":               1,
            "install_date":      settings.INSTALL_DATE,
            "maintenance_active": False,
            "stabilizing_until": None,
            "last_retrain_date": None,
            "last_mode":         "ADAPTIVE",
        }},
        upsert=True,
    )
    print(f"[SEED] system_state upserted  install_date={settings.INSTALL_DATE}")

    # ── Summary stats ─────────────────────────────────────────────────────────
    anomaly_count = sum(1 for d in docs if d["anomaly_flag"] == 1)
    maintenance_count = sum(1 for d in docs if d["mode"] == "MAINTENANCE")
    print(f"[SEED] Done — {anomaly_count} anomalies, {maintenance_count} maintenance rows")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())

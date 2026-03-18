"""
replay_sensor.py — Publish CSV rows as MQTT messages for live demo
===================================================================
Simulates the IoT device by reading the CSV dataset and publishing
sensor readings to the MQTT broker at a configurable speed.

Usage:
    # Replay last 100 readings at default 2s interval
    python backend/replay_sensor.py

    # Replay 200 readings at 10x speed (compressed 5-min intervals → 30s each)
    python backend/replay_sensor.py --rows 200 --speed 10

    # Replay with custom topic and broker
    python backend/replay_sensor.py --broker 192.168.1.100 --topic myaqua/sensors

Arguments:
    --rows   : Number of CSV rows to replay (default: 100)
    --speed  : Compression multiplier vs real 5-min intervals (default: 60)
               --speed 1   = real-time (300s per reading — impractical for demo)
               --speed 60  = 5s per reading  (recommended for quick demo)
               --speed 300 = 1s per reading  (fastest)
    --broker : MQTT broker host  (default: from .env)
    --port   : MQTT broker port  (default: from .env)
    --topic  : MQTT topic        (default: from .env)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import pandas as pd
import paho.mqtt.client as mqtt

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

sys.path.insert(0, str(PROJECT_ROOT / "backend"))
from app.config import settings  # noqa: E402

DATA_CSV = PROJECT_ROOT / "data" / "smart_aquarium_dataset_v6.1.csv"
INTERVAL_SECONDS = 5 * 60   # 5-minute real interval


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Replay CSV sensor data via MQTT")
    p.add_argument("--rows",   type=int,   default=100,              help="Number of rows to replay")
    p.add_argument("--speed",  type=float, default=60.0,             help="Speed multiplier (default 60x = 5s per reading)")
    p.add_argument("--broker", type=str,   default=settings.MQTT_BROKER, help="MQTT broker host")
    p.add_argument("--port",   type=int,   default=settings.MQTT_PORT,   help="MQTT broker port")
    p.add_argument("--topic",  type=str,   default=settings.MQTT_TOPIC,  help="MQTT topic")
    return p.parse_args()


def main() -> None:
    args  = parse_args()
    delay = INTERVAL_SECONDS / args.speed   # seconds between publishes

    print(f"[REPLAY] Loading {DATA_CSV.name} ...")
    if not DATA_CSV.exists():
        print(f"[REPLAY] ERROR: CSV not found at {DATA_CSV}")
        sys.exit(1)

    df = pd.read_csv(DATA_CSV).tail(args.rows).reset_index(drop=True)
    print(f"[REPLAY] {len(df)} rows loaded")
    print(f"[REPLAY] Speed: {args.speed}x  ->  {delay:.1f}s per reading")
    print(f"[REPLAY] Target: mqtt://{args.broker}:{args.port}/{args.topic}")
    print()

    # ── MQTT client ──────────────────────────────────────────────────────────
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id="aquaguard-replay")
    client.connect(args.broker, args.port, keepalive=60)
    client.loop_start()

    try:
        for i, row in df.iterrows():
            # Skip maintenance rows — sensors aren't meaningful during cleaning
            raw_maint = row.get("maintenance_state", False)
            if isinstance(raw_maint, str):
                is_maint = raw_maint.lower() in ("true", "1", "yes")
            else:
                is_maint = bool(raw_maint)
            if is_maint:
                continue

            # Build 4-sensor payload
            payload = {
                "ph":          round(float(row["ph"]), 3),
                "temperature": round(float(row["temperature"]), 2),
                "tds":         round(float(row["tds"]), 1),
                "turbidity":   round(float(row["turbidity"]), 2),
            }
            msg = json.dumps(payload)
            client.publish(args.topic, msg, qos=0)

            # Row counter (i is DataFrame index after tail/reset)
            row_num = int(i) + 1   # type: ignore[arg-type]
            anomaly_marker = " ⚠ ANOMALY" if int(row.get("is_anomaly", 0)) == 1 else ""
            print(f"  [{row_num:>4}/{len(df)}]  pH={payload['ph']}  "
                  f"T={payload['temperature']}°C  "
                  f"TDS={payload['tds']}  Turb={payload['turbidity']}"
                  f"{anomaly_marker}")

            time.sleep(delay)

    except KeyboardInterrupt:
        print("\n[REPLAY] Stopped by user")
    finally:
        client.loop_stop()
        client.disconnect()
        print("[REPLAY] Disconnected")


if __name__ == "__main__":
    main()

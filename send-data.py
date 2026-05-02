"""
send-data.py — Send simulated sensor readings to the backend
=============================================================
Edit the READINGS list below to add your own data, then run:

    python send-data.py

Each reading is a dict with these fields:
  ph          : float  (normal range: 6.5–8.5) — set to null to simulate pH sensor failure
  temperature : float  (normal range: 24–28 °C)
  tds         : float  (normal range: 200–500 ppm)
  turbidity   : float  (normal range: 0–5 NTU)
"""

import json
import time
import urllib.request

# ── Config ────────────────────────────────────────────────────────────────────
BACKEND_URL = "http://127.0.0.1:8000/api/telemetry"
DELAY_SECONDS = 1  # pause between readings

# ── Readings — edit this list ─────────────────────────────────────────────────
READINGS = [
    # Normal healthy readings
    {"ph": 7.0, "temperature": 25.5, "tds": 310, "turbidity": 2.1},
    {"ph": 7.1, "temperature": 25.7, "tds": 315, "turbidity": 2.0},
    {"ph": 6.9, "temperature": 26.0, "tds": 320, "turbidity": 2.3},
    {"ph": 7.2, "temperature": 25.3, "tds": 308, "turbidity": 1.9},
    {"ph": 7.0, "temperature": 25.8, "tds": 312, "turbidity": 2.2},

    # Slightly elevated readings
    {"ph": 6.8, "temperature": 26.2, "tds": 325, "turbidity": 2.4},
    {"ph": 7.3, "temperature": 25.1, "tds": 305, "turbidity": 1.8},
    {"ph": 7.1, "temperature": 25.6, "tds": 318, "turbidity": 2.1},
    {"ph": 6.7, "temperature": 26.5, "tds": 330, "turbidity": 2.6},
    {"ph": 7.0, "temperature": 25.4, "tds": 310, "turbidity": 2.0},

    # Anomaly spike — all sensors high
    {"ph": 8.5, "temperature": 28.0, "tds": 380, "turbidity": 4.0},

    # Recovery after anomaly
    {"ph": 7.1, "temperature": 25.5, "tds": 314, "turbidity": 2.0},
    {"ph": 7.0, "temperature": 25.6, "tds": 311, "turbidity": 2.1},

    # pH sensor failure (ph = null)
    {"ph": None, "temperature": 25.8, "tds": 316, "turbidity": 2.2},
    {"ph": None, "temperature": 25.9, "tds": 318, "turbidity": 2.1},

    # Sensor back online
    {"ph": 7.0, "temperature": 25.7, "tds": 312, "turbidity": 2.0},
    {"ph": 7.1, "temperature": 25.5, "tds": 310, "turbidity": 1.9},
    {"ph": 7.2, "temperature": 25.4, "tds": 308, "turbidity": 1.8},
]

# ── Sender ────────────────────────────────────────────────────────────────────
def send(reading: dict) -> dict:
    payload = json.dumps(reading).encode()
    req = urllib.request.Request(
        BACKEND_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def main():
    print(f"Sending {len(READINGS)} readings to {BACKEND_URL}\n")
    for i, reading in enumerate(READINGS, 1):
        try:
            result = send(reading)
            wqi     = result.get("wqi_score", "N/A")
            mode    = result.get("mode", "?")
            anomaly = result.get("anomaly_flag", 0)
            errors  = result.get("sensor_errors", [])
            flag    = " *** ANOMALY ***" if anomaly else ""
            err_str = f" [{', '.join(errors)}]" if errors else ""
            print(
                f"[{i:02d}] ph={reading.get('ph'):<5} "
                f"temp={reading['temperature']}  "
                f"tds={reading['tds']}  "
                f"turb={reading['turbidity']}"
                f"  →  WQI={wqi}  mode={mode}{err_str}{flag}"
            )
        except Exception as e:
            print(f"[{i:02d}] ERROR: {e}")
        time.sleep(DELAY_SECONDS)

    print("\nAll readings sent. Check http://localhost:5173 to see the data.")


if __name__ == "__main__":
    main()

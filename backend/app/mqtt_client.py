"""
mqtt_client.py — Paho MQTT subscriber + _process_reading() shared logic
========================================================================
Architecture:
  - Paho runs in a daemon thread (mqtt_client.loop_forever)
  - on_message callback is sync; it dispatches to the async event loop
    using asyncio.run_coroutine_threadsafe()
  - _process_reading() is the shared coroutine used by BOTH:
      * MQTT on_message (live sensor data)
      * POST /api/telemetry (manual / debug entry)

Pre-validation rules (enforced before calling ML pipeline):
  pH          : 0 – 14
  temperature : 0 – 50 °C
  tds         : 0 – 2000 ppm
  turbidity   : 0 – 500 NTU

STABILIZING cooldown:
  After maintenance/stop, the system stays in STABILIZING mode for 10 min.
  On every incoming reading we check the cooldown timestamp:
    - Still active  → rule_based_wqi only, mode=STABILIZING
    - Just expired  → clear stabilizing_until in DB, continue to normal routing
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

import paho.mqtt.client as mqtt

from app.config import settings


# ── MQTT client factory ──────────────────────────────────────────────────────

def build_mqtt_client(
    app_state: Any,
    loop: asyncio.AbstractEventLoop,
) -> mqtt.Client:
    """
    Build and configure a Paho MQTT client.

    Messages are dispatched to the asyncio event loop via
    run_coroutine_threadsafe() so the sync Paho thread never blocks
    the async FastAPI workers.
    """
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id=settings.MQTT_CLIENT_ID)

    def on_connect(client: mqtt.Client, userdata: Any, flags: dict, rc: int) -> None:
        if rc == 0:
            client.subscribe(settings.MQTT_TOPIC)
            print(f"[MQTT] Connected — subscribed to {settings.MQTT_TOPIC}")
        else:
            print(f"[MQTT] Connection refused  rc={rc}")

    def on_disconnect(client: mqtt.Client, userdata: Any, rc: int) -> None:
        print(f"[MQTT] Disconnected  rc={rc}")

    def on_message(client: mqtt.Client, userdata: Any, msg: mqtt.MQTTMessage) -> None:
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            ph          = float(payload["ph"])
            temperature = float(payload["temperature"])
            tds         = float(payload["tds"])
            turbidity   = float(payload["turbidity"])
        except Exception as exc:
            print(f"[MQTT ERROR] Failed to parse message: {exc}  "
                  f"payload={msg.payload[:120]}")
            return

        # Dispatch to async event loop (non-blocking from sync MQTT thread)
        asyncio.run_coroutine_threadsafe(
            _process_reading(app_state, ph, temperature, tds, turbidity),
            loop,
        )

    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message
    return client


# ── Shared processing coroutine ──────────────────────────────────────────────

async def _process_reading(
    app_state: Any,
    ph:          float,
    temperature: float,
    tds:         float,
    turbidity:   float,
) -> dict[str, Any]:
    """
    Core coroutine shared by MQTT on_message AND POST /api/telemetry.

    Steps:
      0. Pre-validate physical sensor ranges (raises ValueError on out-of-range)
      1. Check STABILIZING cooldown
      2. If still cooling down → rule_based_wqi, mode=STABILIZING
      3. If cooldown just expired → clear it in DB
      4. Run full ML pipeline via run_in_executor
      5. Insert telemetry document into MongoDB
      6. Update system_state.last_mode

    Returns the inserted telemetry document dict (with authoritative timestamp).
    """
    # ── Pre-validate sensor ranges ────────────────────────────────────────────
    if not (0.0 <= ph <= 14.0):
        raise ValueError(f"pH out of physical range: {ph}")
    if not (0.0 <= temperature <= 50.0):
        raise ValueError(f"temperature out of range: {temperature}")
    if not (0.0 <= tds <= 2000.0):
        raise ValueError(f"tds out of range: {tds}")
    if not (0.0 <= turbidity <= 500.0):
        raise ValueError(f"turbidity out of range: {turbidity}")

    from app.database import (
        fetch_system_state,
        insert_telemetry,
        set_maintenance,
        update_last_mode,
    )
    from app.services.pipeline_service import run_pipeline

    pipeline_router = app_state.pipeline_router
    db              = app_state.db

    # ── STABILIZING cooldown check ───────────────────────────────────────────
    state = await fetch_system_state(db)
    stabilizing_until_raw = state.get("stabilizing_until")

    if stabilizing_until_raw is not None:
        stab_until = datetime.fromisoformat(str(stabilizing_until_raw))
        # Ensure timezone-aware comparison
        if stab_until.tzinfo is None:
            stab_until = stab_until.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)

        if now < stab_until:
            # Still within cooldown — rule-based WQI only
            from src.adaptive_wqi_pipeline import rule_based_wqi  # type: ignore[import]
            wqi = rule_based_wqi(ph, temperature, tds, turbidity)
            doc = _build_doc(ph, temperature, tds, turbidity,
                             wqi_score=wqi, anomaly_flag=0,
                             mode="STABILIZING", sensor_errors=[], breakdown={})
            await insert_telemetry(db, doc)
            await update_last_mode(db, "STABILIZING")
            return doc
        else:
            # Cooldown expired — clear it so we don't re-check stale timestamp
            await set_maintenance(db, active=False, stabilizing_until=None)

    # ── Normal pipeline routing ──────────────────────────────────────────────
    result = await run_pipeline(pipeline_router, ph, temperature, tds, turbidity)

    doc = _build_doc(
        ph, temperature, tds, turbidity,
        wqi_score    = result.wqi_score,
        anomaly_flag = max(0, result.anomaly_flag),  # normalise -1 (SENSOR_ERROR) → 0
        mode         = result.mode,
        sensor_errors= result.sensor_errors,
        breakdown    = result.breakdown,
    )

    await insert_telemetry(db, doc)
    await update_last_mode(db, result.mode)
    return doc


# ── Helper ───────────────────────────────────────────────────────────────────

def _build_doc(
    ph:           float,
    temperature:  float,
    tds:          float,
    turbidity:    float,
    wqi_score:    float | None,
    anomaly_flag: int,
    mode:         str,
    sensor_errors: list[str],
    breakdown:    dict,
) -> dict[str, Any]:
    """Assemble the MongoDB telemetry document with a UTC-aware timestamp."""
    return {
        "timestamp":     datetime.now(timezone.utc),   # always UTC
        "ph":            ph,
        "temperature":   temperature,
        "tds":           tds,
        "turbidity":     turbidity,
        "wqi_score":     wqi_score,
        "anomaly_flag":  anomaly_flag,
        "mode":          mode,
        "sensor_errors": sensor_errors,
        "breakdown":     breakdown,
    }

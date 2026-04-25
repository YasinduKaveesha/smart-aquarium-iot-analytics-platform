"""
routers/telemetry.py — POST /api/telemetry
===========================================
Manual / debug HTTP entry point. Accepts the same 4-sensor JSON payload that
the MQTT broker delivers, runs the same _process_reading() coroutine, and
returns the result to the caller.

Use cases:
  - Development testing without an MQTT broker
  - Replay script (replay_sensor.py) sending historical CSV rows
  - Automated integration tests

Pre-validation (physical sensor ranges) is performed inside _process_reading()
via mqtt_client._process_reading() → the same path as MQTT messages.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_pipeline_router
from app.models import TelemetryRequest, TelemetryResponse
from app.mqtt_client import _process_reading

router = APIRouter(tags=["telemetry"])


@router.post("/telemetry", response_model=TelemetryResponse)
async def post_telemetry(
    body: TelemetryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    pipeline_router = Depends(get_pipeline_router),
):
    """
    Accept a sensor reading via HTTP and run the full ML pipeline.
    Delegates to _process_reading() — the same coroutine used by MQTT.

    Returns the telemetry response including the authoritative server timestamp,
    WQI score, mode, breakdown, and sensor errors.
    """
    # Manually construct app_state from FastAPI's dependency injection context
    # _process_reading expects app_state.pipeline_router and app_state.db
    class _AppState:
        pass

    app_state = _AppState()
    app_state.pipeline_router = pipeline_router  # type: ignore[attr-defined]
    app_state.db              = db               # type: ignore[attr-defined]

    try:
        doc = await _process_reading(
            app_state,
            ph          = body.ph,
            temperature = body.temperature,
            tds         = body.tds,
            turbidity   = body.turbidity,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    ts = doc["timestamp"]
    return TelemetryResponse(
        timestamp            = ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
        mode                 = doc.get("mode", "COLD_START"),
        wqi_score            = doc.get("wqi_score"),
        anomaly_flag         = int(doc.get("anomaly_flag") or 0),
        days_until_adaptive  = pipeline_router._days_until_adaptive(),
        breakdown            = doc.get("breakdown") or {},
        sensor_errors        = doc.get("sensor_errors") or [],
    )

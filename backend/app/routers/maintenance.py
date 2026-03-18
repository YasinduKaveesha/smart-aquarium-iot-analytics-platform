"""
routers/maintenance.py — POST /api/maintenance/start|stop
===========================================================
Maintenance mode suppresses all WQI scoring and anomaly detection while
the aquarium owner performs a water change or cleaning.

POST /api/maintenance/start:
  - Sets maintenance_active = True in memory and MongoDB
  - Sensor validation runs on the last known readings (informational only —
    does NOT block the mode change even if sensors show poor values)

POST /api/maintenance/stop:
  - Sets maintenance_active = False
  - Starts a 10-minute STABILIZING cooldown (stabilizing_until = now + 10 min)
    so turbidity spikes from a hand-in-tank don't trigger Critical alerts
  - Returns stabilizing_until timestamp for the frontend to display
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import fetch_latest, set_maintenance
from app.dependencies import get_db, get_pipeline_router
from app.models import MaintenanceResponse

router = APIRouter(tags=["maintenance"])

_STABILIZING_MINUTES = 10


@router.post("/maintenance/start", response_model=MaintenanceResponse)
async def maintenance_start(
    db: AsyncIOMotorDatabase = Depends(get_db),
    pipeline_router = Depends(get_pipeline_router),
):
    """
    Enter maintenance mode.
    Sensor readings received while maintenance_active=True return mode=MAINTENANCE
    with wqi_score=None.
    """
    # Update in-memory state (instant effect on next pipeline call)
    pipeline_router.maintenance_active = True
    # Persist to MongoDB (survives server restart)
    await set_maintenance(db, active=True, stabilizing_until=None)

    # Validation is informational — run on last known values but never block
    validation = _validate_latest(await fetch_latest(db), pipeline_router)

    return MaintenanceResponse(
        status            = "maintenance_active",
        stabilizing_until = None,
        validation        = validation,
    )


@router.post("/maintenance/stop", response_model=MaintenanceResponse)
async def maintenance_stop(
    db: AsyncIOMotorDatabase = Depends(get_db),
    pipeline_router = Depends(get_pipeline_router),
):
    """
    Exit maintenance mode.
    Starts a 10-minute STABILIZING cooldown so post-cleaning sensor noise
    (turbidity, TDS spikes) does not trigger false Critical anomaly alerts.
    """
    pipeline_router.maintenance_active = False

    stab_until = datetime.now(timezone.utc) + timedelta(minutes=_STABILIZING_MINUTES)
    stab_str   = stab_until.isoformat()

    await set_maintenance(db, active=False, stabilizing_until=stab_str)

    validation = _validate_latest(await fetch_latest(db), pipeline_router)

    return MaintenanceResponse(
        status            = "stabilizing",
        stabilizing_until = stab_str,
        validation        = validation,
    )


# ── Helper ───────────────────────────────────────────────────────────────────

def _validate_latest(latest: dict | None, pipeline_router) -> dict:
    """
    Run SensorValidator on the most recently stored sensor readings.
    Returns {is_valid: bool, errors: list[str]}.
    If there are no stored readings yet, returns is_valid=True with no errors.
    """
    if latest is None:
        return {"is_valid": True, "errors": []}

    ph          = latest.get("ph")
    temperature = latest.get("temperature")
    tds         = latest.get("tds")
    turbidity   = latest.get("turbidity")

    if any(v is None for v in (ph, temperature, tds, turbidity)):
        return {"is_valid": True, "errors": []}

    result = pipeline_router.validator.validate(
        ph=ph, temperature=temperature, tds=tds, turbidity=turbidity
    )
    return {"is_valid": result.is_valid, "errors": result.errors}

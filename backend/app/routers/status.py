"""
routers/status.py — GET /api/status
=====================================
Dashboard-load endpoint. Returns system state: current mode, install date,
maintenance flags, cooldown status, and latest WQI reading.

Mode derivation priority (mirrors pipeline_router.py logic):
  1. maintenance_active     → MAINTENANCE
  2. stabilizing_until      → STABILIZING (if not yet expired)
  3. days_until_adaptive    → COLD_START  (if tank age < 14 days)
  4. otherwise              → ADAPTIVE
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import fetch_system_state, fetch_latest, set_maintenance
from app.dependencies import get_db, get_pipeline_router
from app.models import StatusResponse

router = APIRouter(tags=["status"])


@router.get("/status", response_model=StatusResponse)
async def get_status(
    db: AsyncIOMotorDatabase = Depends(get_db),
    pipeline_router = Depends(get_pipeline_router),
):
    """
    Return current system status.
    Reads system_state from MongoDB and the most recent telemetry row.
    Mode is computed fresh on every call.
    """
    state  = await fetch_system_state(db)
    latest = await fetch_latest(db)

    # ── Derive current mode ──────────────────────────────────────────────────
    stab_str: str | None = None
    if pipeline_router.maintenance_active:
        mode = "MAINTENANCE"
    else:
        # Check stabilizing cooldown
        stab_raw = state.get("stabilizing_until")
        if stab_raw is not None:
            stab_until = datetime.fromisoformat(str(stab_raw))
            if stab_until.tzinfo is None:
                stab_until = stab_until.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < stab_until:
                mode = "STABILIZING"
                stab_str = stab_until.isoformat()
            else:
                # Cooldown expired — clear stale value from DB
                await set_maintenance(db, active=False, stabilizing_until=None)
                mode = "ADAPTIVE" if pipeline_router._days_until_adaptive() == 0 else "COLD_START"
        else:
            mode = "ADAPTIVE" if pipeline_router._days_until_adaptive() == 0 else "COLD_START"

    days_left = pipeline_router._days_until_adaptive()

    return StatusResponse(
        mode                 = mode,
        days_until_adaptive  = days_left,
        install_date         = str(state.get("install_date", "")),
        maintenance_active   = bool(state.get("maintenance_active", False)),
        stabilizing_until    = stab_str,
        latest_wqi           = latest.get("wqi_score") if latest else None,
        latest_anomaly_flag  = int(latest.get("anomaly_flag") or 0) if latest else 0,
    )

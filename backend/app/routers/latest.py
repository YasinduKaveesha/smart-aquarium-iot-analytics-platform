"""
routers/latest.py — GET /api/latest
=====================================
Returns the most recent telemetry document with full WQI breakdown.
The frontend polls this endpoint every 30 seconds for the "current reading"
display (WQI gauge, parameter cards, breakdown panel).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import fetch_latest
from app.dependencies import get_db
from app.models import LatestResponse

router = APIRouter(tags=["latest"])


@router.get("/latest", response_model=LatestResponse)
async def get_latest(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Return the most recent telemetry document.
    If no readings have been stored yet (empty DB), returns a zero-state response.
    """
    doc = await fetch_latest(db)

    if doc is None:
        # Empty database — return a neutral default so the frontend doesn't crash
        return LatestResponse(
            timestamp     = "",
            ph            = None,
            temperature   = None,
            tds           = None,
            turbidity     = None,
            wqi_score     = None,
            anomaly_flag  = 0,
            mode          = "COLD_START",
            breakdown     = {},
            sensor_errors = [],
        )

    return LatestResponse(
        timestamp     = doc["timestamp"].isoformat() if hasattr(doc["timestamp"], "isoformat") else str(doc["timestamp"]),
        ph            = doc.get("ph"),
        temperature   = doc.get("temperature"),
        tds           = doc.get("tds"),
        turbidity     = doc.get("turbidity"),
        wqi_score     = doc.get("wqi_score"),
        anomaly_flag  = int(doc.get("anomaly_flag") or 0),
        mode          = doc.get("mode", "COLD_START"),
        breakdown     = doc.get("breakdown") or {},
        sensor_errors = doc.get("sensor_errors") or [],
    )

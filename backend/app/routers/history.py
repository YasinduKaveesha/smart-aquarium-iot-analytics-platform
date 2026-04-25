"""
routers/history.py — GET /api/history + GET /api/anomalies
============================================================
GET /api/history?days=7
  Returns the last N days of telemetry rows for time-series charts.
  Used by SensorAnalytics (multi-parameter trends) and WQI history sparklines.

GET /api/anomalies?limit=50
  Returns clustered anomaly events.
  Consecutive anomaly rows (gap < 7.5 min) are grouped into a single event.
  'persistence' = number of consecutive anomaly readings in the cluster.

Clustering logic:
  - Sort anomaly rows ASC by timestamp
  - Start a new cluster if the gap to the previous row exceeds 7.5 minutes
    (one 5-min interval + 2.5 min buffer for occasional delayed writes)
  - Each cluster → one AnomalyEvent with the first row's data + persistence count
"""

from __future__ import annotations

from datetime import timedelta, timezone, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import fetch_history, fetch_anomalies
from app.dependencies import get_db
from app.models import AnomalyEvent, HistoryRecord

router = APIRouter(tags=["history"])

_CLUSTER_GAP_MINUTES = 7.5


# ── History endpoint ─────────────────────────────────────────────────────────

@router.get("/history", response_model=list[HistoryRecord])
async def get_history(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Return telemetry rows from the last `days` days (default 7), ordered ASC.
    Used by the Sensor Analytics and WQI trend charts.
    """
    rows = await fetch_history(db, days=days)
    return [_row_to_history(r) for r in rows]


def _row_to_history(doc: dict[str, Any]) -> HistoryRecord:
    ts = doc.get("timestamp")
    return HistoryRecord(
        timestamp    = ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
        ph           = doc.get("ph"),
        temperature  = doc.get("temperature"),
        tds          = doc.get("tds"),
        turbidity    = doc.get("turbidity"),
        wqi_score    = doc.get("wqi_score"),
        anomaly_flag = doc.get("anomaly_flag"),
        mode         = doc.get("mode"),
    )


# ── Anomalies endpoint ───────────────────────────────────────────────────────

@router.get("/anomalies", response_model=list[AnomalyEvent])
async def get_anomalies(
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Return clustered anomaly events, most recent first.
    Each event groups consecutive anomaly readings into a single entry
    with a `persistence` count showing how long the anomaly lasted.
    """
    # Fetch more raw rows than the requested limit so clustering can work
    # correctly (a 50-event limit would otherwise truncate mid-cluster)
    raw = await fetch_anomalies(db, limit=limit * 10)
    events = _cluster_anomalies(raw)
    # Return most-recent-first, capped at requested limit
    return events[-limit:][::-1]


def _cluster_anomalies(rows: list[dict[str, Any]]) -> list[AnomalyEvent]:
    """
    Group consecutive anomaly rows into events.

    Two rows belong to the same cluster if their timestamps are within
    CLUSTER_GAP_MINUTES of each other (strict consecutive grouping with
    a small tolerance for delayed writes).
    """
    if not rows:
        return []

    events: list[AnomalyEvent] = []
    cluster: list[dict[str, Any]] = [rows[0]]

    for row in rows[1:]:
        prev_ts = cluster[-1].get("timestamp")
        curr_ts = row.get("timestamp")

        # Ensure timezone-aware
        if prev_ts and prev_ts.tzinfo is None:
            prev_ts = prev_ts.replace(tzinfo=timezone.utc)
        if curr_ts and curr_ts.tzinfo is None:
            curr_ts = curr_ts.replace(tzinfo=timezone.utc)

        gap_minutes = (
            (curr_ts - prev_ts).total_seconds() / 60
            if prev_ts and curr_ts else float("inf")
        )

        if gap_minutes <= _CLUSTER_GAP_MINUTES:
            cluster.append(row)
        else:
            events.append(_summarise_cluster(cluster))
            cluster = [row]

    if cluster:
        events.append(_summarise_cluster(cluster))

    return events


def _summarise_cluster(cluster: list[dict[str, Any]]) -> AnomalyEvent:
    """Summarise a cluster of anomaly rows into a single AnomalyEvent."""
    first = cluster[0]
    ts = first.get("timestamp")

    return AnomalyEvent(
        timestamp    = ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
        ph           = first.get("ph"),
        temperature  = first.get("temperature"),
        tds          = first.get("tds"),
        turbidity    = first.get("turbidity"),
        wqi_score    = first.get("wqi_score"),
        anomaly_flag = int(first.get("anomaly_flag") or 1),
        persistence  = len(cluster),
        mode         = first.get("mode"),
    )

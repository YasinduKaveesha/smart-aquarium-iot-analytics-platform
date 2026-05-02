"""
database.py — Motor async MongoDB client + collection helpers
=============================================================
All timestamps stored/returned as UTC-aware datetime objects.
Never use naive datetime anywhere in this module.

Collections:
  telemetry    — append-only time-series of sensor readings + ML output
  system_state — single document (_id=1) tracking install_date, maintenance flags

Usage:
    from app.database import init_indexes, get_or_create_system_state, ...
    # These are called from main.py lifespan and from routers/services.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING


# ── Index initialisation ─────────────────────────────────────────────────────

async def init_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create indexes idempotently on startup."""
    # Fast time-range queries for history charts
    await db.telemetry.create_index([("timestamp", DESCENDING)])
    # Anomaly queries always need recent events — compound index
    await db.telemetry.create_index(
        [("anomaly_flag", ASCENDING), ("timestamp", DESCENDING)]
    )
    # system_state is keyed by _id=1 (_id is always unique in MongoDB — no extra index needed)


# ── system_state helpers ─────────────────────────────────────────────────────

async def get_or_create_system_state(db: AsyncIOMotorDatabase) -> dict[str, Any]:
    """
    Return the system_state document.
    If it does not exist yet (first boot), insert it using INSTALL_DATE from config.
    """
    from app.config import settings  # local import avoids circular dep

    doc = await db.system_state.find_one({"_id": 1})
    if doc is None:
        doc = {
            "_id":               1,
            "install_date":      settings.INSTALL_DATE,   # "YYYY-MM-DD" string
            "maintenance_active": False,
            "stabilizing_until": None,
            "last_retrain_date": None,
            "last_mode":         "COLD_START",
        }
        await db.system_state.insert_one(doc)
    return doc


async def fetch_system_state(db: AsyncIOMotorDatabase) -> dict[str, Any]:
    """Read the single system_state document. Assumes it already exists."""
    doc = await db.system_state.find_one({"_id": 1})
    return doc or {}


async def set_maintenance(
    db: AsyncIOMotorDatabase,
    active: bool,
    stabilizing_until: str | None = None,
) -> None:
    """Update maintenance_active and optional stabilizing_until in system_state."""
    await db.system_state.update_one(
        {"_id": 1},
        {"$set": {
            "maintenance_active": active,
            "stabilizing_until":  stabilizing_until,
        }},
    )


async def update_last_mode(db: AsyncIOMotorDatabase, mode: str) -> None:
    """Track last known pipeline mode for observability."""
    await db.system_state.update_one(
        {"_id": 1},
        {"$set": {"last_mode": mode}},
    )


# ── Normalize raw ESP32 docs to enriched format ─────────────────────────────

def normalize_telemetry_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize a telemetry document to the enriched format.
    Handles both:
      - Enriched docs (from backend ML pipeline): have 'timestamp', 'temperature', etc.
      - Raw ESP32 docs (from mqtt_to_mongo.py): have 'server_time', 'temperature_c', etc.
    """
    if "timestamp" in doc:
        return doc  # already enriched format

    # Raw ESP32 format — map fields
    server_time = doc.get("server_time")
    # Ensure timezone-aware
    if server_time and isinstance(server_time, datetime) and server_time.tzinfo is None:
        server_time = server_time.replace(tzinfo=timezone.utc)

    return {
        "_id":           doc.get("_id"),
        "timestamp":     server_time,
        "ph":            None,
        "temperature":   doc.get("temperature_c"),
        "tds":           doc.get("tds_ppm", 0),
        "turbidity":     doc.get("turbidity_ntu", doc.get("turbidity_voltage", 0)),
        "wqi_score":     None,
        "anomaly_flag":  0,
        "mode":          "SENSOR_ERROR",
        "sensor_errors": ["pH sensor not connected — no data received"],
        "breakdown":     {},
    }


# ── telemetry helpers ────────────────────────────────────────────────────────

async def insert_telemetry(db: AsyncIOMotorDatabase, doc: dict[str, Any]) -> str:
    """
    Insert one telemetry document.
    timestamp must be a UTC-aware datetime (set by caller before calling this).
    Returns the inserted _id as a string.
    """
    result = await db.telemetry.insert_one(doc)
    return str(result.inserted_id)


async def fetch_latest(db: AsyncIOMotorDatabase) -> dict[str, Any] | None:
    """Return the single most recent telemetry document, or None if empty.
    Checks both enriched docs (timestamp) and raw ESP32 docs (server_time)."""
    # Try enriched docs first (have ML pipeline output)
    doc = await db.telemetry.find_one(
        {"timestamp": {"$exists": True}},
        sort=[("timestamp", DESCENDING)],
    )
    # Also check raw ESP32 docs
    raw_doc = await db.telemetry.find_one(
        {"server_time": {"$exists": True}, "timestamp": {"$exists": False}},
        sort=[("server_time", DESCENDING)],
    )

    if doc is None and raw_doc is None:
        return None

    # Pick the most recent between enriched and raw
    if doc is not None and raw_doc is not None:
        enriched_ts = doc.get("timestamp")
        raw_ts = raw_doc.get("server_time")
        if enriched_ts and raw_ts:
            if enriched_ts.tzinfo is None:
                enriched_ts = enriched_ts.replace(tzinfo=timezone.utc)
            if raw_ts.tzinfo is None:
                raw_ts = raw_ts.replace(tzinfo=timezone.utc)
            if raw_ts > enriched_ts:
                return normalize_telemetry_doc(raw_doc)
        return doc
    if raw_doc is not None:
        return normalize_telemetry_doc(raw_doc)
    return doc


async def fetch_history(
    db: AsyncIOMotorDatabase,
    days: int = 7,
) -> list[dict[str, Any]]:
    """
    Return telemetry rows from the last `days` days, ordered ASC.
    Handles both enriched docs (timestamp) and raw ESP32 docs (server_time).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Fetch enriched docs
    cursor_enriched = db.telemetry.find(
        {"timestamp": {"$gte": cutoff}},
        sort=[("timestamp", ASCENDING)],
    )
    enriched = await cursor_enriched.to_list(length=None)

    # Fetch raw ESP32 docs
    cursor_raw = db.telemetry.find(
        {"server_time": {"$gte": cutoff}, "timestamp": {"$exists": False}},
        sort=[("server_time", ASCENDING)],
    )
    raw = await cursor_raw.to_list(length=None)

    # Normalize raw docs and merge
    normalized_raw = [normalize_telemetry_doc(r) for r in raw]
    all_docs = enriched + normalized_raw

    # Sort by timestamp
    def get_ts(d: dict) -> datetime:
        ts = d.get("timestamp")
        if ts is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if ts.tzinfo is None:
            return ts.replace(tzinfo=timezone.utc)
        return ts

    all_docs.sort(key=get_ts)
    return all_docs


async def fetch_anomalies(
    db: AsyncIOMotorDatabase,
    limit: int = 200,
) -> list[dict[str, Any]]:
    """
    Return anomaly rows (anomaly_flag=1) ordered ASC by timestamp.
    The caller clusters these into events before returning to the frontend.
    Fetches more than the UI limit so clustering can group correctly.
    """
    cursor = db.telemetry.find(
        {"anomaly_flag": 1, "timestamp": {"$exists": True}},
        sort=[("timestamp", ASCENDING)],
        limit=limit,
    )
    return await cursor.to_list(length=None)

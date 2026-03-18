"""
forecast_cache.py — Hour-floored TTL cache for SARIMA forecast
===============================================================
SARIMA inference (get_forecast_ci) takes 2–5 seconds. We cache the result
for the entire current hour so all clients (and the 5-min telemetry loop)
share the same forecast without re-computing it.

Cache design:
  - Key = current UTC hour string "YYYY-MM-DDTHH"
  - All clients within the same hour get the same forecast
  - At the turn of a new hour the old key is gone → automatic expiry
  - _cache is replaced atomically: _cache = {key: result}
    (prevents accidental unbounded growth if logic changes later)

Thread / concurrency safety:
  - asyncio.Lock prevents multiple concurrent callers from all triggering
    an expensive forecast computation simultaneously (thundering-herd).
  - Double-checked locking pattern used (check before lock + check after lock).

DataFrame column names from SARIMAForecaster.get_forecast_ci():
  ph_ci   → 'mean', 'lower ph',   'upper ph'
  temp_ci → 'mean', 'lower temp', 'upper temp'
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any


# Module-level cache: at most one key at any given hour
_cache: dict[str, dict[str, Any]] = {}
_lock  = asyncio.Lock()


def _cache_key() -> str:
    """Return the current UTC hour as a string key, e.g. '2026-03-18T14'."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H")


async def get_forecast(forecaster) -> dict[str, Any]:
    """
    Return the cached forecast for the current hour, computing it if needed.

    Parameters
    ----------
    forecaster : SARIMAForecaster
        The shared forecaster instance from app.state.pipeline_router.forecaster

    Returns
    -------
    dict with keys:
        ph_forecast   : list of {timestamp, mean, lower, upper}
        temp_forecast : list of {timestamp, mean, lower, upper}
    """
    global _cache

    key = _cache_key()
    if key in _cache:
        return _cache[key]

    async with _lock:
        # Double-check: another coroutine may have populated the cache
        # while we were waiting for the lock
        if key in _cache:
            return _cache[key]

        loop = asyncio.get_running_loop()
        ph_ci, temp_ci = await loop.run_in_executor(
            None,
            lambda: forecaster.get_forecast_ci(steps=24),
        )
        result = _build_forecast_response(ph_ci, temp_ci)
        # Atomic replacement — prevents accidental growth
        _cache = {key: result}
        return result


def _build_forecast_response(ph_ci, temp_ci) -> dict[str, Any]:
    """
    Convert SARIMAForecaster DataFrames to serialisable lists of ForecastPoint dicts.

    ph_ci columns  : 'mean', 'lower ph',   'upper ph'
    temp_ci columns: 'mean', 'lower temp', 'upper temp'

    Timestamps: now + (i+1) hours, ISO 8601 UTC.
    """
    now = datetime.now(timezone.utc)
    ph_forecast   = []
    temp_forecast = []

    for i, (_, row) in enumerate(ph_ci.iterrows()):
        ts = (now + timedelta(hours=i + 1)).isoformat()
        ph_forecast.append({
            "timestamp": ts,
            "mean":  round(float(row["mean"]),       4),
            "lower": round(float(row["lower ph"]),   4),
            "upper": round(float(row["upper ph"]),   4),
        })

    for i, (_, row) in enumerate(temp_ci.iterrows()):
        ts = (now + timedelta(hours=i + 1)).isoformat()
        temp_forecast.append({
            "timestamp": ts,
            "mean":  round(float(row["mean"]),        4),
            "lower": round(float(row["lower temp"]),  4),
            "upper": round(float(row["upper temp"]),  4),
        })

    return {"ph_forecast": ph_forecast, "temp_forecast": temp_forecast}

"""
chat_tools.py — Tool definitions for the LLM agent
====================================================
Each tool is a thin async function that calls the SAME helpers used by the
existing FastAPI endpoints (database.py + pipeline_router). This guarantees
the chatbot's answers are always consistent with the dashboard.

Adding a new tool:
  1. Write an async function `tool_<name>(db, pipeline_router, **params)`
  2. Add its JSON schema to TOOL_SCHEMAS (OpenAI format)
  3. Register it in DISPATCH
"""

from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean, median, stdev
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import (
    fetch_anomalies,
    fetch_history,
    fetch_latest,
    fetch_system_state,
)
from app.services.forecast_cache import get_forecast


# Safe operating thresholds for Neon Tetra (used to enrich LLM context)
SAFE_THRESHOLDS: dict[str, dict] = {
    "ph":          {"min": 6.0, "max": 7.0, "unit": "",    "note": "Neon Tetra optimal range"},
    "temperature": {"min": 22,  "max": 26,  "unit": "°C",  "note": "Neon Tetra optimal range"},
    "tds":         {"min": 50,  "max": 150, "unit": "ppm", "note": "Soft freshwater target"},
    "turbidity":   {"min": 0,   "max": 5,   "unit": "NTU", "note": "Clear water standard"},
}


def _threshold_violations(doc: dict) -> list[dict]:
    """Return list of parameters currently outside safe range."""
    violations = []
    for param, bounds in SAFE_THRESHOLDS.items():
        val = doc.get(param)
        if val is None:
            continue
        lo, hi = bounds["min"], bounds["max"]
        if val < lo:
            violations.append({"parameter": param, "value": val, "threshold": f"min {lo}{bounds['unit']}", "direction": "below"})
        elif val > hi:
            violations.append({"parameter": param, "value": val, "threshold": f"max {hi}{bounds['unit']}", "direction": "above"})
    return violations


# ── Tool implementations ─────────────────────────────────────────────────────

async def tool_get_latest_reading(db: AsyncIOMotorDatabase, **_) -> dict[str, Any]:
    doc = await fetch_latest(db)
    if doc is None:
        return {"error": "No telemetry recorded yet."}
    return {
        "timestamp":          doc["timestamp"].isoformat() if hasattr(doc.get("timestamp"), "isoformat") else str(doc.get("timestamp")),
        "ph":                 doc.get("ph"),
        "temperature":        doc.get("temperature"),
        "tds":                doc.get("tds"),
        "turbidity":          doc.get("turbidity"),
        "wqi_score":          doc.get("wqi_score"),
        "anomaly_flag":       doc.get("anomaly_flag"),
        "mode":               doc.get("mode"),
        "sensor_errors":      doc.get("sensor_errors") or [],
        "safe_thresholds":    SAFE_THRESHOLDS,
        "threshold_violations": _threshold_violations(doc),
    }


async def tool_get_history(
    db: AsyncIOMotorDatabase,
    days: int = 1,
    parameter: str = "all",
    **_,
) -> dict[str, Any]:
    """
    Return summary stats + downsampled series for one parameter (or all).
    parameter ∈ {"ph","temperature","tds","turbidity","wqi_score","all"}
    days ∈ [1, 30]
    """
    days = max(1, min(int(days), 30))
    rows = await fetch_history(db, days=days)
    if not rows:
        return {"error": "No history available."}

    keys = ["ph", "temperature", "tds", "turbidity", "wqi_score"] if parameter == "all" else [parameter]
    out: dict[str, Any] = {"days": days, "row_count": len(rows), "parameters": {}}

    for k in keys:
        values = [r.get(k) for r in rows if r.get(k) is not None]
        if not values:
            out["parameters"][k] = {"available": False}
            continue
        out["parameters"][k] = {
            "available": True,
            "min":    round(min(values), 3),
            "max":    round(max(values), 3),
            "mean":   round(mean(values), 3),
            "median": round(median(values), 3),
            "std":    round(stdev(values), 3) if len(values) > 1 else 0.0,
            "first":  round(values[0], 3),
            "last":   round(values[-1], 3),
            "trend":  "rising" if values[-1] > values[0] else ("falling" if values[-1] < values[0] else "flat"),
        }
    return out


async def tool_get_forecast(_db: AsyncIOMotorDatabase, pipeline_router, **__) -> dict[str, Any]:
    data = await get_forecast(pipeline_router.forecaster)

    def _summarise(name: str, arr: list[dict]) -> dict:
        if not arr:
            return {"available": False}
        means  = [p["mean"]  for p in arr]
        lowers = [p["lower"] for p in arr]
        uppers = [p["upper"] for p in arr]
        return {
            "available":     True,
            "horizon_hours": len(arr),
            "mean_min":      round(min(means), 3),
            "mean_max":      round(max(means), 3),
            "lower_ci_min":  round(min(lowers), 3),
            "upper_ci_max":  round(max(uppers), 3),
            "first_hour":    arr[0],
            "last_hour":     arr[-1],
        }
    return {
        "ph":   _summarise("ph",   data.get("ph_forecast", [])),
        "temp": _summarise("temp", data.get("temp_forecast", [])),
        "note": "pH lower CI = pessimistic acid-crash bound. Temp upper CI = pessimistic overheating bound.",
    }


async def tool_get_anomalies(db: AsyncIOMotorDatabase, limit: int = 10, **_) -> dict[str, Any]:
    limit = max(1, min(int(limit), 50))
    rows = await fetch_anomalies(db, limit=limit * 5)
    out = []
    for r in rows[:limit]:
        event: dict[str, Any] = {
            "timestamp":   r["timestamp"].isoformat() if hasattr(r.get("timestamp"), "isoformat") else str(r.get("timestamp")),
            "ph":          r.get("ph"),
            "temperature": r.get("temperature"),
            "tds":         r.get("tds"),
            "turbidity":   r.get("turbidity"),
            "wqi_score":   r.get("wqi_score"),
        }
        event["threshold_violations"] = _threshold_violations(r)
        out.append(event)
    return {"count": len(out), "events": out, "safe_thresholds": SAFE_THRESHOLDS}


async def tool_get_status(db: AsyncIOMotorDatabase, pipeline_router, **_) -> dict[str, Any]:
    state = await fetch_system_state(db)
    latest = await fetch_latest(db)
    days_left = pipeline_router._days_until_adaptive()
    install_date_str = str(state.get("install_date", ""))
    days_since_install = None
    try:
        install = datetime.fromisoformat(install_date_str)
        if install.tzinfo is None:
            install = install.replace(tzinfo=timezone.utc)
        days_since_install = (datetime.now(timezone.utc) - install).days
    except Exception:
        pass
    return {
        "mode":                "ADAPTIVE" if days_left == 0 else "COLD_START",
        "days_until_adaptive": days_left,
        "install_date":        install_date_str,
        "days_since_install":  days_since_install,
        "maintenance_active":  bool(state.get("maintenance_active", False)),
        "stabilizing_until":   state.get("stabilizing_until"),
        "latest_wqi":          latest.get("wqi_score") if latest else None,
        "latest_anomaly_flag": int(latest.get("anomaly_flag") or 0) if latest else 0,
    }


async def tool_explain_wqi(db: AsyncIOMotorDatabase, **_) -> dict[str, Any]:
    """Break down the WQI formula with the latest reading's component scores."""
    doc = await fetch_latest(db)
    if doc is None:
        return {"error": "No telemetry recorded yet."}
    return {
        "formula":   "WQI = (pH × 0.35) + (TDS × 0.35) + (Turbidity × 0.20) + (Temperature × 0.10)",
        "weights":   {"ph": 0.35, "tds": 0.35, "turbidity": 0.20, "temperature": 0.10},
        "current_breakdown": doc.get("breakdown") or {},
        "current_wqi":   doc.get("wqi_score"),
        "current_mode":  doc.get("mode"),
        "anomaly_flag":  doc.get("anomaly_flag"),
        "ideal_ranges": {
            "ph":          "6.0 – 7.0 (Neon Tetra)",
            "temperature": "22 – 26 °C",
            "tds":         "50 – 150 ppm",
            "turbidity":   "0 – 5 NTU",
        },
        "wqi_bands": {
            "85-100": "Excellent",
            "70-84":  "Good",
            "50-69":  "Fair",
            "30-49":  "Poor",
            "0-29":   "Critical",
        },
    }


async def tool_set_dashboard_view(
    page: str,
    filter_params: dict | None = None,
    **_,
) -> dict[str, Any]:
    """Navigate the frontend to a specific route with optional chart filters."""
    valid_pages = {
        "/", "/simple",
        "/advanced/history", "/advanced/forecast",
        "/advanced/anomalies", "/advanced/map", "/advanced/correlation",
    }
    if page not in valid_pages:
        return {"error": f"Unknown page '{page}'. Valid pages: {sorted(valid_pages)}"}
    return {"__navigate__": {"page": page, "filter_params": filter_params or {}}}


# ── OpenAI-format tool schemas (sent to Ollama) ──────────────────────────────

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_latest_reading",
            "description": "Get the most recent sensor reading (pH, temperature, TDS, turbidity) and computed WQI score. Use this when the user asks about current state, 'right now', 'what is my pH', etc.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_history",
            "description": "Get summary statistics (min, max, mean, median, std, trend) for sensor readings over the last N days. Use for trend questions, comparisons, 'this week', 'past 24 hours'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days":      {"type": "integer", "description": "Lookback window in days (1-30). Default 1.", "minimum": 1, "maximum": 30},
                    "parameter": {"type": "string", "enum": ["ph", "temperature", "tds", "turbidity", "wqi_score", "all"], "description": "Which sensor to summarise. Use 'all' to compare every parameter."},
                },
                "required": ["days", "parameter"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "Get the 24-hour SARIMA forecast for pH (lower CI = acid-crash risk) and temperature (upper CI = overheating risk). Use for 'will X happen', 'next 24 hours', 'forecast', 'predict'.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "List recent anomaly events detected by Isolation Forest. Use when the user asks about anomalies, alerts, unusual readings, problems.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max events to return (1-50). Default 10.", "minimum": 1, "maximum": 50}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_status",
            "description": "Get system mode (ADAPTIVE / COLD_START / MAINTENANCE / STABILIZING), days since install, days until adaptive mode unlocks, maintenance flags. Use for questions about system state, calibration, 'when will AI activate'.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "explain_wqi",
            "description": "Get the WQI formula, weights, ideal ranges per parameter, severity bands (Excellent/Good/Fair/Poor/Critical), AND the current reading's per-component breakdown. Use for 'why is WQI X', 'how is WQI calculated', 'what does WQI mean'.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_dashboard_view",
            "description": "Navigate the user's dashboard to a specific page and optionally pre-filter the charts. ALWAYS call this when the user says 'show me', 'take me to', 'navigate to', 'open the forecast', 'go to anomalies', or requests a view that matches a specific page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page": {
                        "type": "string",
                        "enum": ["/", "/simple", "/advanced/history", "/advanced/forecast", "/advanced/anomalies", "/advanced/map", "/advanced/correlation"],
                        "description": "The dashboard route to navigate to.",
                    },
                    "filter_params": {
                        "type": "object",
                        "description": "Optional chart filter state, e.g. {\"days\": 7, \"parameter\": \"ph\"}.",
                    },
                },
                "required": ["page"],
            },
        },
    },
]


# ── Dispatcher ───────────────────────────────────────────────────────────────

DISPATCH = {
    "get_latest_reading":  tool_get_latest_reading,
    "get_history":         tool_get_history,
    "get_forecast":        tool_get_forecast,
    "get_anomalies":       tool_get_anomalies,
    "get_status":          tool_get_status,
    "explain_wqi":         tool_explain_wqi,
    "set_dashboard_view":  tool_set_dashboard_view,
}


async def dispatch(
    name: str,
    arguments: dict[str, Any],
    db: AsyncIOMotorDatabase,
    pipeline_router,
) -> Any:
    """Execute a tool by name. Returns the raw result (will be JSON-serialised by caller)."""
    fn = DISPATCH.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await fn(db=db, pipeline_router=pipeline_router, **(arguments or {}))
    except Exception as exc:
        return {"error": f"Tool '{name}' failed: {exc}"}

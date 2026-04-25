"""
routers/chat.py — POST /api/chat
=================================
LLM-powered conversational agent for aquarium data exploration.
Uses Google Gemini 2.0 Flash (google-genai SDK) with live MongoDB context
injected per request.

Requires GEMINI_API_KEY in backend/.env
Get a free key at: https://aistudio.google.com/app/apikey
"""

from __future__ import annotations

import asyncio
import statistics
from datetime import date
from typing import Any

from google import genai
from google.genai import types as genai_types
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.config import settings
from app.database import (
    fetch_anomalies,
    fetch_history,
    fetch_latest,
    fetch_system_state,
)
from app.dependencies import get_db

router = APIRouter(tags=["chat"])

# ── Pydantic models ──────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    current_page: str = ""

class ChatResponse(BaseModel):
    response: str
    context_summary: dict[str, Any]

# ── Helpers ──────────────────────────────────────────────────────────────────

def _wqi_label(score: float | None) -> str:
    if score is None:  return "Unknown"
    if score >= 85:    return "Excellent"
    if score >= 70:    return "Good"
    if score >= 50:    return "Fair"
    if score >= 30:    return "Poor"
    return "Critical"

def _stats(records: list[dict], key: str) -> dict:
    vals = [r[key] for r in records if r.get(key) is not None]
    if not vals:
        return {"avg": "N/A", "min": "N/A", "max": "N/A"}
    return {
        "avg": round(statistics.mean(vals), 2),
        "min": round(min(vals), 2),
        "max": round(max(vals), 2),
    }

# ── Context builder ──────────────────────────────────────────────────────────

async def _build_context(db: AsyncIOMotorDatabase) -> tuple[str, dict]:
    latest    = await fetch_latest(db)
    history   = await fetch_history(db, days=7)
    anomalies = await fetch_anomalies(db, limit=20)
    state     = await fetch_system_state(db)

    ph    = latest.get("ph")          if latest else None
    temp  = latest.get("temperature") if latest else None
    tds   = latest.get("tds")         if latest else None
    turb  = latest.get("turbidity")   if latest else None
    wqi   = latest.get("wqi_score")   if latest else None
    mode  = latest.get("mode", "UNKNOWN") if latest else "UNKNOWN"
    anom  = int(latest.get("anomaly_flag") or 0) if latest else 0
    breakdown     = (latest.get("breakdown") or {}) if latest else {}
    sensor_errors = (latest.get("sensor_errors") or []) if latest else []
    ts    = str(latest.get("timestamp", ""))[:19] if latest else "—"

    install_date_str = state.get("install_date", "unknown") if state else "unknown"
    maint_active = bool(state.get("maintenance_active")) if state else False

    try:
        tank_age_days = (date.today() - date.fromisoformat(str(install_date_str))).days
    except (ValueError, TypeError):
        tank_age_days = "unknown"

    ph_s  = _stats(history, "ph")
    tmp_s = _stats(history, "temperature")
    tds_s = _stats(history, "tds")
    trb_s = _stats(history, "turbidity")
    wqi_s = _stats(history, "wqi_score")

    n_anomalies = len(anomalies)
    anomaly_lines = ""
    for a in anomalies[-5:]:
        t = str(a.get("timestamp", ""))[:16]
        anomaly_lines += (
            f"\n  [{t}] pH={a.get('ph')}  Temp={a.get('temperature')}°C"
            f"  TDS={a.get('tds')}  Turbidity={a.get('turbidity')}"
        )

    breakdown_lines = "\n".join(
        f"  {k}: {round(v, 1)}" for k, v in breakdown.items()
    ) or "  Not available"

    context = f"""
LIVE TANK STATE (as of {ts}):
  mode: {mode}
  wqi_score: {f'{wqi:.1f}' if wqi is not None else 'N/A'} ({_wqi_label(wqi)})
  ph: {f'{ph:.2f}' if ph is not None else 'SENSOR ERROR'}
  temperature: {f'{temp:.1f} °C' if temp is not None else 'SENSOR ERROR'}
  tds: {f'{tds:.0f} ppm' if tds is not None else 'SENSOR ERROR'}
  turbidity: {f'{turb:.1f} NTU' if turb is not None else 'SENSOR ERROR'}
  anomaly_flag: {anom} ({'ANOMALY DETECTED' if anom else 'normal'})
  sensor_errors: {', '.join(sensor_errors) if sensor_errors else 'none'}
  tank_age_days: {tank_age_days}
  maintenance_active: {maint_active}
  install_date: {install_date_str}

WQI COMPONENT BREAKDOWN:
{breakdown_lines}

7-DAY HISTORICAL STATISTICS:
  pH:          avg={ph_s['avg']}   min={ph_s['min']}   max={ph_s['max']}
  temperature: avg={tmp_s['avg']}°C  min={tmp_s['min']}°C  max={tmp_s['max']}°C
  tds:         avg={tds_s['avg']} ppm  min={tds_s['min']} ppm  max={tds_s['max']} ppm
  turbidity:   avg={trb_s['avg']} NTU  min={trb_s['min']} NTU  max={trb_s['max']} NTU
  wqi_score:   avg={wqi_s['avg']}   min={wqi_s['min']}   max={wqi_s['max']}

RECENT ANOMALY EVENTS (last 7 days — {n_anomalies} total):{anomaly_lines if anomaly_lines else chr(10) + '  No anomaly events detected.'}
"""

    summary = {
        "mode": mode,
        "wqi": wqi,
        "wqi_label": _wqi_label(wqi),
        "ph": ph,
        "temperature": temp,
        "anomaly_count_7d": n_anomalies,
        "sensor_errors": sensor_errors,
        "tank_age_days": tank_age_days,
    }
    return context, summary

# ── System prompt builder ────────────────────────────────────────────────────

def _build_system_prompt(context: str, current_page: str) -> str:
    return f"""You are AquaGuard AI, an expert aquarium water quality assistant embedded in the Smart Aquarium IoT Analytics Platform dashboard.

You help both casual hobbyists and advanced aquarists understand their aquarium health using real-time sensor data and ML analytics.

CURRENT LIVE SENSOR DATA:
{context}

CURRENT DASHBOARD PAGE THE USER IS VIEWING:
{current_page if current_page else 'Unknown'}

SPECIES: Neon Tetra freshwater tropical aquarium

IDEAL PARAMETER RANGES:
- pH: 6.0-7.0 (critical below 5.5 or above 7.5)
- Temperature: 22-26°C (critical below 20°C or above 28°C)
- TDS: 50-150 ppm
- Turbidity: 0-5 NTU

WQI SCALE:
- 85-100: Excellent — no action needed
- 70-84: Good — monitor trends
- 50-69: Fair — maintenance recommended soon
- 30-49: Poor — immediate maintenance needed
- Below 30: Critical — emergency intervention required

PIPELINE MODES EXPLANATION:
- ADAPTIVE: Full ML pipeline active, tank is 14+ days old, Isolation Forest and SARIMA are running
- COLD_START: Tank under 14 days old, ML not active yet, only rule-based WQI computed
- MAINTENANCE: User triggered water change, alerts suppressed, WQI paused
- STABILIZING: 10-minute cooldown after maintenance ends, readings may not be stable yet
- SENSOR_ERROR: One or more sensors outside physical bounds, readings are unreliable

ML MODELS:
- Isolation Forest: anomaly detection on all 4 sensors together. Alert only fires after 5 consecutive anomalous readings to prevent false alarms from sensor noise.
- SARIMA: forecasts pH and temperature 24 hours ahead. Pessimistic confidence intervals used for safety (lower CI for pH = acid crash risk, upper CI for temp = overheating risk).

DASHBOARD PAGES AVAILABLE:
- /simple — Simple overview for casual users: WQI gauge, parameter cards, 7-day history
- /advanced/overview — Multi-chart advanced dashboard
- /advanced/sensor-analytics — Individual time-series for all sensors
- /advanced/wqi-breakdown — Component scores and fuzzy membership
- /advanced/forecast — 24h SARIMA forecast with confidence bands
- /advanced/anomaly-detection — Clustered anomaly events with persistence
- /advanced/fish-health — Species-specific wellness for Neon Tetras

BEHAVIOR RULES:
- Always reference the actual live sensor values in your answers. Never invent data.
- Be concise, friendly, and actionable.
- If anomaly_flag is 1, treat as urgent and say so clearly.
- If WQI is below 30, recommend immediate action urgently.
- If mode is SENSOR_ERROR, warn that readings are unreliable.
- If mode is MAINTENANCE or STABILIZING, mention tank is recovering and not to be alarmed by unusual readings.
- Always tell users which dashboard page to visit for more detail.
- Use simple language for basic questions, technical detail for advanced questions.
- Keep responses under 4 sentences for simple questions, but give full detail when asked.
- When on a specific page, give advice directly relevant to what that page shows."""

# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ChatResponse:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not set. Add it to backend/.env — get a free key at https://aistudio.google.com/app/apikey",
        )

    context_str, context_summary = await _build_context(db)
    system_prompt = _build_system_prompt(context_str, request.current_page)

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        gemini_history = [
            genai_types.Content(
                role="user" if msg.role == "user" else "model",
                parts=[genai_types.Part(text=msg.content)],
            )
            for msg in request.history[-10:]
        ]

        chat_session = client.chats.create(
            model=settings.GEMINI_MODEL,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=1024,
                temperature=0.7,
            ),
            history=gemini_history,
        )

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: chat_session.send_message(request.message)
        )
        answer = response.text

    except Exception as exc:
        err = str(exc)
        if "API_KEY_INVALID" in err or "api key" in err.lower():
            raise HTTPException(status_code=401, detail="Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env")
        if "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
            raise HTTPException(status_code=429, detail="Gemini API quota exceeded. Try again shortly.")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {err}")

    return ChatResponse(response=answer, context_summary=context_summary)

"""
models.py — Pydantic v2 request / response schemas
====================================================
Canonical naming conventions enforced here:
  - ph (lowercase), temperature, tds, turbidity
  - timestamp (ISO 8601 UTC string)
  - wqi_score (not wqi)

The frontend uses slightly different names (pH, wqi, time).
ALL renaming happens in the frontend hook adapters — never in components.
"""

from __future__ import annotations

from pydantic import BaseModel


# ── Inbound ──────────────────────────────────────────────────────────────────

class TelemetryRequest(BaseModel):
    """Body for POST /api/telemetry (manual/debug endpoint).
    MQTT messages use the same 4-field JSON payload, parsed in mqtt_client.py."""
    ph:          float
    temperature: float
    tds:         float
    turbidity:   float


# ── Outbound — telemetry ─────────────────────────────────────────────────────

class TelemetryResponse(BaseModel):
    """Response for POST /api/telemetry."""
    timestamp:           str          # ISO 8601 UTC — authoritative server timestamp
    mode:                str          # ADAPTIVE | COLD_START | MAINTENANCE | SENSOR_ERROR | STABILIZING
    wqi_score:           float | None # None during MAINTENANCE
    anomaly_flag:        int          # 1=anomaly, 0=normal
    days_until_adaptive: int
    breakdown:           dict         # full nested breakdown document
    sensor_errors:       list[str]


# ── Outbound — forecast ──────────────────────────────────────────────────────

class ForecastPoint(BaseModel):
    timestamp: str   # ISO 8601 UTC
    mean:      float
    lower:     float
    upper:     float


class ForecastResponse(BaseModel):
    """Response for GET /api/forecast — 24 hourly CI bands."""
    ph_forecast:   list[ForecastPoint]
    temp_forecast: list[ForecastPoint]


# ── Outbound — maintenance ───────────────────────────────────────────────────

class MaintenanceResponse(BaseModel):
    """Response for POST /api/maintenance/start and /stop."""
    status:            str           # "maintenance_active" | "stabilizing" | "ended"
    stabilizing_until: str | None    # ISO 8601 UTC if cooldown active, else None
    validation:        dict          # {is_valid: bool, errors: list[str]} — informational only


# ── Outbound — status ────────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    """Response for GET /api/status."""
    mode:                str
    days_until_adaptive: int
    install_date:        str          # "YYYY-MM-DD"
    maintenance_active:  bool
    stabilizing_until:   str | None
    latest_wqi:          float | None
    latest_anomaly_flag: int


# ── Outbound — latest ────────────────────────────────────────────────────────

class LatestResponse(BaseModel):
    """Response for GET /api/latest — most recent telemetry doc with full breakdown."""
    timestamp:     str
    ph:            float | None
    temperature:   float | None
    tds:           float | None
    turbidity:     float | None
    wqi_score:     float | None
    anomaly_flag:  int
    mode:          str
    breakdown:     dict
    sensor_errors: list[str] = []


# ── Outbound — history ───────────────────────────────────────────────────────

class HistoryRecord(BaseModel):
    """One row from /api/history."""
    timestamp:    str
    ph:           float | None
    temperature:  float | None
    tds:          float | None
    turbidity:    float | None
    wqi_score:    float | None
    anomaly_flag: int | None
    mode:         str | None


# ── Outbound — anomalies ─────────────────────────────────────────────────────

class AnomalyEvent(BaseModel):
    """One clustered anomaly event from /api/anomalies."""
    timestamp:    str    # ISO 8601 UTC of the first reading in the cluster
    ph:           float | None
    temperature:  float | None
    tds:          float | None
    turbidity:    float | None
    wqi_score:    float | None
    anomaly_flag: int
    persistence:  int    # number of consecutive anomaly readings in this cluster
    mode:         str | None

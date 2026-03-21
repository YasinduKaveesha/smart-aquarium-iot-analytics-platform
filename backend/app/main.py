"""
main.py — FastAPI application factory + lifespan startup/shutdown
=================================================================
Startup sequence (in order):
  1. sys.path fix   — makes project-root src/ importable
  2. MongoDB        — Motor client + index initialisation
  3. system_state   — load or seed install_date and maintenance flags
  4. ML Pipeline    — AquariumPipelineRouter (loads .joblib + .pkl models)
  5. Fail-Fast      — dry-run route call to verify all models loaded correctly
  6. MQTT           — Paho subscriber thread starts listening for sensor data

Usage:
    uvicorn backend.app.main:app --reload
    # or from project root:
    cd backend && uvicorn app.main:app --reload
"""

from __future__ import annotations

import sys
import threading
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.database import init_indexes, get_or_create_system_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── 1. sys.path — make src/ importable regardless of CWD ────────────────
    project_root = str(settings.PROJECT_ROOT)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    # ── 2. MongoDB ───────────────────────────────────────────────────────────
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = mongo_client[settings.MONGODB_DB]
    app.state.db = db
    await init_indexes(db)
    print(f"[STARTUP] MongoDB connected -> {settings.MONGODB_URL}/{settings.MONGODB_DB}")

    # ── 3. system_state ──────────────────────────────────────────────────────
    state = await get_or_create_system_state(db)
    install_date = date.fromisoformat(str(state["install_date"]))
    print(f"[STARTUP] Install date: {install_date}")

    # ── 4. ML Pipeline ───────────────────────────────────────────────────────
    from src.pipeline_router import AquariumPipelineRouter  # type: ignore[import]

    model_dir = str(settings.PROJECT_ROOT / "models")
    pipeline_router = AquariumPipelineRouter(
        install_date=install_date,
        model_dir=model_dir,
    )
    pipeline_router.maintenance_active = bool(state.get("maintenance_active", False))
    app.state.pipeline_router = pipeline_router
    print(f"[STARTUP] Pipeline router ready  (mode will be: "
          f"{'ADAPTIVE' if pipeline_router._days_until_adaptive() == 0 else 'COLD_START'})")

    # ── 5. Fail-Fast — dry-run to verify models loaded ───────────────────────
    try:
        test = pipeline_router.route(ph=7.0, temperature=25.0, tds=120.0, turbidity=3.0)
        assert test.wqi_score is not None or test.mode == "MAINTENANCE", \
            f"Unexpected dry-run result: {test}"
        print(f"[STARTUP] Dry-run OK  WQI={test.wqi_score:.1f}  mode={test.mode}")
    except Exception as exc:
        raise RuntimeError(f"[STARTUP] Pipeline dry-run failed: {exc}") from exc

    # ── 6. MQTT subscriber ───────────────────────────────────────────────────
    if settings.MQTT_BROKER:
        import asyncio
        from app.mqtt_client import build_mqtt_client

        loop = asyncio.get_running_loop()
        mqtt_client = build_mqtt_client(app.state, loop)
        try:
            mqtt_client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
            threading.Thread(target=mqtt_client.loop_forever, daemon=True, name="mqtt-loop").start()
            app.state.mqtt_client = mqtt_client
            print(f"[STARTUP] MQTT subscriber started -> {settings.MQTT_BROKER}:{settings.MQTT_PORT}"
                  f"  topic={settings.MQTT_TOPIC}")
        except Exception as exc:
            print(f"[STARTUP] MQTT connection failed (will use HTTP fallback): {exc}")
            app.state.mqtt_client = None
    else:
        app.state.mqtt_client = None
        print("[STARTUP] MQTT disabled — using HTTP POST via mqtt_to_mongo.py")

    yield  # ← server is live, handle requests

    # ── Shutdown ─────────────────────────────────────────────────────────────
    if app.state.mqtt_client is not None:
        app.state.mqtt_client.disconnect()
        print("[SHUTDOWN] MQTT disconnected")
    mongo_client.close()
    print("[SHUTDOWN] MongoDB connection closed")


# ── Application factory ──────────────────────────────────────────────────────

def create_app() -> FastAPI:
    from app.routers import (
        telemetry as telemetry_router,
        forecast  as forecast_router,
        maintenance as maintenance_router,
        status    as status_router,
        latest    as latest_router,
        history   as history_router,
    )

    application = FastAPI(
        title="AquaGuard API",
        description="Smart Aquarium IoT Analytics Platform — backend API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS — allow the React dev server (and any configured origins)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register all routers under /api
    application.include_router(telemetry_router.router,   prefix="/api")
    application.include_router(forecast_router.router,    prefix="/api")
    application.include_router(maintenance_router.router, prefix="/api")
    application.include_router(status_router.router,      prefix="/api")
    application.include_router(latest_router.router,      prefix="/api")
    application.include_router(history_router.router,     prefix="/api")

    return application


app = create_app()

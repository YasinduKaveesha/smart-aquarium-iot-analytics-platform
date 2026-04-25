"""
dependencies.py — FastAPI Depends() helpers
============================================
Both objects are stored on app.state during lifespan startup.
Never create per-request DB connections or pipeline router instances.

Usage in routers:
    from app.dependencies import get_db, get_pipeline_router
    ...
    async def my_endpoint(db=Depends(get_db), router=Depends(get_pipeline_router)):
"""

from __future__ import annotations

from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Yield the shared Motor database handle from app.state."""
    return request.app.state.db


def get_pipeline_router(request: Request):
    """Return the shared AquariumPipelineRouter instance from app.state."""
    return request.app.state.pipeline_router

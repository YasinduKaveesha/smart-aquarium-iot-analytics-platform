"""
routers/chat.py — POST /api/chat (Server-Sent Events)
======================================================
Streams the LLM's response back as SSE so the frontend can render
a typewriter effect.

Request body:
  {
    "messages": [{"role":"user","content":"..."}, ...],
    "dashboard_context": { "page": "/advanced/forecast", ... }   // optional
  }

Response: text/event-stream
  data: {"chunk": "Hello"}
  data: {"chunk": " there"}
  data: {"done": true}
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_pipeline_router
from app.models import ChatRequest
from app.services.ollama_client import run_chat


router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat_endpoint(
    body: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    pipeline_router=Depends(get_pipeline_router),
):
    async def event_stream():
        try:
            async for item in run_chat(
                messages          = [m.model_dump(exclude_none=True) for m in body.messages],
                db                = db,
                pipeline_router   = pipeline_router,
                dashboard_context = body.dashboard_context,
            ):
                if isinstance(item, dict):
                    # navigate events and any future structured events pass through as-is
                    yield f"data: {json.dumps(item)}\n\n"
                else:
                    yield f"data: {json.dumps({'chunk': item})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

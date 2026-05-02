"""
ollama_client.py — Talks to local Ollama, runs the tool-call loop
==================================================================
Ollama exposes an OpenAI-compatible endpoint at /v1/chat/completions.
We use the non-streaming variant for tool-call rounds (need full message
to detect tool_calls), then stream only the FINAL assistant message.

The tool-call loop:
  while round < CHAT_MAX_TOOL_ROUNDS:
      response = call ollama
      if response has tool_calls:
          execute each tool, append results, continue
      else:
          stream the final message and return
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx

from app.config import settings
from app.services.chat_tools import TOOL_SCHEMAS, dispatch


SYSTEM_PROMPT = """\
You are AquaGuard's analytics assistant for a smart aquarium monitoring system.
You help the user understand their aquarium's water quality through natural conversation.

You have access to tools that read live sensor data, history, forecasts, anomalies, and \
system status. ALWAYS call a tool before answering questions about specific values, \
trends, or events. Never invent numbers.

Tank species: Neon Tetra (tropical freshwater).
Sensor parameters: pH, temperature (°C), TDS (ppm), turbidity (NTU).
WQI is a 0–100 Water Quality Index (higher = better).
Safe thresholds: pH 6.0–7.0 | temperature 22–26 °C | TDS 50–150 ppm | turbidity 0–5 NTU.

Dashboard navigation:
- When the user asks to "show", "open", "navigate to", or "take me to" a specific view, \
call set_dashboard_view to route them there automatically.
- After navigating, briefly confirm what you did and give a relevant insight.

Style:
- Be concise (2-4 sentences for most answers).
- Use bullet points for multi-parameter answers.
- When you cite numbers, include units.
- When tool data includes threshold_violations, explicitly name the out-of-range parameters \
and state the safe range (e.g. "pH is 9.2, above the safe max of 7.0").
- If a tool returns an error or no data, say so honestly — do not guess.
- For decision questions ("should I do a water change?"), give a clear recommendation \
and briefly state the reasons from the tool data.

Scope restriction:
- You ONLY answer questions about AquaGuard, aquarium water quality, and aquatic care. \
If asked about anything else, respond: "I'm AquaGuard's water quality specialist — \
I can only help with aquarium monitoring questions."
"""


async def run_chat(
    messages: list[dict[str, Any]],
    db,
    pipeline_router,
    dashboard_context: dict | None = None,
) -> AsyncIterator[str | dict]:
    """
    Async generator yielding text chunks of the final assistant message.
    Performs up to CHAT_MAX_TOOL_ROUNDS tool-call iterations first.
    """
    system_msg = {"role": "system", "content": SYSTEM_PROMPT}
    if dashboard_context:
        system_msg["content"] += (
            "\n\nUser's current dashboard context:\n"
            + json.dumps(dashboard_context, indent=2)
        )

    convo: list[dict[str, Any]] = [system_msg] + messages
    url = f"{settings.OLLAMA_URL}/v1/chat/completions"

    async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT_SEC) as http:
        for round_idx in range(settings.CHAT_MAX_TOOL_ROUNDS):
            payload = {
                "model":      settings.OLLAMA_MODEL,
                "messages":   convo,
                "tools":      TOOL_SCHEMAS,
                "stream":     False,
                "max_tokens": 400,
                "temperature": 0.1,
            }
            resp = await http.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            msg = data["choices"][0]["message"]

            tool_calls = msg.get("tool_calls") or []
            if not tool_calls:
                content = msg.get("content") or ""
                async for chunk in _stream_text(content):
                    yield chunk
                return

            convo.append({
                "role":       "assistant",
                "content":    msg.get("content") or "",
                "tool_calls": tool_calls,
            })

            for call in tool_calls:
                fn_name = call["function"]["name"]
                raw_args = call["function"].get("arguments") or "{}"
                try:
                    args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except Exception:
                    args = {}
                print(f"[CHAT] tool={fn_name} args={args}")
                result = await dispatch(fn_name, args, db, pipeline_router)

                # set_dashboard_view returns a __navigate__ sentinel — emit it
                # as a separate SSE event then replace with a plain confirmation
                if isinstance(result, dict) and "__navigate__" in result:
                    yield {"navigate": result["__navigate__"]}
                    result = {
                        "navigated_to": result["__navigate__"]["page"],
                        "filter_params": result["__navigate__"].get("filter_params", {}),
                        "status": "Dashboard navigation sent.",
                    }

                convo.append({
                    "role":         "tool",
                    "tool_call_id": call.get("id", fn_name),
                    "name":         fn_name,
                    "content":      json.dumps(result, default=str),
                })

        # Hit the round cap — ask the model to summarise with what it has
        convo.append({
            "role":    "user",
            "content": "(System: tool round limit reached — please summarise your findings now without calling more tools.)",
        })
        payload = {
            "model":       settings.OLLAMA_MODEL,
            "messages":    convo,
            "stream":      False,
            "max_tokens":  400,
            "temperature": 0.1,
        }
        resp = await http.post(url, json=payload)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"].get("content") or ""
        async for chunk in _stream_text(content):
            yield chunk


async def _stream_text(text: str, chunk_size: int = 8) -> AsyncIterator[str]:
    """
    Lightweight pseudo-streaming — chunks the final text so the UI shows
    a typewriter effect. Real token streaming with Ollama + tool-calls is
    fiddly (mid-stream tool detection); this is the pragmatic compromise.
    """
    import asyncio
    for i in range(0, len(text), chunk_size):
        yield text[i:i + chunk_size]
        await asyncio.sleep(0.01)

"""
pipeline_service.py — run_in_executor wrapper for synchronous ML pipeline
==========================================================================
The src/ ML modules (statsmodels SARIMA, scikit-learn IsolationForest) are
fully synchronous. Running them directly inside async FastAPI handlers would
block the event loop.

Solution: run_in_executor dispatches the sync call to the default
ThreadPoolExecutor, allowing the event loop to handle other requests
while the ML inference runs in a thread.

Thread-safety notes:
  - AnomalyDetector.predict() and AdaptiveWQIPipeline.compute() are stateless
    after model loading — safe for concurrent calls.
  - SARIMAForecaster.get_pessimistic_forecast() calls statsmodels internally.
    Concurrent calls on the same model object are safe in practice (the objects
    are effectively read-only after fitting). The forecast cache adds an
    asyncio.Lock for the expensive get_forecast_ci() call anyway.
  - pipeline_router.maintenance_active is a simple bool attribute.
    CPython's GIL makes single-attribute assignment atomic.
"""

from __future__ import annotations

import asyncio


async def run_pipeline(
    pipeline_router,
    ph:          float | None,
    temperature: float,
    tds:         float,
    turbidity:   float,
):
    """
    Run AquariumPipelineRouter.route() in a thread pool executor so it
    does not block the async event loop.

    Returns a RouterResult dataclass with fields:
        mode, wqi_score, anomaly_flag, days_until_adaptive,
        breakdown, sensor_errors
    """
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,  # default ThreadPoolExecutor
        lambda: pipeline_router.route(
            ph=ph,
            temperature=temperature,
            tds=tds,
            turbidity=turbidity,
        ),
    )
    return result

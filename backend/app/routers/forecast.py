"""
routers/forecast.py — GET /api/forecast
=========================================
Returns 24 hourly SARIMA forecast points with 95% confidence intervals
for both pH and temperature.

The forecast computation (~2-5 seconds) is hour-floored cached:
all clients within the same UTC hour receive the same pre-computed forecast.
Cache is refreshed automatically at the start of each new hour.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_pipeline_router
from app.models import ForecastResponse
from app.services.forecast_cache import get_forecast

router = APIRouter(tags=["forecast"])


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast_endpoint(pipeline_router = Depends(get_pipeline_router)):
    """
    Return 24-hour ahead SARIMA forecast with 95% CI bands.

    pH   lower CI → worst-case acid crash
    Temp upper CI → worst-case overheating

    Cached per UTC hour — subsequent calls within the same hour are instant.
    """
    data = await get_forecast(pipeline_router.forecaster)
    return ForecastResponse(**data)

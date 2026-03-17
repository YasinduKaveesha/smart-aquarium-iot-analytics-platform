"""
Upgrade 3 — Cold-Start Guard: pipeline_router.py
==================================================
Single entry-point for the full inference pipeline.

Routes each sensor reading to the correct WQI mode based on:
  1. Sensor validity   — SENSOR_ERROR  if hardware fault detected
  2. Tank age          — COLD_START    if install_date < 14 days ago
  3. Calibrated        — ADAPTIVE      if tank has completed calibration

The 14-Day Rule
---------------
A freshly set-up tank goes through the Nitrogen Cycle (ammonia spike,
nitrite spike, stabilisation). During this period, the SARIMA model has
not yet learned the tank's unique 24-hour biological rhythm.
Deploying predictive WQI before calibration produces unreliable forecasts.

Deployment Lifecycle
--------------------
  Day 0     : Install sensors, clean tank, water change.
  Day 1–14  : COLD_START — Rule-Based WQI active, models observing silently.
  Day 15+   : ADAPTIVE   — Predictive WQI unlocked.

Usage
-----
    from datetime import date
    from src.pipeline_router import AquariumPipelineRouter

    router = AquariumPipelineRouter(install_date=date(2026, 3, 1))

    result = router.route(ph=7.0, temperature=24.0, tds=120, turbidity=3.0)
    print(result.mode)        # 'COLD_START' | 'ADAPTIVE' | 'SENSOR_ERROR'
    print(result.wqi_score)   # 0–100
    print(result.breakdown)   # component scores for dashboard
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import date

from src.sensor_validator      import SensorValidator
from src.anomaly_detection_pipeline import AnomalyDetector
from src.forecasting_pipeline  import SARIMAForecaster
from src.adaptive_wqi_pipeline import AdaptiveWQIPipeline, rule_based_wqi

CALIBRATION_DAYS = 14   # days before predictive WQI unlocks


@dataclass
class RouterResult:
    """Result returned by AquariumPipelineRouter.route()."""
    mode:                str          # 'COLD_START' | 'ADAPTIVE' | 'SENSOR_ERROR'
    wqi_score:           float        # final WQI in [0, 100]
    anomaly_flag:        int          # 1=anomaly, 0=normal (-1 if SENSOR_ERROR)
    days_until_adaptive: int          # 0 once mode == 'ADAPTIVE'
    breakdown:           dict = field(default_factory=dict)
    sensor_errors:       list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return (
            f'[{self.mode}] WQI={self.wqi_score:.1f}  '
            f'anomaly={self.anomaly_flag}  '
            f'days_until_adaptive={self.days_until_adaptive}'
        )


class AquariumPipelineRouter:
    """
    End-to-end inference router for a single aquarium installation.

    Parameters
    ----------
    install_date : date — the date the tank was set up / sensor was first installed.
                          Used to compute tank age and gate the adaptive pipeline.
    model_dir    : str  — path to the models/ directory (default: ../models/)
    """

    def __init__(self, install_date: date, model_dir: str | None = None):
        self.install_date = install_date

        _src      = os.path.dirname(os.path.abspath(__file__))
        model_dir = model_dir or os.path.join(_src, '..', 'models')

        self.validator  = SensorValidator()
        self.detector   = AnomalyDetector(model_dir=model_dir)
        self.forecaster = SARIMAForecaster(model_dir=model_dir)
        self.wqi        = AdaptiveWQIPipeline()

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _tank_age_days(self, today: date | None = None) -> int:
        today = today or date.today()
        return (today - self.install_date).days

    def _days_until_adaptive(self, today: date | None = None) -> int:
        age = self._tank_age_days(today)
        return max(0, CALIBRATION_DAYS - age)

    # ── Main routing method ──────────────────────────────────────────────────

    def route(
        self,
        ph:          float,
        temperature: float,
        tds:         float,
        turbidity:   float,
        today:       date | None = None,
    ) -> RouterResult:
        """
        Route a sensor reading to the correct WQI pipeline.

        Routing logic (in order of priority):
          1. Validate sensors → SENSOR_ERROR if any hardware fault
          2. Check tank age   → COLD_START if < 14 days
          3. Run full pipeline → ADAPTIVE

        Parameters
        ----------
        ph          : float — pH value
        temperature : float — water temperature (°C)
        tds         : float — total dissolved solids (ppm)
        turbidity   : float — turbidity (NTU)
        today       : date  — override today's date (for testing)

        Returns
        -------
        RouterResult
        """
        days_left = self._days_until_adaptive(today)

        # ── Step 1: Sensor validation ────────────────────────────────────────
        validation = self.validator.validate(
            ph=ph, temperature=temperature, tds=tds, turbidity=turbidity
        )

        if not validation.is_valid:
            # Sensor error — fall back to rule-based with whatever valid values we have
            # (rule_based_wqi is robust to edge values; it just clips scores to 0)
            safe_score = rule_based_wqi(ph or 7.0, temperature or 24.0,
                                        tds or 100.0, turbidity or 3.0)
            return RouterResult(
                mode                = 'SENSOR_ERROR',
                wqi_score           = safe_score,
                anomaly_flag        = -1,
                days_until_adaptive = days_left,
                breakdown           = {'note': 'sensor validation failed — rule-based fallback'},
                sensor_errors       = validation.errors,
            )

        # ── Step 2: Cold-start guard ─────────────────────────────────────────
        if days_left > 0:
            rb_score = rule_based_wqi(ph, temperature, tds, turbidity)
            return RouterResult(
                mode                = 'COLD_START',
                wqi_score           = rb_score,
                anomaly_flag        = 0,
                days_until_adaptive = days_left,
                breakdown           = {
                    'note': f'Calibration in progress — {days_left} days until Adaptive WQI unlocks',
                    'rule_based_wqi': rb_score,
                },
            )

        # ── Step 3: Adaptive pipeline (Day 15+) ─────────────────────────────
        anomaly_flag, anomaly_score = self.detector.predict(
            temperature=temperature, ph=ph, tds=tds, turbidity=turbidity
        )

        ph_lower, temp_upper = self.forecaster.get_pessimistic_forecast(steps=1)

        current    = {'ph': ph, 'temp': temperature, 'tds': tds, 'turbidity': turbidity}
        forecasted = {'ph': float(ph_lower.iloc[0]), 'temp': float(temp_upper.iloc[0])}

        ad_score, breakdown = self.wqi.compute(
            current=current, forecasted=forecasted, anomaly_flag=anomaly_flag
        )
        breakdown['anomaly_score'] = round(anomaly_score, 4)

        return RouterResult(
            mode                = 'ADAPTIVE',
            wqi_score           = ad_score,
            anomaly_flag        = anomaly_flag,
            days_until_adaptive = 0,
            breakdown           = breakdown,
        )


# ── Standalone demo ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    from datetime import timedelta

    print('=== Pipeline Router — Demo ===\n')

    # Simulate tank installed 3 days ago (still in cold-start)
    cold_install = date.today() - timedelta(days=3)
    router_cold  = AquariumPipelineRouter(install_date=cold_install)
    r = router_cold.route(ph=7.0, temperature=24.0, tds=120, turbidity=3.0)
    print(f'Cold-start (Day 3): {r}')
    print(f'  Breakdown: {r.breakdown}\n')

    # Simulate tank installed 20 days ago (adaptive unlocked)
    live_install = date.today() - timedelta(days=20)
    router_live  = AquariumPipelineRouter(install_date=live_install)
    r = router_live.route(ph=7.0, temperature=24.0, tds=120, turbidity=3.0)
    print(f'Adaptive (Day 20) : {r}')
    print(f'  Breakdown: {r.breakdown}\n')

    # Simulate sensor error (NaN temperature)
    r = router_live.route(ph=7.0, temperature=float('nan'), tds=120, turbidity=3.0)
    print(f'Sensor error      : {r}')
    print(f'  Errors: {r.sensor_errors}')

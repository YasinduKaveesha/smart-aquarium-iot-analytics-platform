"""
Pipeline 04 — Adaptive WQI
============================
Full end-to-end Adaptive Water Quality Index pipeline.

Integrates:
  - Trapezoidal fuzzy membership functions (Neon Tetra species profile)
  - Compound stress interaction (pH × Temperature synergy)
  - Rule-Based WQI (deterministic baseline)
  - Adaptive WQI (predictive + fuzzy + contextual)

Mathematical formulation:
  WQI_Adaptive = FuzzyScore(SARIMA_PessimisticCI) × CompoundStress × AnomalyConfidence

Where:
  SARIMA_PessimisticCI uses Asymmetric Risk Bounds:
    pH   -> Lower 95% CI  (worst-case acid crash)
    Temp -> Upper 95% CI  (worst-case heater failure)
  AnomalyConfidence = 0.80 if anomaly_flag == 1 else 1.0  (multiplicative)

Usage
-----
    from src.adaptive_wqi_pipeline import AdaptiveWQIPipeline

    pipeline = AdaptiveWQIPipeline()

    score, breakdown = pipeline.compute(
        current    = {'ph': 7.0, 'temp': 24.0, 'tds': 120, 'turbidity': 3.0},
        forecasted = {'ph': 6.95, 'temp': 24.8},   # from SARIMA pessimistic CI
        anomaly_flag = 0
    )

    rule_score = pipeline.rule_based(ph=7.0, temp=24.0, tds=120, turbidity=3.0)
"""

import numpy as np

# ── Weights ───────────────────────────────────────────────────────────────────
WEIGHTS = {'ph': 0.35, 'temp': 0.25, 'tds': 0.20, 'turbidity': 0.20}


# ── Fuzzy Membership Functions ────────────────────────────────────────────────

def trapezoidal_membership(x, a: float, b: float, c: float, d: float) -> np.ndarray:
    """
    Trapezoidal fuzzy membership function.

    Returns a score in [0, 1]:
      0.0 = outside critical boundary (harmful)
      1.0 = inside ideal range (healthy)

    Parameters
    ----------
    x : scalar or array-like — sensor reading(s)
    a : lower critical boundary (score starts rising from 0)
    b : lower ideal boundary   (score reaches 1.0)
    c : upper ideal boundary   (score starts falling from 1.0)
    d : upper critical boundary (score reaches 0)
    """
    x     = np.asarray(x, dtype=float)
    score = np.zeros_like(x)
    score = np.where((x >= b) & (x <= c), 1.0, score)
    if b > a:
        score = np.where((x > a) & (x < b), (x - a) / (b - a), score)
    score = np.where((x > c)  & (x < d),  (d - x) / (d - c), score)
    return np.clip(score, 0.0, 1.0)


def ph_membership(x) -> np.ndarray:
    """Neon Tetra pH: ideal 6.0–7.0, critical below 5.5 or above 7.5."""
    return trapezoidal_membership(x, a=5.5, b=6.0, c=7.0, d=7.5)


def temp_membership(x) -> np.ndarray:
    """Neon Tetra temp: ideal 22–26°C, critical below 20°C or above 28°C."""
    return trapezoidal_membership(x, a=20.0, b=22.0, c=26.0, d=28.0)


def tds_membership(x) -> np.ndarray:
    """TDS: ideal 50–150 ppm, critical above 200 ppm."""
    return trapezoidal_membership(x, a=0, b=50, c=150, d=200)


def turbidity_membership(x) -> np.ndarray:
    """Turbidity: ideal 0–5 NTU, critical above 10 NTU."""
    return trapezoidal_membership(x, a=0, b=0, c=5, d=10)


# ── Compound Stress Penalty ───────────────────────────────────────────────────

def compound_stress_penalty(ph: float, temp: float) -> float:
    """
    Compound stress interaction: elevated temperature amplifies pH toxicity.

    Biological basis: Neon Tetras suffer combined osmoregulatory and
    metabolic stress when pH is low AND temperature is high simultaneously.

    Returns a multiplier in [0.70, 1.0]:
      1.0  = no compound stress (both parameters in ideal range)
      0.70 = maximum compound stress (both simultaneously critical)

    Parameters
    ----------
    ph   : float — forecasted pH (SARIMA lower CI)
    temp : float — forecasted temperature (SARIMA upper CI)
    """
    ph_dev   = 1.0 - float(ph_membership(ph))    # 0=ideal, 1=critical
    temp_dev = 1.0 - float(temp_membership(temp)) # 0=ideal, 1=critical
    penalty  = 1.0 - (0.30 * ph_dev * temp_dev)   # interaction term, max 30%
    return float(np.clip(penalty, 0.70, 1.0))


# ── WQI Implementations ───────────────────────────────────────────────────────

def rule_based_wqi(ph: float, temp: float, tds: float, turbidity: float) -> float:
    """
    Deterministic Rule-Based WQI (baseline).

    Static linear scoring with cliff-edge thresholds.
    Active from Day 1 (no calibration required).

    Returns
    -------
    float — WQI score in [0, 100]
    """
    def _score(v, lo_ideal, hi_ideal, lo_crit, hi_crit):
        if lo_ideal <= v <= hi_ideal:
            return 1.0
        if v < lo_ideal:
            return max(0.0, (v - lo_crit) / (lo_ideal - lo_crit))
        return max(0.0, (hi_crit - v) / (hi_crit - hi_ideal))

    s = (
        _score(ph,        6.0,  7.0,  5.5,  7.5)  * WEIGHTS['ph'] +
        _score(temp,      22.0, 26.0, 20.0, 28.0)  * WEIGHTS['temp'] +
        _score(tds,       50.0, 150.0, 0.0, 200.0) * WEIGHTS['tds'] +
        _score(turbidity, 0.0,  5.0,  0.0,  10.0)  * WEIGHTS['turbidity']
    )
    return round(s * 100, 2)


def adaptive_wqi(
    current_vals: dict,
    forecasted_vals: dict,
    anomaly_flag: int,
) -> tuple[float, dict]:
    """
    Adaptive WQI — Predictive + Fuzzy + Contextual.

    Unlocks after 14-day calibration period (Phase 3: Adaptive Intelligence).

    Mathematical formulation:
      WQI = FuzzyScore(SARIMA_PessimisticCI) × CompoundStress × AnomalyConfidence

    Parameters
    ----------
    current_vals    : dict — sensor readings at T=now
                      Keys: 'ph', 'temp', 'tds', 'turbidity'
    forecasted_vals : dict — SARIMA pessimistic CI bounds at T+60min
                      Keys: 'ph' (lower 95% CI), 'temp' (upper 95% CI)
    anomaly_flag    : int  — 1=anomaly detected by Isolation Forest, 0=normal

    Returns
    -------
    score     : float — WQI in [0, 100]
    breakdown : dict  — component scores for explainability / dashboard display
    """
    # Step 1 — Fuzzy score on FORECASTED pH and Temp (predictive horizon)
    ph_score   = float(ph_membership(forecasted_vals['ph']))
    temp_score = float(temp_membership(forecasted_vals['temp']))

    # Step 2 — Fuzzy score on CURRENT TDS and Turbidity (not forecasted)
    tds_score  = float(tds_membership(current_vals['tds']))
    turb_score = float(turbidity_membership(current_vals['turbidity']))

    # Step 3 — Compound stress: pH × Temp interaction on forecasted values
    cs_penalty = compound_stress_penalty(forecasted_vals['ph'], forecasted_vals['temp'])

    # Step 4 — Anomaly confidence weight (multiplicative — proportional to health state)
    anomaly_confidence = 0.80 if anomaly_flag == 1 else 1.0

    # Step 5 — Weighted fusion
    raw_score = (
        ph_score   * WEIGHTS['ph']   +
        temp_score * WEIGHTS['temp'] +
        tds_score  * WEIGHTS['tds']  +
        turb_score * WEIGHTS['turbidity']
    )
    final_score = raw_score * cs_penalty * anomaly_confidence * 100.0

    breakdown = {
        'ph_score_pct':        round(ph_score   * 100, 1),
        'temp_score_pct':      round(temp_score * 100, 1),
        'tds_score_pct':       round(tds_score  * 100, 1),
        'turbidity_score_pct': round(turb_score * 100, 1),
        'compound_penalty':    round(cs_penalty, 4),
        'anomaly_confidence':  anomaly_confidence,
        'final_wqi':           round(final_score, 2),
    }
    return round(final_score, 2), breakdown


# ── Pipeline Class ────────────────────────────────────────────────────────────

class AdaptiveWQIPipeline:
    """
    Stateless WQI pipeline — no model loading required.

    This class provides a clean API for the backend /wqi endpoint.
    SARIMA forecasts and anomaly flags are computed upstream and
    passed in as arguments.

    Example (production usage with upstream models):
    -------
        from src.anomaly_detection_pipeline import AnomalyDetector
        from src.forecasting_pipeline import SARIMAForecaster
        from src.adaptive_wqi_pipeline import AdaptiveWQIPipeline

        detector   = AnomalyDetector()
        forecaster = SARIMAForecaster()
        wqi        = AdaptiveWQIPipeline()

        # Single reading
        flag, score = detector.predict(temp, ph, tds, turbidity)
        ph_lower, temp_upper = forecaster.get_pessimistic_forecast(steps=1)

        adaptive_score, breakdown = wqi.compute(
            current      = {'ph': ph, 'temp': temp, 'tds': tds, 'turbidity': turbidity},
            forecasted   = {'ph': ph_lower.iloc[0], 'temp': temp_upper.iloc[0]},
            anomaly_flag = flag,
        )
    """

    @staticmethod
    def rule_based(ph: float, temp: float, tds: float, turbidity: float) -> float:
        return rule_based_wqi(ph, temp, tds, turbidity)

    @staticmethod
    def compute(
        current: dict,
        forecasted: dict,
        anomaly_flag: int,
    ) -> tuple[float, dict]:
        return adaptive_wqi(current, forecasted, anomaly_flag)


# ── Standalone demo ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    pipeline = AdaptiveWQIPipeline()

    print('=== Adaptive WQI Pipeline — Sanity Checks ===\n')

    # Ideal conditions
    score, bd = pipeline.compute(
        current    = {'ph': 6.5, 'temp': 24.0, 'tds': 100, 'turbidity': 2.0},
        forecasted = {'ph': 6.5, 'temp': 24.0},
        anomaly_flag = 0,
    )
    print(f'Ideal conditions, no anomaly     -> {score}  (expect ~100)')

    # Forecast pH drifting toward ideal zone lower limit
    score, bd = pipeline.compute(
        current    = {'ph': 6.5, 'temp': 24.0, 'tds': 100, 'turbidity': 2.0},
        forecasted = {'ph': 6.05, 'temp': 25.5},
        anomaly_flag = 0,
    )
    print(f'Forecast pH near lower limit     -> {score}')

    # Compound stress + anomaly
    score, bd = pipeline.compute(
        current    = {'ph': 6.5, 'temp': 24.0, 'tds': 100, 'turbidity': 2.0},
        forecasted = {'ph': 5.8, 'temp': 27.5},
        anomaly_flag = 1,
    )
    print(f'Compound stress + anomaly flag   -> {score}  (expect ~49)')
    print(f'  Breakdown: {bd}')

    print(f'\nRule-Based WQI (same current values) -> {pipeline.rule_based(6.5, 24.0, 100, 2.0)}')

"""
Pipeline 03 — SARIMA Forecasting
==================================
Wraps SARIMA v1 inference for production use.

Models:
  pH   — SARIMA(1,1,0)(0,0,1,24)  trained on hourly pH
  Temp — SARIMA(1,0,1)(0,1,0,24)  trained on hourly temperature

Key design: Asymmetric Risk Bounds (95% CI)
  pH   → Lower CI bound  (worst-case acid crash)
  Temp → Upper CI bound  (worst-case heater failure / overheating)

Usage
-----
    from src.forecasting_pipeline import SARIMAForecaster

    forecaster = SARIMAForecaster()

    # Get the pessimistic 12-hour ahead forecast
    ph_lower, temp_upper = forecaster.get_pessimistic_forecast(steps=12)

    # Get full CI table for reporting
    ph_ci, temp_ci = forecaster.get_forecast_ci(steps=12)
"""

import os
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAXResults

_SRC_DIR    = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_SRC_DIR, '..', 'models')

# Hours of SARIMA initialisation to skip (CI is unreliable during warmup)
WARMUP_HOURS = 26


class SARIMAForecaster:
    """
    SARIMA v1 inference wrapper.

    Provides:
      - Pessimistic 95% CI bounds for WQI input
      - Full CI DataFrames for reporting / visualisation
    """

    def __init__(self, model_dir: str = _MODELS_DIR):
        ph_path   = os.path.join(model_dir, 'sarima_ph_v1.pkl')
        temp_path = os.path.join(model_dir, 'sarima_temp_v1.pkl')
        self.ph_results   = SARIMAXResults.load(ph_path)
        self.temp_results = SARIMAXResults.load(temp_path)

    def get_forecast_ci(self, steps: int = 12, alpha: float = 0.05) -> tuple[pd.DataFrame, pd.DataFrame]:
        """
        Generate out-of-sample forecast with 95% confidence interval.

        Parameters
        ----------
        steps : int   — number of hourly steps ahead (default 12 = 12 hours)
        alpha : float — significance level (default 0.05 → 95% CI)

        Returns
        -------
        ph_ci   : DataFrame with columns ['mean', 'lower ph',   'upper ph']
        temp_ci : DataFrame with columns ['mean', 'lower temp', 'upper temp']
        """
        ph_fc_obj   = self.ph_results.get_forecast(steps=steps)
        temp_fc_obj = self.temp_results.get_forecast(steps=steps)

        ph_ci = pd.DataFrame({
            'mean':      ph_fc_obj.predicted_mean,
            'lower ph':  ph_fc_obj.conf_int(alpha=alpha).iloc[:, 0],
            'upper ph':  ph_fc_obj.conf_int(alpha=alpha).iloc[:, 1],
        })

        temp_ci = pd.DataFrame({
            'mean':       temp_fc_obj.predicted_mean,
            'lower temp': temp_fc_obj.conf_int(alpha=alpha).iloc[:, 0],
            'upper temp': temp_fc_obj.conf_int(alpha=alpha).iloc[:, 1],
        })

        return ph_ci, temp_ci

    def get_pessimistic_forecast(self, steps: int = 12, alpha: float = 0.05) -> tuple[pd.Series, pd.Series]:
        """
        Return only the pessimistic (worst-case) CI bound for WQI input.

        Asymmetric Risk Bounds:
          pH   → Lower CI bound (worst-case pH drop / acid crash)
          Temp → Upper CI bound (worst-case temperature rise / heater failure)

        Parameters
        ----------
        steps : int — hourly steps ahead

        Returns
        -------
        ph_lower   : pd.Series — 95% lower CI for pH
        temp_upper : pd.Series — 95% upper CI for temperature
        """
        ph_ci, temp_ci = self.get_forecast_ci(steps=steps, alpha=alpha)
        return ph_ci['lower ph'], temp_ci['upper temp']

    def build_insample_pessimistic_5min(
        self,
        df_index: pd.DatetimeIndex,
        forecast_steps: int = 25,
        alpha: float = 0.05,
    ) -> tuple[pd.Series, pd.Series]:
        """
        Pre-compute pessimistic CI bounds aligned to a 5-minute DataFrame index.

        Used by the WQI pipeline to avoid re-computing CI inside the main loop.

        Steps
        -----
        1. In-sample CI (skip first WARMUP_HOURS to avoid initialisation artefact)
        2. Out-of-sample CI (forecast_steps hours beyond training end)
        3. Combine, back-fill the warmup gap, resample hourly → 5-min

        Parameters
        ----------
        df_index       : DatetimeIndex of the 5-min sensor DataFrame
        forecast_steps : int — extra hours beyond training window

        Returns
        -------
        ph_lower_5min   : pd.Series — 95% lower CI for pH at 5-min resolution
        temp_upper_5min : pd.Series — 95% upper CI for Temp at 5-min resolution
        """
        # In-sample CI (skip warmup)
        ph_ci_in   = self.ph_results.get_prediction(start=WARMUP_HOURS).conf_int(alpha=alpha)
        temp_ci_in = self.temp_results.get_prediction(start=WARMUP_HOURS).conf_int(alpha=alpha)

        # Out-of-sample CI
        ph_ci_fc   = self.ph_results.get_forecast(steps=forecast_steps).conf_int(alpha=alpha)
        temp_ci_fc = self.temp_results.get_forecast(steps=forecast_steps).conf_int(alpha=alpha)

        # Combine
        ph_lower_h   = pd.concat([ph_ci_in['lower ph'],   ph_ci_fc.iloc[:, 0]])
        temp_upper_h = pd.concat([temp_ci_in['upper temp'], temp_ci_fc.iloc[:, 1]])

        # Back-fill the warmup gap
        n_hours          = len(df_index) // 12  # 5-min → hourly count
        full_hourly_idx  = pd.date_range(df_index[0].floor('1H'), periods=n_hours, freq='1H')
        ph_lower_h       = ph_lower_h.reindex(full_hourly_idx).bfill()
        temp_upper_h     = temp_upper_h.reindex(full_hourly_idx).bfill()

        # Resample hourly → 5-min, align to df_index
        ph_lower_5min   = ph_lower_h.resample('5min').ffill().reindex(df_index, method='ffill')
        temp_upper_5min = temp_upper_h.resample('5min').ffill().reindex(df_index, method='ffill')

        return ph_lower_5min, temp_upper_5min


# ── Standalone demo ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    forecaster = SARIMAForecaster()

    print('=== Forecasting Pipeline — Demo ===')
    ph_ci, temp_ci = forecaster.get_forecast_ci(steps=12)
    print('\n12-Hour pH Forecast with 95% CI:')
    print(ph_ci.round(4).to_string())
    print('\n12-Hour Temp Forecast with 95% CI:')
    print(temp_ci.round(4).to_string())

    ph_lower, temp_upper = forecaster.get_pessimistic_forecast(steps=1)
    print(f'\nNext-hour pessimistic bounds:')
    print(f'  pH   lower CI: {ph_lower.iloc[0]:.4f}')
    print(f'  Temp upper CI: {temp_upper.iloc[0]:.4f}')

"""
Upgrade 1 — Rolling Retraining: retrain_sarima.py
===================================================
Standalone script to re-fit the SARIMA models using recent live sensor data.

Run this weekly (or via cron) to prevent model staleness.
The script overwrites sarima_ph_v1.pkl and sarima_temp_v1.pkl in the models/ directory.

Why Rolling Retraining?
-----------------------
The SARIMA models are trained on a fixed historical window.
As the tank ages, water chemistry, biological activity, and equipment behaviour
all drift. A stale model produces wider CIs and less accurate forecasts.
Re-fitting on the most recent 30 days keeps the model calibrated to the
current tank state.

SARIMA Orders (fixed — tuned on original dataset):
  pH   : SARIMAX(1,1,0)(0,0,1,24)  — d=1 handles pH non-stationarity; MA term dropped (was insignificant)
  Temp : SARIMAX(1,0,1)(0,1,0,24)  — D=1 handles seasonal drift; seasonal MA dropped (was degenerate at -1.0)

Usage (manual)
--------------
    python src/retrain_sarima.py \
        --data  data/smart_aquarium_dataset_v6.1.csv \
        --models models/ \
        --days  30

Usage (import)
--------------
    from src.retrain_sarima import retrain_sarima
    retrain_sarima(
        data_csv      = 'data/live_sensor_log.csv',
        model_dir     = 'models/',
        lookback_days = 30,
    )
"""

import argparse
import os
import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX, SARIMAXResults

warnings.filterwarnings('ignore')

# Fixed SARIMA orders — do not change without re-running model selection
_PH_ORDER        = (1, 1, 0)
_PH_SEASONAL     = (0, 0, 1, 24)
_TEMP_ORDER      = (1, 0, 1)
_TEMP_SEASONAL   = (0, 1, 0, 24)

_SRC_DIR    = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_SRC_DIR, '..', 'models')
_DATA_DIR   = os.path.join(_SRC_DIR, '..', 'data')


def retrain_sarima(
    data_csv:      str,
    model_dir:     str = _MODELS_DIR,
    lookback_days: int = 30,
) -> dict[str, float]:
    """
    Re-fit SARIMA models on the most recent `lookback_days` of sensor data.

    Parameters
    ----------
    data_csv      : path to sensor CSV (must have 'timestamp', 'ph', 'temperature' columns)
    model_dir     : directory where .pkl files will be saved
    lookback_days : number of recent days to use for training (default 30)

    Returns
    -------
    dict with MAE scores: {'ph_mae': float, 'temp_mae': float}
    """
    print(f'=== SARIMA Rolling Retraining ===')
    print(f'Data   : {data_csv}')
    print(f'Models : {model_dir}')
    print(f'Window : last {lookback_days} days\n')

    # ── Load and prepare data ─────────────────────────────────────────────────
    df = pd.read_csv(data_csv)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').set_index('timestamp')

    if 'ph' not in df.columns or 'temperature' not in df.columns:
        raise ValueError("CSV must contain 'ph' and 'temperature' columns.")

    # Slice to most recent lookback_days
    cutoff = df.index.max() - pd.Timedelta(days=lookback_days)
    df_window = df[df.index >= cutoff]

    if len(df_window) < 48:
        raise ValueError(
            f'Only {len(df_window)} rows in the last {lookback_days} days. '
            f'Need at least 48 hours of data to fit a seasonal SARIMA(S=24).'
        )

    # Resample to hourly (SARIMA trained on 1H data)
    ph_h   = df_window['ph'].resample('1H').mean().dropna()
    temp_h = df_window['temperature'].resample('1H').mean().dropna()

    print(f'Training window: {ph_h.index.min()} to {ph_h.index.max()}')
    print(f'Hourly samples : {len(ph_h)} pH, {len(temp_h)} Temp\n')

    # ── Fit pH model ──────────────────────────────────────────────────────────
    print('Fitting pH SARIMA(1,1,0)(0,0,1,24)...')
    ph_model   = SARIMAX(
        ph_h,
        order          = _PH_ORDER,
        seasonal_order = _PH_SEASONAL,
        enforce_stationarity  = False,
        enforce_invertibility = False,
    )
    ph_results = ph_model.fit(disp=False)
    ph_mae     = float(np.mean(np.abs(ph_results.resid.dropna())))
    print(f'  pH   MAE (in-sample): {ph_mae:.4f}')

    # ── Fit Temp model ────────────────────────────────────────────────────────
    print('Fitting Temp SARIMA(1,0,1)(0,1,0,24)...')
    temp_model   = SARIMAX(
        temp_h,
        order          = _TEMP_ORDER,
        seasonal_order = _TEMP_SEASONAL,
        enforce_stationarity  = False,
        enforce_invertibility = False,
    )
    temp_results = temp_model.fit(disp=False)
    temp_mae     = float(np.mean(np.abs(temp_results.resid.dropna())))
    print(f'  Temp MAE (in-sample): {temp_mae:.4f}')

    # ── Save models ───────────────────────────────────────────────────────────
    os.makedirs(model_dir, exist_ok=True)
    ph_path   = os.path.join(model_dir, 'sarima_ph_v1.pkl')
    temp_path = os.path.join(model_dir, 'sarima_temp_v1.pkl')

    ph_results.save(ph_path)
    temp_results.save(temp_path)

    print(f'\nSaved: {ph_path}')
    print(f'Saved: {temp_path}')
    print('\nRetraining complete.')

    return {'ph_mae': ph_mae, 'temp_mae': temp_mae}


# ── CLI entry-point ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Retrain SARIMA models on recent sensor data.'
    )
    parser.add_argument(
        '--data',
        default=os.path.join(_DATA_DIR, 'smart_aquarium_dataset_v6.1.csv'),
        help='Path to sensor CSV file',
    )
    parser.add_argument(
        '--models',
        default=_MODELS_DIR,
        help='Path to models directory',
    )
    parser.add_argument(
        '--days',
        type=int,
        default=30,
        help='Number of recent days to use for training (default: 30)',
    )
    args = parser.parse_args()

    metrics = retrain_sarima(
        data_csv      = args.data,
        model_dir     = args.models,
        lookback_days = args.days,
    )
    print(f'\nFinal MAE -> pH: {metrics["ph_mae"]:.4f} | Temp: {metrics["temp_mae"]:.4f}')

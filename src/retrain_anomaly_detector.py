"""
Upgrade 5 — Anomaly Detector Retraining: retrain_anomaly_detector.py
======================================================================
Standalone script to re-fit the Isolation Forest anomaly detector using
recent live sensor data collected during the 14-day calibration window.

Run once on Day 15 (alongside retrain_sarima.py) to personalise the model
to the specific tank's "normal" before Adaptive WQI unlocks.

Why Retrain?
------------
The Isolation Forest was trained on synthetic simulation data. Every real
tank has a unique "normal" — different fish load, filter capacity, lighting
schedule, and water source chemistry. A model trained on simulation data may
flag real normal readings as anomalies (or miss real anomalies).

After 14 days of clean calibration data, the model can be re-fitted to what
YOUR tank considers normal, dramatically reducing false positive alert rate.

contamination Parameter
-----------------------
Synthetic training used contamination=0.06 (6%) — tuned for simulated events.
Live calibration data (clean tank, Day 0–14) should use contamination=0.03
because a properly maintained new tank has fewer true anomalies than the
synthetic worst-case dataset.

Deployment Schedule
-------------------
Run both retraining scripts together at end of Day 14:

    python -m src.retrain_sarima            --days 30
    python -m src.retrain_anomaly_detector  --days 14 --contamination 0.03

After both scripts complete, Adaptive WQI unlocks on Day 15.

Usage (manual)
--------------
    python -m src.retrain_anomaly_detector \\
        --data  data/smart_aquarium_dataset_v6.1.csv \\
        --models models/ \\
        --days  14 \\
        --contamination 0.03

Usage (import)
--------------
    from src.retrain_anomaly_detector import retrain_anomaly_detector
    metrics = retrain_anomaly_detector(
        data_csv      = 'data/live_sensor_log.csv',
        model_dir     = 'models/',
        lookback_days = 14,
        contamination = 0.03,
    )
    print(metrics)  # {'anomaly_rate': 0.031, 'n_samples': 4032}
"""

import argparse
import os
import warnings

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')

# Feature columns — must match anomaly_detection_pipeline.py
FEATURE_COLS = ['temperature', 'ph', 'tds', 'turbidity']

_SRC_DIR    = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_SRC_DIR, '..', 'models')
_DATA_DIR   = os.path.join(_SRC_DIR, '..', 'data')


def retrain_anomaly_detector(
    data_csv:      str,
    model_dir:     str  = _MODELS_DIR,
    lookback_days: int  = 14,
    contamination: float = 0.03,
) -> dict:
    """
    Re-fit the Isolation Forest anomaly detector on recent live sensor data.

    Parameters
    ----------
    data_csv      : path to sensor CSV (must have 'timestamp' + FEATURE_COLS)
    model_dir     : directory where .joblib files will be saved
    lookback_days : number of recent days to use for training (default 14 —
                    the cold-start calibration window of clean tank data)
    contamination : expected fraction of anomalies in the training data
                    (default 0.03 for clean live data; synthetic used 0.06)

    Returns
    -------
    dict with keys: {'anomaly_rate': float, 'n_samples': int}
    """
    print('=== Anomaly Detector Retraining ===')
    print(f'Data          : {data_csv}')
    print(f'Models        : {model_dir}')
    print(f'Window        : last {lookback_days} days')
    print(f'contamination : {contamination}\n')

    # ── Load and prepare data ─────────────────────────────────────────────────
    df = pd.read_csv(data_csv)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').set_index('timestamp')

    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing columns: {missing}")

    # Slice to most recent lookback_days
    cutoff   = df.index.max() - pd.Timedelta(days=lookback_days)
    df_window = df[df.index >= cutoff][FEATURE_COLS].dropna()

    if len(df_window) < 100:
        raise ValueError(
            f'Only {len(df_window)} rows in the last {lookback_days} days. '
            f'Need at least 100 readings to retrain the anomaly detector.'
        )

    print(f'Training window : {df_window.index.min()} to {df_window.index.max()}')
    print(f'Samples         : {len(df_window)}\n')

    # ── Fit scaler ────────────────────────────────────────────────────────────
    print('Fitting StandardScaler...')
    scaler  = StandardScaler()
    X_scaled = scaler.fit_transform(df_window)

    # ── Fit Isolation Forest ──────────────────────────────────────────────────
    print(f'Fitting IsolationForest(n_estimators=200, contamination={contamination})...')
    iso_forest = IsolationForest(
        n_estimators  = 200,
        contamination = contamination,
        random_state  = 42,
    )
    iso_forest.fit(X_scaled)

    predictions  = iso_forest.predict(X_scaled)
    anomaly_rate = float((predictions == -1).mean())
    print(f'  Anomaly rate (in-sample): {anomaly_rate:.3f} '
          f'({int((predictions == -1).sum())} / {len(predictions)} flagged)')

    # ── Save models ───────────────────────────────────────────────────────────
    os.makedirs(model_dir, exist_ok=True)
    iso_path    = os.path.join(model_dir, 'isolation_forest_v1.joblib')
    scaler_path = os.path.join(model_dir, 'scaler_v1.joblib')

    joblib.dump(iso_forest, iso_path)
    joblib.dump(scaler,     scaler_path)

    print(f'\nSaved: {iso_path}')
    print(f'Saved: {scaler_path}')
    print('\nRetraining complete.')

    return {'anomaly_rate': anomaly_rate, 'n_samples': len(df_window)}


# ── CLI entry-point ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Retrain Isolation Forest anomaly detector on recent sensor data.'
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
        default=14,
        help='Number of recent days to use for training (default: 14)',
    )
    parser.add_argument(
        '--contamination',
        type=float,
        default=0.03,
        help='Expected anomaly fraction in training data (default: 0.03)',
    )
    args = parser.parse_args()

    metrics = retrain_anomaly_detector(
        data_csv      = args.data,
        model_dir     = args.models,
        lookback_days = args.days,
        contamination = args.contamination,
    )
    print(f'\nFinal -> anomaly_rate: {metrics["anomaly_rate"]:.3f} '
          f'| n_samples: {metrics["n_samples"]}')

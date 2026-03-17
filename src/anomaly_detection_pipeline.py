"""
Pipeline 02 — Anomaly Detection
================================
Wraps Isolation Forest v1 inference for production use.

Model: IsolationForest (n_estimators=200, contamination=0.06)
Features: temperature, ph, tds, turbidity (4 raw sensors, StandardScaler)

Usage
-----
    from src.anomaly_detection_pipeline import AnomalyDetector

    detector = AnomalyDetector()
    flag, score = detector.predict(temperature=24.1, ph=7.0, tds=120, turbidity=3.2)
"""

import os
import joblib
import numpy as np

# Resolve model paths relative to this file's location
_SRC_DIR    = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_SRC_DIR, '..', 'models')

FEATURE_COLS = ['temperature', 'ph', 'tds', 'turbidity']


class AnomalyDetector:
    """
    Isolation Forest v1 inference wrapper.

    Attributes
    ----------
    model     : trained IsolationForest
    scaler    : fitted StandardScaler
    """

    def __init__(self, model_dir: str = _MODELS_DIR):
        iso_path    = os.path.join(model_dir, 'isolation_forest_v1.joblib')
        scaler_path = os.path.join(model_dir, 'scaler_v1.joblib')
        self.model  = joblib.load(iso_path)
        self.scaler = joblib.load(scaler_path)

    def predict(
        self,
        temperature: float,
        ph: float,
        tds: float,
        turbidity: float,
    ) -> tuple[int, float]:
        """
        Run anomaly detection on a single sensor reading.

        Parameters
        ----------
        temperature : float — water temperature (°C)
        ph          : float — pH value
        tds         : float — total dissolved solids (ppm)
        turbidity   : float — turbidity (NTU)

        Returns
        -------
        anomaly_flag : int   — 1 = anomaly detected, 0 = normal
        anomaly_score: float — Isolation Forest decision score
                               (more negative = more anomalous)
        """
        import pandas as pd
        X_raw    = pd.DataFrame([[temperature, ph, tds, turbidity]], columns=FEATURE_COLS)
        X_scaled = self.scaler.transform(X_raw)

        prediction    = self.model.predict(X_scaled)[0]   # 1 = normal, -1 = anomaly
        anomaly_score = self.model.decision_function(X_scaled)[0]
        anomaly_flag  = 1 if prediction == -1 else 0

        return anomaly_flag, float(anomaly_score)


# ── Standalone demo ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    detector = AnomalyDetector()

    print('=== Anomaly Detection Pipeline — Demo ===')

    normal_flag, normal_score = detector.predict(
        temperature=24.1, ph=7.0, tds=120, turbidity=3.2
    )
    print(f'Normal reading   -> flag={normal_flag}, score={normal_score:.4f}')

    anomaly_flag, anomaly_score = detector.predict(
        temperature=31.5, ph=5.1, tds=450, turbidity=18.0
    )
    print(f'Anomalous reading -> flag={anomaly_flag}, score={anomaly_score:.4f}')

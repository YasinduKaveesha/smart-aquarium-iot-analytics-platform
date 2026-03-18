import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { LatestResponse } from '../api/types';
import { SensorReading } from '../data/mockData';

export interface LatestState {
  reading: SensorReading | null;
  anomalyFlag: number;
  mode: string;
  breakdown: Record<string, number>;
  loading: boolean;
  error: string | null;
}

export function useLatest(intervalMs = 30_000): LatestState {
  const [state, setState] = useState<LatestState>({
    reading: null,
    anomalyFlag: 0,
    mode: '',
    breakdown: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await apiFetch<LatestResponse>('/api/latest');
        if (cancelled) return;
        setState({
          reading: {
            timestamp: raw.timestamp,
            temperature: raw.temperature ?? 26,
            pH: raw.ph ?? 7.0,
            tds: raw.tds ?? 300,
            turbidity: raw.turbidity ?? 3.0,
            wqi: raw.wqi_score ?? 0,
          },
          anomalyFlag: raw.anomaly_flag,
          mode: raw.mode,
          breakdown: raw.breakdown ?? {},
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: String(err) }));
      }
    }

    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}

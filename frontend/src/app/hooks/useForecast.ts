import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { ForecastResponse, ApiForecastPoint } from '../api/types';
import { ForecastPoint } from '../data/mockData';

function adaptPoints(pts: ApiForecastPoint[]): ForecastPoint[] {
  return pts.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    mean: p.mean,
    lower: p.lower,
    upper: p.upper,
  }));
}

export function useForecast() {
  const [phForecast, setPhForecast] = useState<ForecastPoint[] | null>(null);
  const [tempForecast, setTempForecast] = useState<ForecastPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiFetch<ForecastResponse>('/api/forecast');
        if (!cancelled) {
          setPhForecast(adaptPoints(res.ph_forecast));
          setTempForecast(adaptPoints(res.temp_forecast));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { phForecast, tempForecast, loading, error };
}

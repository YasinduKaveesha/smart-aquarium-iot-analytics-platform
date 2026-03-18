import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { AnomalyEventApi } from '../api/types';
import { AnomalyEvent } from '../data/mockData';

// Derive which parameter is most anomalous by deviation from ideal
function deriveParameter(api: AnomalyEventApi): string {
  const devs: { name: string; dev: number }[] = [];
  if (api.ph !== null) devs.push({ name: 'pH', dev: Math.abs(api.ph - 7.0) / 0.5 });
  if (api.tds !== null) devs.push({ name: 'TDS', dev: Math.max(0, (api.tds - 300) / 80) });
  if (api.turbidity !== null) devs.push({ name: 'Turbidity', dev: Math.max(0, (api.turbidity - 3) / 2) });
  if (api.temperature !== null) devs.push({ name: 'Temperature', dev: Math.abs(api.temperature - 26) / 2 });
  devs.sort((a, b) => b.dev - a.dev);
  return devs[0]?.name ?? 'Unknown';
}

// Derive a 0-1 anomaly score from sensor deviations (Isolation Forest only returns 0/1)
function deriveScore(api: AnomalyEventApi): number {
  const maxDevs: number[] = [];
  if (api.ph !== null) maxDevs.push(Math.abs(api.ph - 7.0) / 0.5);
  if (api.tds !== null && api.tds > 300) maxDevs.push((api.tds - 300) / 80);
  if (api.turbidity !== null && api.turbidity > 3) maxDevs.push((api.turbidity - 3) / 2);
  if (api.temperature !== null) maxDevs.push(Math.abs(api.temperature - 26) / 2);
  const maxDev = maxDevs.length > 0 ? Math.max(...maxDevs) : 0;
  return Math.min(0.95, 0.45 + maxDev * 0.35);
}

const MESSAGES: Record<string, string> = {
  pH: 'pH fluctuation detected. May indicate biological activity change.',
  TDS: 'Sudden TDS spike detected. Possible overfeeding or waste accumulation.',
  Turbidity: 'Increased turbidity. Check filter and substrate disturbance.',
  Temperature: 'Temperature anomaly detected. Check heater and water circulation.',
};

function adaptAnomaly(api: AnomalyEventApi): AnomalyEvent {
  const parameter = deriveParameter(api);
  return {
    timestamp: api.timestamp,
    parameter,
    anomalyScore: deriveScore(api),
    persistence: api.persistence,
    message: MESSAGES[parameter] ?? 'Anomaly detected by Isolation Forest.',
  };
}

export function useAnomalies() {
  const [data, setData] = useState<AnomalyEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await apiFetch<AnomalyEventApi[]>('/api/anomalies');
        if (!cancelled) { setData(raw.map(adaptAnomaly)); setLoading(false); }
      } catch (err) {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

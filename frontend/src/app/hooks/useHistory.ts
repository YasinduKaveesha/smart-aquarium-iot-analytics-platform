import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { HistoryRecord } from '../api/types';
import { SensorReading } from '../data/mockData';

function adaptHistory(records: HistoryRecord[]): SensorReading[] {
  // Downsample to at most 168 points so charts don't choke
  const step = records.length > 168 ? Math.floor(records.length / 168) : 1;
  return records
    .filter((_, i) => i % step === 0)
    .map(r => ({
      timestamp: r.timestamp,
      temperature: r.temperature ?? 26,
      pH: r.ph ?? 7.0,        // adapt ph → pH
      tds: r.tds ?? 300,
      turbidity: r.turbidity ?? 3.0,
      wqi: r.wqi_score ?? 0,  // adapt wqi_score → wqi
    }));
}

export function useHistory(days = 7) {
  const [data, setData] = useState<SensorReading[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await apiFetch<HistoryRecord[]>(`/api/history?days=${days}`);
        if (!cancelled) { setData(adaptHistory(records)); setLoading(false); }
      } catch (err) {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [days]);

  return { data, loading, error };
}

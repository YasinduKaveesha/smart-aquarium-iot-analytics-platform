import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { StatusResponse } from '../api/types';

export function useStatus(intervalMs = 30_000) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiFetch<StatusResponse>('/api/status');
        if (!cancelled) { setData(res); setLoading(false); }
      } catch (err) {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      }
    }

    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { data, loading, error };
}

import { useState } from 'react';
import { apiFetch } from '../api/client';
import { MaintenanceResponse } from '../api/types';

export function useMaintenance() {
  const [loading, setLoading] = useState(false);

  async function startMaintenance(): Promise<void> {
    setLoading(true);
    try {
      await apiFetch<MaintenanceResponse>('/api/maintenance/start', { method: 'POST' });
    } finally {
      setLoading(false);
    }
  }

  async function stopMaintenance(): Promise<void> {
    setLoading(true);
    try {
      await apiFetch<MaintenanceResponse>('/api/maintenance/stop', { method: 'POST' });
    } finally {
      setLoading(false);
    }
  }

  return { startMaintenance, stopMaintenance, loading };
}

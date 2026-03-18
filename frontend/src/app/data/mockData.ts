// Mock data for AquaGuard platform

// System mode — mirrors backend router modes
export type SystemMode = 'ADAPTIVE' | 'COLD_START' | 'MAINTENANCE' | 'SENSOR_ERROR';
export const systemMode: SystemMode = 'ADAPTIVE';
export const daysSinceInstall = 22;
export const anomalyFlag = 1; // 1 = anomaly detected, 0 = normal

export interface ForecastPoint {
  time: string;
  mean: number;
  lower: number;
  upper: number;
}

// SARIMA pH forecast — 24h ahead (lower CI = pessimistic risk bound)
export const pHForecastData: ForecastPoint[] = Array.from({ length: 24 }, (_, i) => {
  const mean = parseFloat((7.1 - i * 0.006).toFixed(3));
  const ci = parseFloat((0.07 + i * 0.009).toFixed(3));
  return {
    time: new Date(Date.now() + (i + 1) * 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    mean,
    lower: parseFloat((mean - ci).toFixed(3)),
    upper: parseFloat((mean + ci).toFixed(3)),
  };
});

// SARIMA Temperature forecast — 24h ahead (upper CI = pessimistic risk bound)
export const tempForecastData: ForecastPoint[] = Array.from({ length: 24 }, (_, i) => {
  const hourOfDay = (new Date().getHours() + i + 1) % 24;
  const mean = parseFloat((26.0 + Math.sin((hourOfDay - 6) * Math.PI / 12) * 0.6).toFixed(2));
  const ci = parseFloat((0.22 + i * 0.018).toFixed(2));
  return {
    time: new Date(Date.now() + (i + 1) * 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    mean,
    lower: parseFloat((mean - ci).toFixed(2)),
    upper: parseFloat((mean + ci).toFixed(2)),
  };
});

export interface SensorReading {
  timestamp: string;
  temperature: number;
  pH: number;
  tds: number;
  turbidity: number;
  wqi: number;
}

export interface MaintenanceEvent {
  date: string;
  type: 'cleaning' | 'alert' | 'waterChange' | 'filterChange';
  message: string;
  wqi?: number;
}

export interface AnomalyEvent {
  timestamp: string;
  parameter: string;
  anomalyScore: number;
  persistence: number;
  message: string;
}

export const generateSensorData = (): SensorReading[] => {
  const data: SensorReading[] = [];
  const now = new Date();
  const daysBack = 7;

  for (let i = daysBack * 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hoursSinceStart = daysBack * 24 - i;
    const hourOfDay = timestamp.getHours();

    const degradationFactor = Math.min(hoursSinceStart / (daysBack * 24), 0.4);
    const noise = () => (Math.random() - 0.5) * 0.1;
    const tempCycle = Math.sin((hourOfDay - 6) * Math.PI / 12) * 0.8;
    const hourlyVariation = Math.sin(hoursSinceStart * 0.5) * 0.5;

    const temperature = 26.2 + tempCycle + noise() * 0.3;
    const pH = 7.1 - degradationFactor * 0.3 + hourlyVariation * 0.05 + noise() * 0.15;
    const tds = 312 + degradationFactor * 80 + hourlyVariation * 8 + noise() * 15;
    const turbidity = 3.2 + degradationFactor * 2.5 + hourlyVariation * 0.2 + noise() * 0.4;

    const pHScore = Math.max(0, 100 - Math.abs(pH - 7.0) * 30);
    const tdsScore = Math.max(0, 100 - (tds - 300) * 0.2);
    const turbidityScore = Math.max(0, 100 - turbidity * 10);
    const tempScore = Math.max(0, 100 - Math.abs(temperature - 26) * 10);

    const wqi = Math.round(pHScore * 0.35 + tdsScore * 0.35 + turbidityScore * 0.2 + tempScore * 0.1);

    data.push({
      timestamp: timestamp.toISOString(),
      temperature: parseFloat(temperature.toFixed(1)),
      pH: parseFloat(pH.toFixed(2)),
      tds: Math.round(tds),
      turbidity: parseFloat(turbidity.toFixed(1)),
      wqi,
    });
  }

  return data;
};

export const sensorData = generateSensorData();
export const currentReading = sensorData[sensorData.length - 1];

export const maintenanceHistory: MaintenanceEvent[] = [
  { date: '2026-03-14T10:30:00', type: 'alert', message: 'Water quality dropped below threshold. Cleaning recommended soon.', wqi: 62 },
  { date: '2026-03-12T14:00:00', type: 'cleaning', message: 'Tank cleaned. Water quality restored.', wqi: 95 },
  { date: '2026-03-10T09:15:00', type: 'waterChange', message: '30% water change performed.', wqi: 88 },
  { date: '2026-03-07T16:45:00', type: 'alert', message: 'TDS levels increasing. Monitor water quality.', wqi: 75 },
  { date: '2026-03-05T11:20:00', type: 'filterChange', message: 'Filter cartridge replaced.', wqi: 92 },
];

export const anomalyEvents: AnomalyEvent[] = [
  { timestamp: '2026-03-13T18:30:00', parameter: 'TDS', anomalyScore: 0.87, persistence: 8, message: 'Sudden TDS spike detected. Possible overfeeding or waste accumulation.' },
  { timestamp: '2026-03-11T22:15:00', parameter: 'pH', anomalyScore: 0.65, persistence: 3, message: 'pH fluctuation detected. May indicate biological activity change.' },
  { timestamp: '2026-03-09T14:00:00', parameter: 'Turbidity', anomalyScore: 0.72, persistence: 5, message: 'Increased turbidity. Check filter and substrate disturbance.' },
];

export const forecastData = (() => {
  const forecast: SensorReading[] = [];
  const lastReading = currentReading;
  const now = new Date();

  for (let i = 1; i <= 24; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    const degradation = i * 0.015;
    forecast.push({
      timestamp: timestamp.toISOString(),
      temperature: lastReading.temperature + (Math.random() - 0.5) * 0.2,
      pH: lastReading.pH - degradation * 0.1,
      tds: lastReading.tds + degradation * 5,
      turbidity: lastReading.turbidity + degradation * 0.15,
      wqi: Math.max(20, lastReading.wqi - Math.round(degradation * 10)),
    });
  }
  return forecast;
})();

export const fishSpecies = {
  name: 'Neon Tetra',
  optimalRanges: {
    temperature: { min: 24, max: 28, current: currentReading.temperature },
    pH: { min: 6.0, max: 7.5, current: currentReading.pH },
    tds: { min: 150, max: 350, current: currentReading.tds },
    turbidity: { min: 0, max: 5, current: currentReading.turbidity },
    dissolvedOxygen: { min: 5, max: 8, current: 6.8 },
  },
};

export const calculateFishStressScore = (): number => {
  const ranges = fishSpecies.optimalRanges;
  let stressPoints = 0;
  if (ranges.temperature.current < ranges.temperature.min || ranges.temperature.current > ranges.temperature.max) stressPoints += 25;
  if (ranges.pH.current < ranges.pH.min || ranges.pH.current > ranges.pH.max) stressPoints += 30;
  if (ranges.tds.current < ranges.tds.min || ranges.tds.current > ranges.tds.max) stressPoints += 25;
  if (ranges.turbidity.current > ranges.turbidity.max) stressPoints += 20;
  return stressPoints;
};

export const getWQIStatus = (wqi: number): { status: string; color: string; bgColor: string; message: string } => {
  if (wqi >= 85) return { status: 'Stable', color: '#4CAF50', bgColor: '#E8F5E9', message: 'Water quality is excellent. Continue current maintenance schedule.' };
  if (wqi >= 70) return { status: 'Monitor', color: '#006B6B', bgColor: '#E0F2F1', message: 'Water quality is good but showing slight decline. Monitor daily.' };
  if (wqi >= 50) return { status: 'Recommended Soon', color: '#FF9800', bgColor: '#FFF3E0', message: 'Water quality has been declining. Cleaning recommended within 18 hours.' };
  if (wqi >= 30) return { status: 'Today', color: '#F57C00', bgColor: '#FFE0B2', message: 'Water quality is poor. Clean tank today to prevent fish stress.' };
  return { status: 'Critical', color: '#F44336', bgColor: '#FFEBEE', message: 'Critical water quality. Immediate action required to protect fish health.' };
};

export const calculateTimeToCritical = (): number => {
  const currentWQI = currentReading.wqi;
  const criticalThreshold = 30;
  if (currentWQI <= criticalThreshold) return 0;
  const last24Hours = sensorData.slice(-24);
  if (last24Hours.length < 2) return 48;
  const wqiStart = last24Hours[0].wqi;
  const wqiEnd = last24Hours[last24Hours.length - 1].wqi;
  const degradationRate = (wqiStart - wqiEnd) / 24;
  if (degradationRate <= 0) return 72;
  return Math.round((currentWQI - criticalThreshold) / degradationRate);
};

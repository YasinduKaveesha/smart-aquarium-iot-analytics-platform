// Mock data for all screens

export const wqiValue = 62;

export const parameters = {
  temperature: { value: 26.2, unit: '°C', min: 24, max: 28, optimal: [24, 28], color: '#F97316' },
  ph: { value: 7.1, unit: '', min: 6.0, max: 7.5, optimal: [6.5, 7.5], color: '#2E75B6' },
  tds: { value: 312, unit: ' ppm', min: 150, max: 400, optimal: [150, 350], color: '#006B6B' },
  turbidity: { value: 3.2, unit: ' NTU', min: 0, max: 5, optimal: [0, 4], color: '#8B5CF6' },
};

export const sevenDayTrend = [
  { day: 'Mar 9', wqi: 92 },
  { day: 'Mar 10', wqi: 88 },
  { day: 'Mar 11', wqi: 85 },
  { day: 'Mar 12', wqi: 79 },
  { day: 'Mar 13', wqi: 74 },
  { day: 'Mar 14', wqi: 68 },
  { day: 'Mar 15', wqi: 62 },
];

export const maintenanceHistory = [
  { id: 1, type: 'alert', label: 'Alert', color: '#FF9800', icon: 'alert', title: 'Water quality dropped below threshold.', wqi: 62, date: 'Mar 14' },
  { id: 2, type: 'cleaning', label: 'Cleaning', color: '#2E75B6', icon: 'cleaning', title: 'Tank cleaned. Water quality restored.', wqi: 95, date: 'Mar 12' },
  { id: 3, type: 'waterchange', label: 'Water Change', color: '#006B6B', icon: 'water', title: '30% water change performed.', wqi: 88, date: 'Mar 10' },
  { id: 4, type: 'alert', label: 'Alert', color: '#FF9800', icon: 'alert', title: 'TDS levels increasing.', wqi: 75, date: 'Mar 8' },
  { id: 5, type: 'filterchange', label: 'Filter Change', color: '#8B5CF6', icon: 'filter', title: 'Filter cartridge replaced.', wqi: 92, date: 'Mar 5' },
];

// 24-hour sensor data (hourly)
export const sensorData24h = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  temperature: +(25.8 + Math.sin(i / 4) * 0.8 + Math.random() * 0.3).toFixed(1),
  ph: +(7.1 + Math.sin(i / 6) * 0.15 + Math.random() * 0.05).toFixed(2),
  tds: Math.round(300 + Math.sin(i / 5) * 20 + Math.random() * 10),
  turbidity: +(3.0 + Math.sin(i / 7) * 0.4 + Math.random() * 0.2).toFixed(1),
  wqi: Math.round(65 + Math.sin(i / 8) * 8 + Math.random() * 3),
}));

// Forecast data
export const forecastData = [
  ...Array.from({ length: 18 }, (_, i) => ({
    time: `-${17 - i}h`,
    historical: Math.round(80 - i * 1.2 + Math.sin(i / 3) * 4),
    forecast: null,
    confidence_upper: null,
    confidence_lower: null,
  })),
  { time: 'NOW', historical: 62, forecast: 62, confidence_upper: 65, confidence_lower: 59 },
  ...Array.from({ length: 24 }, (_, i) => ({
    time: `+${i + 1}h`,
    historical: null,
    forecast: Math.round(62 - (i + 1) * 0.6 + Math.sin(i / 4) * 2),
    confidence_upper: Math.round(65 - i * 0.4),
    confidence_lower: Math.round(59 - i * 0.8),
  })),
];

// Anomaly data (3 days)
export const anomalyData = Array.from({ length: 72 }, (_, i) => ({
  time: `${Math.floor(i / 24)}d ${String(i % 24).padStart(2, '0')}h`,
  tds: Math.round(295 + Math.sin(i / 8) * 15 + (i >= 20 && i <= 25 ? 45 : 0) + Math.random() * 5),
  ph: +(7.1 + Math.sin(i / 10) * 0.1 + (i >= 38 && i <= 42 ? 0.35 : 0) + Math.random() * 0.03).toFixed(2),
  turbidity: +(3.0 + Math.sin(i / 9) * 0.3 + (i >= 55 && i <= 60 ? 1.8 : 0) + Math.random() * 0.1).toFixed(1),
}));

export const anomalies = [
  { id: 1, param: 'TDS', severity: 'High', color: '#F44336', score: 0.87, time: '14:20 Mar 13', desc: 'TDS spiked to 398 ppm (threshold: 350 ppm)', start: 20, end: 25 },
  { id: 2, param: 'pH', severity: 'Medium', color: '#FF9800', score: 0.65, time: '02:10 Mar 14', desc: 'pH dropped to 6.45 (threshold: 6.5)', start: 38, end: 42 },
  { id: 3, param: 'Turbidity', severity: 'Low', color: '#F97316', score: 0.72, time: '07:40 Mar 14', desc: 'Turbidity rose to 4.8 NTU (threshold: 4.5 NTU)', start: 55, end: 60 },
];

export const wqiContributions = [
  { param: 'pH', weight: 35, rawValue: '7.1', range: '6.5–7.5', score: 88, contribution: 30.8, color: '#4CAF50' },
  { param: 'TDS', weight: 35, rawValue: '312 ppm', range: '150–350 ppm', score: 74, contribution: 25.9, color: '#2E75B6' },
  { param: 'Turbidity', weight: 20, rawValue: '3.2 NTU', range: '0–4 NTU', score: 80, contribution: 16.0, color: '#F44336' },
  { param: 'Temperature', weight: 10, rawValue: '26.2°C', range: '24–28°C', score: 93, contribution: 9.3, color: '#FF9800' },
];

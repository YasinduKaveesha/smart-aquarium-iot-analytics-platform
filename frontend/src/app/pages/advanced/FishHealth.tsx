import { AdvancedLayout } from '../../components/AdvancedLayout';
import { fishSpecies, currentReading } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { AlertTriangle, CheckCircle, Info, Wifi } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function FishHealth() {
  const { reading: apiReading, mode: apiMode, sensorErrors } = useLatest();
  const live = apiReading ?? currentReading;
  const isSensorError = apiMode === 'SENSOR_ERROR';
  const phFailed = isSensorError && (live.pH === 0 || sensorErrors.some(e => e.toLowerCase().includes('ph')));

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: '#4CAF50', bg: '#E8F5E9', icon: CheckCircle };
    if (score >= 60) return { label: 'Good', color: '#006B6B', bg: '#E0F2F1', icon: CheckCircle };
    if (score >= 40) return { label: 'Fair', color: '#FF9800', bg: '#FFF3E0', icon: AlertTriangle };
    return { label: 'Poor', color: '#F44336', bg: '#FFEBEE', icon: AlertTriangle };
  };

  const ranges = fishSpecies.optimalRanges;

  const parameters = [
    { key: 'Temperature', current: live.temperature, min: ranges.temperature.min, max: ranges.temperature.max, unit: '°C',   color: '#E53E3E', inRange: live.temperature >= ranges.temperature.min && live.temperature <= ranges.temperature.max, failed: false },
    { key: 'pH',          current: live.pH,          min: ranges.pH.min,          max: ranges.pH.max,          unit: '',     color: phFailed ? '#EF4444' : '#3182CE', inRange: phFailed ? false : (live.pH >= ranges.pH.min && live.pH <= ranges.pH.max), failed: phFailed },
    { key: 'TDS',         current: live.tds,         min: ranges.tds.min,         max: ranges.tds.max,         unit: 'ppm',  color: '#D69E2E', inRange: live.tds >= ranges.tds.min && live.tds <= ranges.tds.max, failed: false },
    { key: 'Turbidity',   current: live.turbidity,   min: ranges.turbidity.min,   max: ranges.turbidity.max,   unit: 'NTU',  color: '#805AD5', inRange: live.turbidity <= ranges.turbidity.max, failed: false },
    { key: 'Dissolved O₂', current: ranges.dissolvedOxygen.current, min: ranges.dissolvedOxygen.min, max: ranges.dissolvedOxygen.max, unit: 'mg/L', color: '#00ACC1', inRange: ranges.dissolvedOxygen.current >= ranges.dissolvedOxygen.min && ranges.dissolvedOxygen.current <= ranges.dissolvedOxygen.max, failed: false },
  ];

  const stressScore = parameters.reduce((acc, p) => {
    if (p.failed) return acc;  // exclude failed sensors from stress calculation
    if (!p.inRange) {
      const range = p.max - p.min;
      const deviation = range > 0 ? Math.abs(p.current - (p.min + range / 2)) / (range / 2) : 0;
      return acc + Math.min(25, deviation * 20);
    }
    return acc;
  }, 0);
  const healthScore = Math.max(0, Math.round(100 - stressScore));

  const radarData = parameters.map(p => {
    if (p.failed) return { parameter: p.key, score: 0, fullMark: 100 };
    const range = p.max - p.min;
    const score = range > 0 ? Math.max(0, Math.min(100, 100 - Math.abs(p.current - (p.min + range / 2)) / (range / 2) * 100)) : 100;
    return { parameter: p.key, score: Math.round(score), fullMark: 100 };
  });

  const activeParams = parameters.filter(p => !p.failed);
  const optimalCount = activeParams.filter(p => p.inRange).length;
  const healthStatus = getHealthStatus(healthScore);
  const StatusIcon = healthStatus.icon;

  return (
    <AdvancedLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1F4E79] mb-1">Fish Health Analysis</h2>
        <p className="text-[#555]">Species-specific water parameter compatibility for {fishSpecies.name}</p>
      </div>

      {phFailed && (
        <div className="mb-6 px-4 py-3.5 rounded-2xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
          <Wifi className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-0.5">pH Sensor Offline</p>
            <p className="text-xs text-red-700">pH parameter excluded from health analysis. Score is based on {activeParams.length} active sensors only.</p>
          </div>
        </div>
      )}

      {/* Species header */}
      <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100 flex flex-wrap items-center gap-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #E3F2FD, #B3E5FC)' }}>
          🐟
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-2xl font-black text-[#1F4E79]">{fishSpecies.name}</h3>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">Tropical Freshwater</span>
          </div>
          <p className="text-sm text-[#555]">
            Neon Tetras are sensitive to water quality changes. They thrive in slightly acidic, soft water with stable parameters.
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm text-[#777]">
            <span>{optimalCount}/{activeParams.length} parameters optimal{phFailed ? ' (pH excluded)' : ''}</span>
            <span>•</span>
            <span>Stress score: {stressScore}/100</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: healthStatus.bg, border: `2px solid ${healthStatus.color}30` }}>
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: healthStatus.color }}>{healthScore}</p>
              <p className="text-xs font-semibold" style={{ color: healthStatus.color }}>/ 100</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: healthStatus.bg }}>
            <StatusIcon className="w-3.5 h-3.5" style={{ color: healthStatus.color }} />
            <span className="text-xs font-bold" style={{ color: healthStatus.color }}>{healthStatus.label}</span>
          </div>
        </div>
      </div>

      {/* Two-column: radar + parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-2">Parameter Compatibility</h3>
          <p className="text-sm text-[#777] mb-2">How well current conditions match species requirements</p>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 10, fill: '#555' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#AAA' }} tickCount={4} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} formatter={(v: number) => [`${v}%`, 'Compatibility']} />
              <Radar name="Compatibility" dataKey="score" stroke="#2E75B6" fill="#2E75B6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-5">Parameter Details</h3>
          <div className="space-y-4">
            {parameters.map(p => {
              if (p.failed) {
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-3 h-3 text-red-500" />
                        <span className="text-sm font-semibold text-red-500">{p.key}</span>
                      </div>
                      <span className="text-sm font-bold text-red-500">OFFLINE</span>
                    </div>
                    <div className="h-2 rounded-full bg-red-50 overflow-hidden">
                      <div className="h-full rounded-full bg-red-300 animate-pulse" style={{ width: '100%' }} />
                    </div>
                  </div>
                );
              }
              const normalized = p.max > p.min ? Math.min(Math.max((p.current - p.min) / (p.max - p.min), 0), 1) : 0.5;
              return (
                <div key={p.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.inRange ? '#4CAF50' : '#FF9800' }} />
                      <span className="text-sm font-semibold text-[#333]">{p.key}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: p.color }}>{p.current.toFixed(p.key === 'TDS' ? 0 : 2)}{p.unit}</span>
                      <span className="text-xs text-[#AAA]">[{p.min}–{p.max}]</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${normalized * 100}%`, backgroundColor: p.inRange ? p.color : '#FF9800' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Care recommendations */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          Care Recommendations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '🌡️', tip: 'Maintain temperature between 24–28°C using a reliable heater with thermostat.' },
            { icon: '🧪', tip: 'Test pH weekly. Use pH buffer solutions if needed. Target 6.5–7.0 for Neon Tetras.' },
            { icon: '💧', tip: 'Perform 25–30% water changes weekly to control TDS and remove waste.' },
            { icon: '🔍', tip: 'Monitor turbidity after feeding. Clean substrate and check filtration monthly.' },
            { icon: '🐠', tip: 'Keep in groups of 10+. Neon Tetras are schooling fish — lone fish show stress.' },
            { icon: '🌿', tip: 'Add live plants to stabilize water chemistry and provide natural hiding spots.' },
          ].map(({ icon, tip }, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <p className="text-sm text-[#444] leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </AdvancedLayout>
  );
}

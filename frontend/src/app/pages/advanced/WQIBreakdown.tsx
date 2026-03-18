import { AdvancedLayout } from '../../components/AdvancedLayout';
import { WQIGauge } from '../../components/WQIGauge';
import { currentReading, sensorData, getWQIStatus, anomalyFlag, systemMode } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useStatus } from '../../hooks/useStatus';
import { useHistory } from '../../hooks/useHistory';
import { AlertTriangle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export function WQIBreakdown() {
  const { reading: apiReading, anomalyFlag: apiAnomalyFlag, mode: apiMode, breakdown } = useLatest();
  const { data: statusData } = useStatus();
  const { data: historyData } = useHistory();

  const live       = apiReading ?? currentReading;
  const liveMode   = apiMode || statusData?.mode || systemMode;
  const liveFlag   = apiReading ? apiAnomalyFlag : anomalyFlag;
  const histData   = historyData ?? sensorData;
  const wqiInfo    = getWQIStatus(live.wqi);

  // Use backend breakdown scores when available, otherwise compute locally
  const pH        = live.pH;
  const tds       = live.tds;
  const turbidity = live.turbidity;
  const temp      = live.temperature;

  const pHScore       = breakdown?.ph        ?? Math.max(0, Math.round(100 - Math.abs(pH - 7.0) * 30));
  const tdsScore      = breakdown?.tds       ?? Math.max(0, Math.round(100 - (tds - 300) * 0.2));
  const turbScore     = breakdown?.turbidity ?? Math.max(0, Math.round(100 - turbidity * 10));
  const tempScore     = breakdown?.temperature ?? Math.max(0, Math.round(100 - Math.abs(temp - 26) * 10));

  const components = [
    { name: 'pH Level',     score: pHScore,   weight: 35, color: '#3182CE', description: 'Acidity/alkalinity balance', value: pH.toFixed(2),       unit: '' },
    { name: 'TDS',          score: tdsScore,  weight: 35, color: '#D69E2E', description: 'Dissolved solids content',  value: tds,                  unit: 'ppm' },
    { name: 'Turbidity',    score: turbScore, weight: 20, color: '#805AD5', description: 'Water clarity',             value: turbidity.toFixed(1), unit: 'NTU' },
    { name: 'Temperature',  score: tempScore, weight: 10, color: '#E53E3E', description: 'Thermal conditions',        value: temp.toFixed(1),      unit: '°C' },
  ];

  const radarData  = components.map(c => ({ parameter: c.name, score: c.score, fullMark: 100 }));

  const wqiHistory = histData.slice(-7 * 24).filter((_, i) => i % 6 === 0).map(d => ({
    time: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    WQI: d.wqi,
  }));

  const wqiDistribution = [
    { range: '85–100', label: 'Excellent', count: histData.filter(d => d.wqi >= 85).length,                       color: '#4CAF50' },
    { range: '70–84',  label: 'Good',      count: histData.filter(d => d.wqi >= 70 && d.wqi < 85).length,         color: '#006B6B' },
    { range: '50–69',  label: 'Fair',      count: histData.filter(d => d.wqi >= 50 && d.wqi < 70).length,         color: '#FF9800' },
    { range: '30–49',  label: 'Poor',      count: histData.filter(d => d.wqi >= 30 && d.wqi < 50).length,         color: '#F57C00' },
    { range: '0–29',   label: 'Critical',  count: histData.filter(d => d.wqi < 30).length,                        color: '#F44336' },
  ];

  const anomalyPenalty = liveFlag === 1 && liveMode === 'ADAPTIVE' ? 20 : 0;

  return (
    <AdvancedLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1F4E79] mb-1">WQI Breakdown</h2>
        <p className="text-[#555]">Detailed Water Quality Index analysis and component scores</p>
      </div>

      <div className="mb-6 px-4 py-3.5 rounded-2xl flex items-start gap-3" style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD' }}>
        <Info className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-sky-800 mb-1">WQI Formula</p>
          <p className="text-xs text-sky-700 font-mono leading-relaxed">
            WQI = (pH × 0.35) + (TDS × 0.35) + (Turbidity × 0.20) + (Temp × 0.10)
            {anomalyPenalty > 0 && <span className="text-orange-600"> − {anomalyPenalty} <span className="font-sans">(Isolation Forest anomaly penalty)</span></span>}
          </p>
          {anomalyPenalty > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <p className="text-xs text-orange-600">Anomaly detected — WQI reduced by 20% by Isolation Forest</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <WQIGauge value={live.wqi} size={200} color={wqiInfo.color} bgColor={wqiInfo.bgColor} status={wqiInfo.status} />
          <p className="text-sm text-[#555] text-center mt-4">{wqiInfo.message}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-5">Component Scores</h3>
          <div className="space-y-4">
            {components.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-semibold text-[#333]">{c.name}</span>
                    <span className="text-xs text-[#999] ml-2">Weight: {c.weight}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: c.color }}>{c.score}</span>
                    <span className="text-xs text-[#999]">/100</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.score}%`, backgroundColor: c.color }} />
                </div>
                <p className="text-xs text-[#AAA] mt-0.5">{c.value}{c.unit} — {c.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-2">Parameter Balance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 10, fill: '#555' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#AAA' }} tickCount={4} />
              <Radar name="Score" dataKey="score" stroke="#2E75B6" fill="#2E75B6" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-2">WQI History — 7 Days</h3>
        <p className="text-sm text-[#777] mb-5">Water quality index over the past week</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={wqiHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }} />
            <Bar dataKey="WQI" radius={[4, 4, 0, 0]}>
              {wqiHistory.map((entry, i) => {
                const info = getWQIStatus(entry.WQI);
                return <Cell key={i} fill={info.color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-5">WQI Distribution</h3>
        <div className="grid grid-cols-5 gap-3">
          {wqiDistribution.map(d => (
            <div key={d.range} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${d.color}12`, border: `1.5px solid ${d.color}30` }}>
              <p className="text-2xl font-black" style={{ color: d.color }}>{d.count}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: d.color }}>{d.label}</p>
              <p className="text-xs text-[#AAA] mt-0.5">{d.range}</p>
            </div>
          ))}
        </div>
      </div>
    </AdvancedLayout>
  );
}

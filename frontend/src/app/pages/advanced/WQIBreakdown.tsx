import { AdvancedLayout } from '../../components/AdvancedLayout';
import { WQIGauge } from '../../components/WQIGauge';
import { currentReading, sensorData, getWQIStatus, anomalyFlag, systemMode } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useStatus } from '../../hooks/useStatus';
import { useHistory } from '../../hooks/useHistory';
import { AlertTriangle, Info, Wifi } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export function WQIBreakdown() {
  const { reading: apiReading, anomalyFlag: apiAnomalyFlag, mode: apiMode, breakdown, sensorErrors } = useLatest();
  const { data: statusData } = useStatus();
  const { data: historyData } = useHistory();

  const live       = apiReading ?? currentReading;
  const liveMode   = apiMode || statusData?.mode || systemMode;
  const liveFlag   = apiReading ? apiAnomalyFlag : anomalyFlag;
  const histData   = historyData ?? sensorData;
  const isSensorError = (apiMode || statusData?.mode || systemMode) === 'SENSOR_ERROR';
  const phFailed = isSensorError && (live.pH === 0 || sensorErrors.some(e => e.toLowerCase().includes('ph')));
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
    { name: 'pH Level',     score: phFailed ? 0 : pHScore,   weight: 35, color: phFailed ? '#EF4444' : '#3182CE', description: phFailed ? 'Sensor not connected' : 'Acidity/alkalinity balance', value: phFailed ? '--' : pH.toFixed(2), unit: '', failed: phFailed },
    { name: 'TDS',          score: tdsScore,  weight: 35, color: '#D69E2E', description: 'Dissolved solids content',  value: tds,                  unit: 'ppm', failed: false },
    { name: 'Turbidity',    score: turbScore, weight: 20, color: '#805AD5', description: 'Water clarity',             value: turbidity.toFixed(1), unit: 'NTU', failed: false },
    { name: 'Temperature',  score: tempScore, weight: 10, color: '#E53E3E', description: 'Thermal conditions',        value: temp.toFixed(1),      unit: '°C', failed: false },
  ];

  const radarData  = components.map(c => ({ parameter: c.name, score: c.score, fullMark: 100 }));

  const wqiHistory = histData.slice(-7 * 24).filter((_, i) => i % 6 === 0).map(d => ({
    time: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    WQI: d.wqi,
    unavailable: d.wqi === 0 && d.pH === 0,  // sensor failure → WQI unavailable
  }));

  // Exclude sensor-failure records (pH=0 && wqi=0) from distribution
  const validHist = histData.filter(d => !(d.pH === 0 && d.wqi === 0));
  const sensorFailureCount = histData.length - validHist.length;

  const wqiDistribution = [
    { range: '85–100', label: 'Excellent', count: validHist.filter(d => d.wqi >= 85).length,                       color: '#4CAF50' },
    { range: '70–84',  label: 'Good',      count: validHist.filter(d => d.wqi >= 70 && d.wqi < 85).length,         color: '#006B6B' },
    { range: '50–69',  label: 'Fair',      count: validHist.filter(d => d.wqi >= 50 && d.wqi < 70).length,         color: '#FF9800' },
    { range: '30–49',  label: 'Poor',      count: validHist.filter(d => d.wqi >= 30 && d.wqi < 50).length,         color: '#F57C00' },
    { range: '0–29',   label: 'Critical',  count: validHist.filter(d => d.wqi < 30).length,                        color: '#F44336' },
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

      {isSensorError && (
        <div className="mb-6 px-4 py-3.5 rounded-2xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
          <Wifi className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-1">Sensor Failure</p>
            <p className="text-xs text-red-700">pH sensor is not connected. WQI cannot be calculated without all sensor inputs. The breakdown below shows the last available component scores.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <WQIGauge value={isSensorError ? 0 : live.wqi} size={200} color={isSensorError ? '#EF4444' : wqiInfo.color} bgColor={isSensorError ? '#FEF2F2' : wqiInfo.bgColor} status={isSensorError ? 'N/A' : wqiInfo.status} />
          <p className="text-sm text-[#555] text-center mt-4">{isSensorError ? 'WQI unavailable — pH sensor offline' : wqiInfo.message}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-5">Component Scores</h3>
          <div className="space-y-4">
            {components.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {c.failed && <Wifi className="w-3 h-3 text-red-500" />}
                    <span className="text-sm font-semibold" style={{ color: c.failed ? '#EF4444' : '#333' }}>{c.name}</span>
                    <span className="text-xs text-[#999] ml-2">Weight: {c.weight}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: c.color }}>{c.failed ? '--' : c.score}</span>
                    {!c.failed && <span className="text-xs text-[#999]">/100</span>}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  {c.failed
                    ? <div className="h-full rounded-full bg-red-300 animate-pulse" style={{ width: '100%' }} />
                    : <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.score}%`, backgroundColor: c.color }} />
                  }
                </div>
                <p className="text-xs mt-0.5" style={{ color: c.failed ? '#EF4444' : '#AAA' }}>{c.value}{c.unit} — {c.description}</p>
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
        <p className="text-sm text-[#777] mb-2">Water quality index over the past week</p>
        {isSensorError && (
          <div className="flex items-center gap-1.5 mb-3">
            <Wifi className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-500">Gray bars indicate periods where WQI was unavailable due to sensor failure</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={wqiHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }} />
            <Bar dataKey="WQI" radius={[4, 4, 0, 0]}>
              {wqiHistory.map((entry, i) => {
                if (entry.unavailable) return <Cell key={i} fill="#E2E8F0" />;
                const info = getWQIStatus(entry.WQI);
                return <Cell key={i} fill={info.color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-5">WQI Distribution</h3>
        <div className={`grid gap-3 ${sensorFailureCount > 0 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {wqiDistribution.map(d => (
            <div key={d.range} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${d.color}12`, border: `1.5px solid ${d.color}30` }}>
              <p className="text-2xl font-black" style={{ color: d.color }}>{d.count}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: d.color }}>{d.label}</p>
              <p className="text-xs text-[#AAA] mt-0.5">{d.range}</p>
            </div>
          ))}
          {sensorFailureCount > 0 && (
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: '#F1F5F912', border: '1.5px solid #94A3B830' }}>
              <p className="text-2xl font-black text-[#94A3B8]">{sensorFailureCount}</p>
              <p className="text-xs font-semibold mt-1 text-[#94A3B8]">N/A</p>
              <p className="text-xs text-[#AAA] mt-0.5">Sensor fail</p>
            </div>
          )}
        </div>
      </div>
    </AdvancedLayout>
  );
}

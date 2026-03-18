import { SimpleLayout } from '../../components/SimpleLayout';
import { currentReading, getWQIStatus, sensorData } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useHistory } from '../../hooks/useHistory';
import { Thermometer, Droplets, Zap, Eye, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export function SimpleStatus() {
  const { reading: apiReading } = useLatest();
  const { data: historyData } = useHistory();

  const live    = apiReading ?? currentReading;
  const histData = historyData ?? sensorData;

  const wqiInfo = getWQIStatus(live.wqi);

  const last24 = histData.slice(-24).map(d => ({
    temperature: d.temperature,
    pH: d.pH,
    tds: d.tds,
    turbidity: d.turbidity,
  }));

  const prev = histData[histData.length - 13] ?? histData[0] ?? live;
  const getTrend = (current: number, previous: number) => {
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return { icon: Minus, color: '#64748B', label: 'Stable' };
    if (diff > 0) return { icon: TrendingUp, color: '#EF4444', label: `+${diff.toFixed(1)}` };
    return { icon: TrendingDown, color: '#22C55E', label: diff.toFixed(1) };
  };

  const sensors = [
    {
      icon: Thermometer, label: 'Temperature',
      displayValue: `${live.temperature.toFixed(1)}°C`,
      color: '#E53E3E', min: 24, max: 28, range: '24–28°C',
      trend: getTrend(live.temperature, prev.temperature),
      chartKey: 'temperature' as const,
      ok: live.temperature >= 24 && live.temperature <= 28,
      normalized: Math.min(Math.max((live.temperature - 24) / (28 - 24), 0), 1),
    },
    {
      icon: Droplets, label: 'pH Level',
      displayValue: live.pH.toFixed(2),
      color: '#2E75B6', min: 6.5, max: 7.5, range: '6.5–7.5',
      trend: getTrend(live.pH, prev.pH),
      chartKey: 'pH' as const,
      ok: live.pH >= 6.5 && live.pH <= 7.5,
      normalized: Math.min(Math.max((live.pH - 6.5) / (7.5 - 6.5), 0), 1),
    },
    {
      icon: Zap, label: 'TDS',
      displayValue: `${live.tds} ppm`,
      color: '#D97706', min: 150, max: 350, range: '< 350 ppm',
      trend: getTrend(live.tds, prev.tds),
      chartKey: 'tds' as const,
      ok: live.tds <= 350,
      normalized: Math.min(Math.max((live.tds - 150) / (350 - 150), 0), 1),
    },
    {
      icon: Eye, label: 'Turbidity',
      displayValue: `${live.turbidity.toFixed(1)} NTU`,
      color: '#7C3AED', min: 0, max: 5, range: '< 5 NTU',
      trend: getTrend(live.turbidity, prev.turbidity),
      chartKey: 'turbidity' as const,
      ok: live.turbidity <= 5,
      normalized: Math.min(Math.max(live.turbidity / 5, 0), 1),
    },
  ];

  const allOk = sensors.every(s => s.ok);
  const issueCount = sensors.filter(s => !s.ok).length;

  return (
    <SimpleLayout>
      <div className="px-4 pt-5 pb-28 lg:pb-12 lg:px-10">
        <div className="flex items-center gap-4 mb-5">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">Simple Mode</p>
            <h1 className="text-xl font-black text-[#1A3D5C]">Sensor Status</h1>
          </div>
          <div className="ml-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={{ background: wqiInfo.bgColor, border: `1.5px solid ${wqiInfo.color}30` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-sm flex-shrink-0" style={{ background: wqiInfo.color }}>
              {live.wqi}
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A3D5C] leading-none">Water Quality</p>
              <p className="text-sm font-black leading-tight" style={{ color: wqiInfo.color }}>{wqiInfo.status}</p>
            </div>
            <div className="ml-2">
              {allOk
                ? <CheckCircle className="w-5 h-5 text-green-500" />
                : <div className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-xs font-bold text-amber-600">{issueCount}</span></div>
              }
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {sensors.map(({ icon: Icon, label, displayValue, color, range, trend, chartKey, ok, normalized }) => {
            const TrendIcon = trend.icon;
            return (
              <div key={label} className="bg-white rounded-2xl p-4 relative overflow-hidden flex flex-col" style={{ border: `1.5px solid ${ok ? '#F0FDF4' : '#FFF7ED'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="absolute -top-5 -right-5 w-14 h-14 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${color}, transparent)`, opacity: 0.07 }} />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  {ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                </div>
                <p className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-black text-[#1E293B] leading-tight mb-1">{displayValue}</p>
                <div className="flex items-center gap-1 mb-3">
                  <TrendIcon className="w-3 h-3" style={{ color: trend.color }} />
                  <span className="text-[11px] font-semibold" style={{ color: trend.color }}>{trend.label}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${normalized * 100}%`, background: ok ? color : '#F59E0B' }} />
                </div>
                <p className="text-[9px] mb-2" style={{ color: ok ? '#16A34A' : '#B45309' }}>
                  {ok ? '✓ In range' : '! Out of range'} · {range}
                </p>
                <div className="h-12 -mx-1 mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last24}>
                      <Line type="monotone" dataKey={chartKey} stroke={color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1.5px solid #F1F5F9' }}>
          <p className="text-xs font-bold text-[#1A3D5C] uppercase tracking-wider mb-3">What to do</p>
          <div className="space-y-2">
            {sensors.filter(s => !s.ok).length === 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm text-[#374151]">All parameters are within optimal range. Keep up the current schedule.</p>
              </div>
            ) : (
              sensors.filter(s => !s.ok).map(s => (
                <div key={s.label} className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <span className="font-bold">{s.label}</span> is outside the optimal range ({s.range}). Monitor closely.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
}

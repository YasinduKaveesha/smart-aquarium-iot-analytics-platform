import { SimpleLayout } from '../../components/SimpleLayout';
import { maintenanceHistory, sensorData, getWQIStatus } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useHistory } from '../../hooks/useHistory';
import { useAnomalies } from '../../hooks/useAnomalies';
import { AlertTriangle, CheckCircle, Wifi } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';


export function SimpleHistory() {
  const { mode: apiMode, sensorErrors } = useLatest();
  const { data: historyData } = useHistory();
  const { data: anomalyData } = useAnomalies();
  const histData = historyData ?? sensorData;

  const isSensorError = apiMode === 'SENSOR_ERROR';
  const phFailed = isSensorError && sensorErrors.some(e => e.toLowerCase().includes('ph'));

  const weeklyData = histData.filter((_, i) => i % 12 === 0).map(d => ({
    date: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    wqi: d.wqi,
    unavailable: d.pH === 0 && d.wqi === 0,
  }));

  // Exclude sensor-failure entries from stats
  const validWeekly = weeklyData.filter(d => !d.unavailable);
  const avgWqi = validWeekly.length > 0 ? Math.round(validWeekly.reduce((s, d) => s + d.wqi, 0) / validWeekly.length) : 0;
  const minWqi = validWeekly.length > 0 ? Math.min(...validWeekly.map(d => d.wqi)) : 0;
  const maxWqi = validWeekly.length > 0 ? Math.max(...validWeekly.map(d => d.wqi)) : 0;
  const wqiInfo = getWQIStatus(avgWqi);

  return (
    <SimpleLayout>
      <div className="px-4 pt-5 pb-28 lg:pb-12 lg:px-10">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">Simple Mode</p>
            <h1 className="text-xl font-black text-[#1A3D5C]">Maintenance History</h1>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: '7d avg', value: avgWqi, color: wqiInfo.color, bg: wqiInfo.bgColor },
              { label: 'Best',   value: maxWqi, color: '#16A34A',     bg: '#F0FDF4' },
              { label: 'Worst',  value: minWqi, color: '#D97706',     bg: '#FFFBEB' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: bg, border: `1.5px solid ${color}20` }}>
                <span className="text-base font-black" style={{ color }}>{value}</span>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {phFailed && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
            <Wifi className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700"><span className="font-bold">pH sensor offline.</span> WQI data from sensor failure periods is excluded from stats and chart.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl px-4 pt-4 pb-3 mb-5 shadow-sm" style={{ border: '1.5px solid #F1F5F9' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Water Quality · Last 7 Days</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 rounded-full bg-green-400 opacity-60" />
                <span className="text-[9px] text-[#94A3B8]">Good (70)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 rounded-full bg-red-400 opacity-60" />
                <span className="text-[9px] text-[#94A3B8]">Critical (30)</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={validWeekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={wqiInfo.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={wqiInfo.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} ticks={[0, 30, 70, 100]} />
              <ReferenceLine y={70} stroke="#16A34A" strokeDasharray="4 3" strokeOpacity={0.5} />
              <ReferenceLine y={30} stroke="#EF4444" strokeDasharray="4 3" strokeOpacity={0.5} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }} formatter={(v: number) => [`${v} WQI`, 'Score']} />
              <Area type="monotone" dataKey="wqi" stroke={wqiInfo.color} strokeWidth={2.5} fill="url(#histGrad)" dot={{ fill: wqiInfo.color, strokeWidth: 0, r: 3.5 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Event Log</p>
        <div className="space-y-2">
          {(anomalyData && anomalyData.length > 0 ? anomalyData : maintenanceHistory.map(e => ({
            timestamp: e.date, parameter: e.type, anomalyScore: 0.6, persistence: 1, message: e.message,
          }))).map((event, i) => {
            const isAnomaly = 'anomalyScore' in event;
            const color = isAnomaly ? '#D97706' : '#16A34A';
            const bg = isAnomaly ? '#FFFBEB' : '#F0FDF4';
            const label = isAnomaly ? event.parameter : (event as any).type;
            const date = new Date(event.timestamp);
            const isRecent = Date.now() - date.getTime() < 48 * 3600 * 1000;
            return (
              <div key={i} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 relative" style={{ border: `1.5px solid ${isRecent ? color + '30' : '#F1F5F9'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {isRecent && <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <AlertTriangle className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{label}</span>
                  </div>
                  <p className="text-sm text-[#334155] leading-snug">{event.message}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isAnomaly ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SimpleLayout>
  );
}

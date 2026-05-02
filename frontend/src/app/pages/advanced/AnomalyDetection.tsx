import { AdvancedLayout } from '../../components/AdvancedLayout';
import { anomalyEvents, sensorData } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useHistory } from '../../hooks/useHistory';
import { useAnomalies } from '../../hooks/useAnomalies';
import { AlertTriangle, Activity, Clock, TrendingUp, Wifi } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine } from 'recharts';

// Deterministic score derived from sensor deviations — replaces Math.random() bug
function deriveAnomalyScore(pH: number, tds: number, turbidity: number, temperature: number): number {
  const devs: number[] = [];
  if (pH !== 0) devs.push(Math.abs(pH - 7.0) / 0.5);  // skip failed pH sensor (pH=0)
  devs.push(Math.max(0, (tds - 300) / 80));
  devs.push(Math.max(0, (turbidity - 3) / 2));
  devs.push(Math.abs(temperature - 26) / 2);
  return Math.min(0.95, 0.08 + Math.max(...devs) * 0.55);
}

const severityColors = { high: '#F44336', medium: '#FF9800', low: '#2196F3' };
const getSeverity    = (score: number) => score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low';

export function AnomalyDetection() {
  const { mode: apiMode, sensorErrors } = useLatest();
  const { data: historyData } = useHistory();
  const { data: apiAnomalies } = useAnomalies();

  const isSensorError = apiMode === 'SENSOR_ERROR';
  const phFailed = isSensorError && sensorErrors.some(e => e.toLowerCase().includes('ph'));

  const histData    = historyData ?? sensorData;
  const liveEvents  = apiAnomalies ?? anomalyEvents;

  // Build anomaly score timeline from sensor deviations — fully deterministic
  const anomalyTimeline = histData.slice(-48).filter((_, i) => i % 2 === 0).map((d) => ({
    time:  new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    score: deriveAnomalyScore(d.pH, d.tds, d.turbidity, d.temperature),
    tds:   d.tds,
    ph:    d.pH,
  }));

  const scatterData = anomalyTimeline.map((d, i) => ({ x: i, y: d.score, tds: d.tds, ph: d.ph }));

  const totalAnomalies = liveEvents.length;
  const highCount      = liveEvents.filter(e => e.anomalyScore >= 0.8).length;
  const medCount       = liveEvents.filter(e => e.anomalyScore >= 0.6 && e.anomalyScore < 0.8).length;
  const avgPersistence = totalAnomalies > 0
    ? (liveEvents.reduce((a, e) => a + e.persistence, 0) / totalAnomalies).toFixed(1)
    : '0.0';

  // Parameter frequency from live events
  const paramCounts = liveEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.parameter] = (acc[e.parameter] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(paramCounts));

  const paramFreq = [
    { param: 'TDS',         color: '#D69E2E', description: 'Most frequent anomaly source', failed: false },
    { param: 'pH',          color: phFailed ? '#EF4444' : '#3182CE', description: phFailed ? 'Sensor offline — excluded from detection' : 'Moderate fluctuations', failed: phFailed },
    { param: 'Turbidity',   color: '#805AD5', description: 'Filter-related events', failed: false },
    { param: 'Temperature', color: '#E53E3E', description: 'Thermal anomalies', failed: false },
  ].map(p => ({ ...p, count: paramCounts[p.param] ?? 0 }));

  return (
    <AdvancedLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1F4E79] mb-1">Anomaly Detection</h2>
        <p className="text-[#555]">Statistical anomaly detection using Isolation Forest algorithm</p>
      </div>

      {phFailed && (
        <div className="mb-6 px-4 py-3.5 rounded-2xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
          <Wifi className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-0.5">pH Sensor Offline</p>
            <p className="text-xs text-red-700">pH data excluded from anomaly score calculations. Anomaly detection continues using temperature, TDS, and turbidity.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Anomalies',  value: totalAnomalies,  icon: AlertTriangle, color: '#F44336', bg: '#FFEBEE' },
          { label: 'High Severity',    value: highCount,        icon: AlertTriangle, color: '#F44336', bg: '#FFEBEE' },
          { label: 'Medium Severity',  value: medCount,         icon: Activity,      color: '#FF9800', bg: '#FFF3E0' },
          { label: 'Avg Persistence',  value: `${avgPersistence}h`, icon: Clock,    color: '#2E75B6', bg: '#E3F2FD' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs text-[#777] mt-1 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Anomaly Score Timeline — deterministic from sensor deviations */}
      <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-2">Anomaly Score Timeline</h3>
        <p className="text-sm text-[#777] mb-5">Scores above 0.5 indicate anomalous behaviour</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={anomalyTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={(v: number) => [v.toFixed(3), 'Anomaly Score']} />
            <ReferenceLine y={0.5} stroke="#FF9800" strokeDasharray="5 3" label={{ value: 'Anomaly Threshold (0.5)', fill: '#FF9800', fontSize: 10 }} />
            <ReferenceLine y={0.8} stroke="#F44336" strokeDasharray="5 3" label={{ value: 'Critical (0.8)',         fill: '#F44336', fontSize: 10 }} />
            <Line
              type="monotone" dataKey="score" stroke="#2E75B6" strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.score >= 0.5) {
                  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={payload.score >= 0.8 ? '#F44336' : '#FF9800'} stroke="white" strokeWidth={1.5} />;
                }
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} fill="transparent" />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter + Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-2">Anomaly Score Distribution</h3>
          <p className="text-sm text-[#777] mb-4">Each point represents a time window; higher = more anomalous</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="x" name="Time Index"    tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="y" name="Anomaly Score" domain={[0, 1]} tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, name: string) => [v.toFixed(3), name]} />
              <Scatter data={scatterData} name="Anomaly Score">
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.y >= 0.8 ? '#F44336' : entry.y >= 0.5 ? '#FF9800' : '#2E75B6'} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#1F4E79] mb-4">Parameter Anomaly Frequency</h3>
          <div className="space-y-3">
            {paramFreq.map(({ param, count, color, description, failed }) => (
              <div key={param} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                  {failed ? <Wifi className="w-4 h-4" style={{ color }} /> : <TrendingUp className="w-4 h-4" style={{ color }} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-[#333]">{param}</span>
                    <span className="text-sm font-bold" style={{ color }}>{count} events</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-[#AAA] mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anomaly event log */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-5">Detected Anomaly Events</h3>
        {liveEvents.length === 0 ? (
          <p className="text-sm text-[#AAA] text-center py-6">No anomaly events recorded.</p>
        ) : (
          <div className="space-y-4">
            {liveEvents.map((event, i) => {
              const severity      = getSeverity(event.anomalyScore);
              const severityColor = severityColors[severity as keyof typeof severityColors];
              return (
                <div key={i} className="p-5 rounded-xl border" style={{ borderColor: `${severityColor}30`, backgroundColor: `${severityColor}06` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${severityColor}15` }}>
                      <AlertTriangle className="w-5 h-5" style={{ color: severityColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-[#333]">{event.parameter} Anomaly</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize" style={{ backgroundColor: `${severityColor}15`, color: severityColor }}>{severity}</span>
                        <span className="text-xs text-[#777]">Score: <strong>{event.anomalyScore.toFixed(2)}</strong></span>
                        <span className="text-xs text-[#777]">Persisted: <strong>{event.persistence}h</strong></span>
                      </div>
                      <p className="text-sm text-[#555] leading-relaxed">{event.message}</p>
                      <p className="text-xs text-[#AAA] mt-2">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdvancedLayout>
  );
}

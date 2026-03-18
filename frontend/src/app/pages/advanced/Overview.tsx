import { AdvancedLayout } from '../../components/AdvancedLayout';
import { KPICard } from '../../components/KPICard';
import { WQIGauge } from '../../components/WQIGauge';
import {
  currentReading, sensorData, getWQIStatus, calculateTimeToCritical,
  maintenanceHistory, systemMode, anomalyFlag, daysSinceInstall,
} from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useStatus } from '../../hooks/useStatus';
import { useHistory } from '../../hooks/useHistory';
import { useAnomalies } from '../../hooks/useAnomalies';
import { Thermometer, Droplets, Zap, Eye, Clock, AlertTriangle, CheckCircle, Activity, Cpu, Wrench, Wifi } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type SystemMode = 'ADAPTIVE' | 'COLD_START' | 'MAINTENANCE' | 'SENSOR_ERROR';

const modeConfig = {
  ADAPTIVE:     { label: 'AI Active',    color: '#2E75B6', bg: '#EFF6FF', icon: Cpu },
  COLD_START:   { label: 'Calibrating',  color: '#D97706', bg: '#FFFBEB', icon: Clock },
  MAINTENANCE:  { label: 'Maintenance',  color: '#64748B', bg: '#F1F5F9', icon: Wrench },
  SENSOR_ERROR: { label: 'Sensor Fault', color: '#DC2626', bg: '#FEF2F2', icon: Wifi },
};

export function AdvancedOverview() {
  const { reading: apiReading, anomalyFlag: apiAnomalyFlag, mode: apiMode } = useLatest();
  const { data: statusData } = useStatus();
  const { data: historyData } = useHistory();
  const { data: anomalyData } = useAnomalies();

  const live      = apiReading ?? currentReading;
  const liveMode  = (apiMode || statusData?.mode || systemMode) as SystemMode;
  const liveDays  = statusData
    ? Math.floor((Date.now() - new Date(statusData.install_date).getTime()) / 86400000)
    : daysSinceInstall;
  const liveFlag  = apiReading ? apiAnomalyFlag : anomalyFlag;

  const modeCfgBase = modeConfig[liveMode] ?? modeConfig.ADAPTIVE;
  const modeCfg = liveMode === 'COLD_START'
    ? { ...modeCfgBase, label: `Calibrating (${Math.max(0, 14 - liveDays)}d left)` }
    : modeCfgBase;
  const ModIcon = modeCfg.icon;

  const wqiInfo   = getWQIStatus(live.wqi);
  const hoursLeft = calculateTimeToCritical();
  const histData  = historyData ?? sensorData;

  const last48 = histData.slice(-48).filter((_, i) => i % 2 === 0).map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    Temperature: d.temperature,
    pH: d.pH,
    TDS: Math.round(d.tds / 10),
    Turbidity: d.turbidity,
    WQI: d.wqi,
  }));

  const tempTrend = histData.slice(-24).map(d => ({ value: d.temperature }));
  const phTrend   = histData.slice(-24).map(d => ({ value: d.pH }));
  const tdsTrend  = histData.slice(-24).map(d => ({ value: d.tds }));
  const turbTrend = histData.slice(-24).map(d => ({ value: d.turbidity }));

  const tempOk = live.temperature >= 24 && live.temperature <= 28;
  const phOk   = live.pH >= 6.5 && live.pH <= 7.5;
  const tdsOk  = live.tds >= 150 && live.tds <= 350;
  const turbOk = live.turbidity <= 5;

  return (
    <AdvancedLayout>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1F4E79]">System Overview</h2>
          <p className="text-sm text-[#555]">Real-time aquarium monitoring · AquaGuard</p>
        </div>
        <div className="flex items-center gap-3">
          {liveFlag === 1 && liveMode === 'ADAPTIVE' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#FFF7ED', color: '#EA580C', border: '1.5px solid #FED7AA' }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Anomaly Active
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: modeCfg.bg, color: modeCfg.color, border: `1.5px solid ${modeCfg.color}30` }}>
            <ModIcon className="w-3.5 h-3.5" />
            {modeCfg.label}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6 mb-8 flex flex-wrap items-center gap-6" style={{ background: `linear-gradient(135deg, ${wqiInfo.bgColor}, ${wqiInfo.bgColor}60)`, border: `1.5px solid ${wqiInfo.color}30` }}>
        <WQIGauge value={live.wqi} size={160} color={wqiInfo.color} bgColor={wqiInfo.bgColor} status={wqiInfo.status} />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-[#555] mb-4">{wqiInfo.message}</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: wqiInfo.color }} />
              <span className="text-sm text-[#444]">{hoursLeft === 0 ? 'Critical now' : `~${hoursLeft}h to critical`}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-[#444]">{anomalyData?.length ?? 0} anomalies detected</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-[#444]">4 sensors active</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[200px]">
          {[
            { label: 'Temperature', ok: tempOk },
            { label: 'pH Level',   ok: phOk },
            { label: 'TDS',        ok: tdsOk },
            { label: 'Turbidity',  ok: turbOk },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: ok ? '#E8F5E9' : '#FFF3E0' }}>
              {ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-orange-500" />}
              <span className="text-xs font-medium text-[#444]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KPICard title="Temperature" value={live.temperature} unit="°C"  icon={Thermometer} status={tempOk ? 'stable' : 'warning'} trend={tempTrend} />
        <KPICard title="pH Level"    value={live.pH}          icon={Droplets}   status={phOk   ? 'stable' : 'warning'} trend={phTrend} />
        <KPICard title="TDS"         value={live.tds}         unit="ppm" icon={Zap}        status={tdsOk  ? 'stable' : 'warning'} trend={tdsTrend} />
        <KPICard title="Turbidity"   value={live.turbidity}   unit="NTU" icon={Eye}        status={turbOk ? 'stable' : 'warning'} trend={turbTrend} />
      </div>

      <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-[#1F4E79] text-lg">Multi-Parameter Trend</h3>
            <p className="text-sm text-[#777]">Last 48 hours — all sensors</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={last48}>
            <defs>
              <linearGradient id="wqiArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2E75B6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2E75B6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="WQI"         stroke="#2E75B6" strokeWidth={2.5} fill="url(#wqiArea)" />
            <Area type="monotone" dataKey="Temperature" stroke="#E53E3E" strokeWidth={1.5} fill="none" />
            <Area type="monotone" dataKey="pH"          stroke="#3182CE" strokeWidth={1.5} fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] text-lg mb-4">Recent Events</h3>
        <div className="space-y-3">
          {maintenanceHistory.slice(0, 3).map((event, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: event.type === 'alert' ? '#FF9800' : '#4CAF50' }} />
              <div className="flex-1">
                <p className="text-sm text-[#333]">{event.message}</p>
                <p className="text-xs text-[#AAA] mt-0.5">{new Date(event.date).toLocaleString()}</p>
              </div>
              {event.wqi && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">WQI {event.wqi}</span>}
            </div>
          ))}
        </div>
      </div>
    </AdvancedLayout>
  );
}

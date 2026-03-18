import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { SimpleLayout } from '../../components/SimpleLayout';
import { WQIGauge } from '../../components/WQIGauge';
import {
  currentReading, getWQIStatus, calculateTimeToCritical, sensorData,
  systemMode, daysSinceInstall, anomalyFlag,
} from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useStatus } from '../../hooks/useStatus';
import { useHistory } from '../../hooks/useHistory';
import { useMaintenance } from '../../hooks/useMaintenance';
import {
  Thermometer, Droplets, Zap, Eye, ChevronRight, Clock,
  AlertTriangle, Cpu, Wrench, CheckCircle, AlertCircle, Wifi,
  Activity, History,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

type SystemMode = 'ADAPTIVE' | 'COLD_START' | 'MAINTENANCE' | 'SENSOR_ERROR';

const modeConfig = {
  ADAPTIVE:     { label: 'AI Active',    color: '#38BDF8', bg: 'rgba(56,189,248,0.15)',   icon: Cpu },
  COLD_START:   { label: 'Calibrating',  color: '#FBB040', bg: 'rgba(251,176,64,0.15)',   icon: Clock },
  MAINTENANCE:  { label: 'Maintenance',  color: '#94A3B8', bg: 'rgba(148,163,184,0.15)',  icon: Wrench },
  SENSOR_ERROR: { label: 'Sensor Fault', color: '#F87171', bg: 'rgba(248,113,113,0.15)',  icon: Wifi },
};

export function SimpleOverview() {
  const navigate = useNavigate();

  const { reading: apiReading, anomalyFlag: apiAnomalyFlag, mode: apiMode } = useLatest();
  const { data: statusData } = useStatus();
  const { data: historyData } = useHistory();
  const { startMaintenance, stopMaintenance } = useMaintenance();

  // Resolved values — API wins, mock is fallback
  const live       = apiReading ?? currentReading;
  const liveMode   = (apiMode || statusData?.mode || systemMode) as SystemMode;
  const liveDays   = statusData
    ? Math.floor((Date.now() - new Date(statusData.install_date).getTime()) / 86400000)
    : daysSinceInstall;
  const liveFlag   = apiReading ? apiAnomalyFlag : anomalyFlag;

  // Maintenance toggle — optimistic local state, synced with server
  const [maintenance, setMaintenance] = useState(systemMode === 'MAINTENANCE');
  useEffect(() => {
    if (statusData?.maintenance_active !== undefined) {
      setMaintenance(statusData.maintenance_active);
    }
  }, [statusData?.maintenance_active]);

  const handleMaintenanceToggle = async () => {
    const next = !maintenance;
    setMaintenance(next);
    try {
      if (next) await startMaintenance();
      else await stopMaintenance();
    } catch {
      setMaintenance(!next); // revert on error
    }
  };

  const effectiveMode: SystemMode = maintenance ? 'MAINTENANCE' : liveMode;

  const modeCfgBase = modeConfig[effectiveMode] ?? modeConfig.ADAPTIVE;
  const modeCfg = effectiveMode === 'COLD_START'
    ? { ...modeCfgBase, label: `Calibrating (${Math.max(0, 14 - liveDays)}d left)` }
    : modeCfgBase;
  const ModIcon = modeCfg.icon;

  const wqi      = getWQIStatus(live.wqi);
  const hoursLeft = calculateTimeToCritical();

  const histData   = historyData ?? sensorData;
  const sparkData  = histData.slice(-24).map(d => ({ v: d.wqi }));
  const weeklyData = histData
    .filter((_, i) => i % 12 === 0)
    .map(d => ({
      date: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      wqi: d.wqi,
    }));

  const sensors = [
    { icon: Thermometer, label: 'Temperature', value: `${live.temperature.toFixed(1)}°C`, color: '#F87171', ok: live.temperature >= 24 && live.temperature <= 28, range: '24–28°C' },
    { icon: Droplets,   label: 'pH Level',     value: live.pH.toFixed(2),                 color: '#60A5FA', ok: live.pH >= 6.5 && live.pH <= 7.5,                range: '6.5–7.5' },
    { icon: Zap,        label: 'TDS',          value: `${live.tds} ppm`,                  color: '#FBBF24', ok: live.tds <= 350,                                  range: '< 350 ppm' },
    { icon: Eye,        label: 'Turbidity',    value: `${live.turbidity.toFixed(1)} NTU`, color: '#A78BFA', ok: live.turbidity <= 5,                              range: '< 5 NTU' },
  ];

  return (
    <SimpleLayout>
      <div className="pb-28 lg:pb-0">

        {/* ═══════════════════ HERO ═══════════════════ */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2942 0%, #1A3D5C 45%, #006B6B 100%)' }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(46,117,182,0.25) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,107,107,0.3) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <div className="relative px-5 pt-4 pb-4 lg:px-10 lg:pt-5 lg:pb-5">
            {/* Badges row */}
            <div className="flex items-center justify-end gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: modeCfg.bg, color: modeCfg.color, border: `1px solid ${modeCfg.color}40` }}>
                <ModIcon className="w-3.5 h-3.5" />
                {modeCfg.label}
              </div>
              {liveFlag === 1 && effectiveMode === 'ADAPTIVE' && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(251,146,60,0.2)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.3)' }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Anomaly active
                </div>
              )}
            </div>

            {/* Gauge + WQI info */}
            <div className="flex items-center gap-5 lg:gap-8">
              {/* Gauge — arc only, bigger, no duplicate text */}
              <div className="relative flex-shrink-0">
                <WQIGauge
                  value={maintenance ? 0 : live.wqi}
                  size={185}
                  color={maintenance ? '#475569' : wqi.color}
                  bgColor="rgba(255,255,255,0.06)"
                  status={maintenance ? 'Paused' : wqi.status}
                  arcOnly
                />
                {/* Score centred inside the arc */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {maintenance ? (
                    <>
                      <Wrench className="w-8 h-8 text-slate-400 mb-1" />
                      <p className="text-xs font-black text-slate-400 tracking-widest">PAUSED</p>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-black leading-none tabular-nums" style={{ color: wqi.color }}>{live.wqi}</span>
                      <span className="text-xs text-blue-300 mt-0.5 tracking-wide">/ 100 WQI</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {maintenance ? (
                  <>
                    <p className="text-xl font-black text-slate-300 mb-1.5">Sensors paused</p>
                    <p className="text-sm text-slate-400">Tap the toggle below when your water change is complete.</p>
                  </>
                ) : (
                  <>
                    {/* Status badge + label — no duplicate score */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: `${wqi.color}25`, color: wqi.color }}>{wqi.status}</span>
                      <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold">Water Quality</p>
                    </div>
                    <p className="text-sm text-blue-200 mb-2 leading-relaxed">{wqi.message}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {hoursLeft > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <Clock className="w-3.5 h-3.5" />
                          ~{hoursLeft}h to critical
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-xs text-blue-400">Live · {new Date(live.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="h-10 -mx-0.5">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                          <defs>
                            <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={wqi.color} stopOpacity={0.4} />
                              <stop offset="100%" stopColor={wqi.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={wqi.color} strokeWidth={2.5} fill="url(#heroSpark)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                      <p className="text-[11px] text-blue-400 mt-1">Last 24h</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {effectiveMode === 'COLD_START' && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,176,64,0.12)', border: '1px solid rgba(251,176,64,0.25)' }}>
                <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300">Calibrating — keep tank stable. <span className="font-bold">AI unlocks on Day 15.</span></p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ BODY ═══════════════════ */}
        <div className="px-4 pt-4 max-w-2xl mx-auto lg:max-w-none lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {sensors.map(({ icon: Icon, label, value, color, ok, range }) => (
              <div key={label} className="bg-white rounded-2xl px-4 py-5 relative overflow-hidden flex flex-col justify-between" style={{ minHeight: 130, border: `1.5px solid ${ok ? '#F0FDF4' : '#FFF7ED'}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div className="absolute -top-5 -right-5 w-14 h-14 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${color}, transparent)`, opacity: 0.08 }} />
                {/* Top: icon + label in icon color, check on right */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
                  </div>
                  {ok ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                </div>
                {/* Bottom: range left, value right */}
                <div className="flex items-end justify-between gap-2">
                  <p className="text-[9px]" style={{ color: ok ? '#16A34A' : '#B45309' }}>
                    {ok ? '✓ Good' : '! Watch'} · {range}
                  </p>
                  <p className="text-2xl font-black leading-none shrink-0" style={{ color: ok ? '#16A34A' : '#B45309' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl px-4 pt-3.5 pb-2 mb-4 shadow-sm" style={{ border: '1.5px solid #F1F5F9' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">7-Day Quality Trend</p>
              <p className="text-[10px] text-[#CBD5E1]">WQI score</p>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={wqi.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={wqi.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="wqi" stroke={wqi.color} strokeWidth={2.5} fill="url(#trendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={handleMaintenanceToggle}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 transition-all active:scale-[0.99]"
            style={{
              background: maintenance ? 'linear-gradient(135deg, #0F2942, #1A3D5C)' : 'white',
              border: `1.5px solid ${maintenance ? '#2E75B6' : '#E2E8F0'}`,
              boxShadow: maintenance ? '0 4px 16px rgba(46,117,182,0.2)' : '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: maintenance ? 'rgba(255,255,255,0.1)' : '#F0F9FF' }}>
              <Wrench className="w-4 h-4" style={{ color: maintenance ? '#38BDF8' : '#2E75B6' }} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-bold text-sm leading-tight" style={{ color: maintenance ? 'white' : '#1A3D5C' }}>Water Change</p>
              <p className="text-[11px] truncate" style={{ color: maintenance ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>
                {maintenance ? 'Tap when done — sensors resume' : 'Tap before starting a water change'}
              </p>
            </div>
            <div className="flex-shrink-0 w-11 h-6 rounded-full p-0.5 transition-all duration-300" style={{ background: maintenance ? '#38BDF8' : '#E2E8F0' }}>
              <div className="w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300" style={{ transform: maintenance ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => navigate('/simple/status')} className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white transition-all hover:shadow-md active:scale-[0.98]" style={{ border: '1.5px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Activity className="w-4 h-4 text-blue-500" /></div>
                <div className="text-left">
                  <p className="font-bold text-sm text-[#1E293B]">Detailed Status</p>
                  <p className="text-[10px] text-[#94A3B8]">All sensor readings</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] flex-shrink-0" />
            </button>
            <button onClick={() => navigate('/simple/history')} className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white transition-all hover:shadow-md active:scale-[0.98]" style={{ border: '1.5px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><History className="w-4 h-4 text-purple-500" /></div>
                <div className="text-left">
                  <p className="font-bold text-sm text-[#1E293B]">Maintenance Log</p>
                  <p className="text-[10px] text-[#94A3B8]">Past events</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] flex-shrink-0" />
            </button>
          </div>

          <button onClick={() => navigate('/advanced/overview')} className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all hover:shadow-lg active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #1A3D5C 0%, #2E75B6 100%)', boxShadow: '0 4px 14px rgba(46,117,182,0.3)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}><Cpu className="w-4 h-4 text-white" /></div>
              <div className="text-left">
                <p className="font-bold text-sm text-white">Advanced Analytics</p>
                <p className="text-[10px] text-blue-200">AI forecasting · anomaly detection · technician view</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
          </button>
          <div className="h-10" />
        </div>
      </div>
    </SimpleLayout>
  );
}

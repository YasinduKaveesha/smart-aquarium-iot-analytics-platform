import { useState } from 'react';
import { AdvancedLayout } from '../../components/AdvancedLayout';
import { sensorData } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useHistory } from '../../hooks/useHistory';
import { Thermometer, Droplets, Zap, Eye, Wifi } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';

type SensorKey = 'temperature' | 'pH' | 'tds' | 'turbidity';

const sensors: { key: SensorKey; label: string; unit: string; color: string; icon: typeof Thermometer; min: number; max: number; description: string }[] = [
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#E53E3E', icon: Thermometer, min: 24, max: 28, description: 'Water temperature affecting fish metabolism and oxygen levels' },
  { key: 'pH',          label: 'pH Level',    unit: '',   color: '#3182CE', icon: Droplets,    min: 6.5, max: 7.5, description: 'Acidity/alkalinity balance critical for fish health' },
  { key: 'tds',         label: 'TDS',         unit: 'ppm',color: '#D69E2E', icon: Zap,         min: 150, max: 350, description: 'Total dissolved solids indicating water mineral content' },
  { key: 'turbidity',   label: 'Turbidity',   unit: 'NTU',color: '#805AD5', icon: Eye,         min: 0,   max: 5,   description: 'Water clarity — particles and suspended matter' },
];

export function SensorAnalytics() {
  const [selectedSensor, setSelectedSensor] = useState<SensorKey>('temperature');
  const [timeRange, setTimeRange] = useState<'24h' | '48h' | '7d'>('24h');
  const { mode: apiMode, sensorErrors } = useLatest();
  const { data: historyData } = useHistory();

  const isSensorError = apiMode === 'SENSOR_ERROR';
  const phFailed = isSensorError && sensorErrors.some(e => e.toLowerCase().includes('ph'));

  const histData = historyData ?? sensorData;
  const effectiveSensor = (selectedSensor === 'pH' && phFailed) ? 'temperature' : selectedSensor;
  const sensor   = sensors.find(s => s.key === effectiveSensor)!;

  const rangeMap = { '24h': 24, '48h': 48, '7d': 168 };
  const points   = rangeMap[timeRange];
  const step     = timeRange === '7d' ? 4 : 1;

  const chartData = histData.slice(-points).filter((_, i) => i % step === 0).map(d => ({
    time: timeRange === '7d'
      ? new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    value: d[effectiveSensor],
    min: sensor.min,
    max: sensor.max,
  }));

  const current  = histData[histData.length - 1][effectiveSensor];
  const prev24   = histData[histData.length - 25]?.[effectiveSensor] ?? current;
  const change   = ((current - prev24) / prev24 * 100).toFixed(1);
  const isInRange = current >= sensor.min && current <= sensor.max;

  return (
    <AdvancedLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1F4E79] mb-1">Sensor Analytics</h2>
        <p className="text-[#555]">Detailed per-sensor historical data and statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sensors.map((s) => {
          const Icon = s.icon;
          const val  = histData[histData.length - 1][s.key];
          const isFailed = s.key === 'pH' && phFailed;
          const ok   = isFailed ? false : (val >= s.min && val <= s.max);
          const active = selectedSensor === s.key;
          return (
            <button key={s.key} onClick={() => !isFailed && setSelectedSensor(s.key)} className={`p-5 rounded-2xl text-left transition-all duration-200 ${isFailed ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md'}`} style={{ border: isFailed ? '2px solid #FECACA' : active ? `2px solid ${s.color}` : '2px solid transparent', background: isFailed ? '#FEF2F2' : active ? `${s.color}10` : 'white', boxShadow: active && !isFailed ? `0 0 0 4px ${s.color}15` : '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: isFailed ? '#FEE2E2' : `${s.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: isFailed ? '#EF4444' : s.color }} />
                </div>
                {isFailed ? <Wifi className="w-4 h-4 text-red-500" /> : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ok ? '#4CAF50' : '#FF9800' }} />}
              </div>
              <p className="text-xs font-medium mb-0.5" style={{ color: isFailed ? '#EF4444' : '#777' }}>{s.label}</p>
              {isFailed
                ? <p className="text-xl font-black text-red-500">FAULT</p>
                : <p className="text-xl font-black" style={{ color: s.color }}>{val.toFixed(s.key === 'tds' ? 0 : 1)}<span className="text-xs font-normal text-[#999] ml-0.5">{s.unit}</span></p>
              }
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-[#1F4E79] text-lg flex items-center gap-2">
              <sensor.icon className="w-5 h-5" style={{ color: sensor.color }} />
              {sensor.label} Trend
            </h3>
            <p className="text-sm text-[#777] mt-0.5">{sensor.description}</p>
          </div>
          <div className="flex gap-2">
            {(['24h', '48h', '7d'] as const).map(range => (
              <button key={range} onClick={() => setTimeRange(range)} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ background: timeRange === range ? sensor.color : '#F5F5F5', color: timeRange === range ? 'white' : '#555' }}>
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: `${sensor.color}08` }}>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: sensor.color }}>{current.toFixed(sensor.key === 'tds' ? 0 : 2)}</p>
            <p className="text-xs text-[#777] mt-0.5">Current</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: Number(change) > 0 ? '#F44336' : '#4CAF50' }}>{Number(change) > 0 ? '+' : ''}{change}%</p>
            <p className="text-xs text-[#777] mt-0.5">24h Change</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: isInRange ? '#4CAF50' : '#FF9800' }}>{isInRange ? 'Good' : 'Watch'}</p>
            <p className="text-xs text-[#777] mt-0.5">Status</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={(val: number) => [`${val.toFixed(2)} ${sensor.unit}`, sensor.label]} />
            <ReferenceLine y={sensor.min} stroke={sensor.color} strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Min', fill: sensor.color, fontSize: 10 }} />
            <ReferenceLine y={sensor.max} stroke={sensor.color} strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Max', fill: sensor.color, fontSize: 10 }} />
            <Line type="monotone" dataKey="value" stroke={sensor.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: sensor.color }} />
            <Brush dataKey="time" height={24} stroke={sensor.color} fill="#FAFAFA" travellerWidth={6} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-4">Optimal Range Guide</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#777]">Min: {sensor.min} {sensor.unit}</span>
              <span className="text-[#777]">Max: {sensor.max} {sensor.unit}</span>
            </div>
            <div className="h-4 rounded-full bg-gray-100 relative">
              <div className="absolute inset-y-0 rounded-full" style={{ left: 0, right: 0, background: `linear-gradient(to right, #FFF3E0 0%, ${sensor.color}30 30%, ${sensor.color}30 70%, #FFF3E0 100%)` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-700" style={{ left: `${Math.min(Math.max((current - sensor.min) / (sensor.max - sensor.min), 0), 1) * 100}%`, backgroundColor: isInRange ? sensor.color : '#FF9800', transform: 'translateY(-50%) translateX(-50%)' }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-orange-400">Too Low</span>
              <span style={{ color: sensor.color }} className="font-medium">Optimal Zone</span>
              <span className="text-orange-400">Too High</span>
            </div>
          </div>
          <div className="px-6 py-4 rounded-xl text-center" style={{ backgroundColor: isInRange ? '#E8F5E9' : '#FFF3E0' }}>
            <p className="text-2xl font-black" style={{ color: isInRange ? '#4CAF50' : '#FF9800' }}>{current.toFixed(sensor.key === 'tds' ? 0 : 2)}</p>
            <p className="text-xs text-[#777]">{sensor.unit || 'current'}</p>
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
}

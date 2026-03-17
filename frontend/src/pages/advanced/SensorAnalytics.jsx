import React, { useState } from 'react';
import { Thermometer, Droplets, Beaker, Eye, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AdvancedLayout from '../../components/AdvancedLayout';
import { sensorData24h } from '../../data/mockData';

const timeRanges = ['6h', '24h', '7d', '30d'];
const paramDefs = [
  { key: 'temperature', label: 'Temperature', color: '#FF9800', icon: Thermometer },
  { key: 'ph', label: 'pH', color: '#4CAF50', icon: Droplets },
  { key: 'tds', label: 'TDS', color: '#2E75B6', icon: Beaker },
  { key: 'turbidity', label: 'Turbidity', color: '#F44336', icon: Eye },
  { key: 'wqi', label: 'WQI', color: '#006B6B', icon: Activity },
];

const paramDetails = [
  { label: 'Temperature', value: '26.2', unit: '°C', color: '#FF9800' },
  { label: 'pH Level', value: '7.1', unit: '', color: '#4CAF50' },
  { label: 'TDS', value: '312', unit: ' ppm', color: '#2E75B6' },
  { label: 'Turbidity', value: '3.2', unit: ' NTU', color: '#F44336' },
];

const SensorAnalytics = () => {
  const [activeRange, setActiveRange] = useState('24h');
  const [activeParams, setActiveParams] = useState(new Set(['temperature', 'ph', 'tds', 'turbidity', 'wqi']));

  const toggle = (key) => {
    setActiveParams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const sliced = activeRange === '6h' ? sensorData24h.slice(-6) : sensorData24h;

  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Time Range</h2>
              <div className="flex gap-2">
                {timeRanges.map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeRange === r ? 'text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={activeRange === r ? { background: '#2E75B6' } : {}}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Parameters</h2>
              <div className="flex flex-wrap gap-2">
                {paramDefs.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      activeParams.has(key) ? 'text-white' : 'bg-white'
                    }`}
                    style={activeParams.has(key) ? { background: color, borderColor: color } : { borderColor: color, color }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Sensor Data — {activeRange}</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={sliced} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#aaa' }} interval={Math.max(1, Math.floor(sliced.length / 10))} />
              <YAxis tick={{ fontSize: 10, fill: '#aaa' }} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
              <ReferenceLine y={7.0} stroke="#4CAF50" strokeDasharray="4 4" label={{ value: 'pH=7.0', fontSize: 10, fill: '#4CAF50' }} />
              <ReferenceLine y={70} stroke="#006B6B" strokeDasharray="4 4" label={{ value: 'WQI=70', fontSize: 10, fill: '#006B6B' }} />
              {paramDefs.map(({ key, color, label }) =>
                activeParams.has(key) ? (
                  <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={key === 'wqi' ? 3 : 1.5} dot={false} name={label} />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {paramDetails.map(({ label, value, unit, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border-l-4 hover:shadow-md transition-all duration-300"
              style={{ borderLeftColor: color }}>
              <div className="text-xs text-gray-500 mb-2">{label}</div>
              <div className="text-3xl font-bold" style={{ color }}>
                {value}<span className="text-lg">{unit}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full" style={{ background: color + '20' }}>
                <div className="h-full rounded-full" style={{ width: '65%', background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default SensorAnalytics;

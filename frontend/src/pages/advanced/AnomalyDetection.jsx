import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import AdvancedLayout from '../../components/AdvancedLayout';
import { anomalyData, anomalies } from '../../data/mockData';

const severityColors = { High: '#F44336', Medium: '#FF9800', Low: '#F97316' };

const AnomalyDetection = () => {
  const [selected, setSelected] = useState(0);

  const displayData = anomalyData.filter((_, i) => i % 2 === 0);

  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: AlertTriangle, label: '3 Anomalies', sub: 'Detected total', color: '#FF9800', bg: '#FFF3E0' },
            { icon: Target, label: '1 Recent', sub: 'Last 24 hours', color: '#2E75B6', bg: '#EFF6FF' },
            { icon: ShieldCheck, label: '0.87 Accuracy', sub: 'Detection score', color: '#4CAF50', bg: '#F0FFF4' },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">{label}</div>
                <div className="text-xs text-gray-500">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Anomaly List */}
          <div className="space-y-3">
            {anomalies.map((a, i) => {
              const sc = severityColors[a.severity];
              return (
                <div
                  key={a.id}
                  onClick={() => setSelected(i)}
                  className={`bg-white rounded-xl p-4 shadow-sm border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selected === i ? 'ring-2' : ''
                  }`}
                  style={{
                    borderLeftColor: sc,
                    ...(selected === i ? { ringColor: sc, boxShadow: `0 0 0 2px ${sc}40` } : {}),
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">{a.param} Anomaly</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: sc + '18', color: sc }}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{a.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{a.time}</span>
                    <span className="text-xs font-bold" style={{ color: sc }}>Score: {a.score}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">3-Day Sensor Timeline — Anomaly Periods Highlighted</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#aaa' }} interval={8} />
                <YAxis tick={{ fontSize: 10, fill: '#aaa' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                {/* Anomaly shading */}
                {anomalies.map((a) => (
                  <ReferenceArea
                    key={a.id}
                    x1={displayData[Math.floor(a.start / 2)]?.time}
                    x2={displayData[Math.floor(a.end / 2)]?.time}
                    fill="#F4433618"
                    strokeOpacity={0}
                  />
                ))}
                <Line type="monotone" dataKey="tds" stroke="#2E75B6" strokeWidth={1.5} dot={false} name="TDS" />
                <Line type="monotone" dataKey="ph" stroke="#4CAF50" strokeWidth={1.5} dot={false} name="pH" />
                <Line type="monotone" dataKey="turbidity" stroke="#F44336" strokeWidth={1.5} dot={false} name="Turbidity" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detection Method */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Detection Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Statistical Analysis', desc: 'Z-score deviation thresholds applied per parameter', color: '#2E75B6' },
              { title: 'Persistence Scoring', desc: 'Sustained anomalous values increase detection confidence', color: '#4CAF50' },
              { title: 'Contextual Rules', desc: 'Domain-specific rules account for correlated parameter changes', color: '#8B5CF6' },
            ].map(({ title, desc, color }) => (
              <div key={title} className="rounded-xl p-4" style={{ background: color + '0F' }}>
                <div className="font-semibold text-sm mb-1" style={{ color }}>{title}</div>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default AnomalyDetection;

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Thermometer, Droplets, Beaker, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdvancedLayout from '../../components/AdvancedLayout';
import { sensorData24h, wqiContributions } from '../../data/mockData';

const kpiCards = [
  { label: 'Temperature', value: '26.2°C', status: 'Good', trend: 'up', icon: Thermometer, color: '#4CAF50', sparkColor: '#4CAF50', key: 'temperature' },
  { label: 'pH Level', value: '7.1', status: 'Good', trend: 'up', icon: Droplets, color: '#4CAF50', sparkColor: '#4CAF50', key: 'ph' },
  { label: 'TDS', value: '312 ppm', status: 'Warning', trend: 'down', icon: Beaker, color: '#FF9800', sparkColor: '#FF9800', key: 'tds' },
  { label: 'Turbidity', value: '3.2 NTU', status: 'Warning', trend: 'down', icon: Eye, color: '#FF9800', sparkColor: '#FF9800', key: 'turbidity' },
];

const recentAlerts = [
  { time: '14:32', msg: 'WQI dropped to 62 — maintenance recommended', color: '#FF9800' },
  { time: '12:10', msg: 'TDS rising above 300 ppm threshold', color: '#F44336' },
  { time: '09:45', msg: 'pH level stabilizing at 7.1', color: '#4CAF50' },
  { time: 'Mar 14', msg: 'Temperature fluctuation detected', color: '#FF9800' },
  { time: 'Mar 13', msg: 'Water change recommended', color: '#2E75B6' },
];

const Sparkline = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data.slice(-12)} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
      <Line type="monotone" dataKey="wqi" stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

const AdvancedOverview = () => {
  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, status, trend, icon: Icon, color, key }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color }} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                {trend === 'up' ? <TrendingUp size={14} style={{ color }} /> : <TrendingDown size={14} style={{ color }} />}
              </div>
              <div className="text-xl font-bold text-gray-800">{value}</div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
                style={{ background: color + '18', color }}>
                {status}
              </span>
              <div className="mt-2">
                <Sparkline data={sensorData24h} color={color} />
              </div>
            </div>
          ))}
        </div>

        {/* WQI Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Water Quality Index</div>
              <div className="text-5xl font-bold" style={{ color: '#FF9800' }}>62 <span className="text-2xl text-gray-400">/ 100</span></div>
              <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                style={{ background: '#FFF3E0', color: '#FF9800' }}>
                ⚠ Recommended Soon
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-gray-800">62</div>
                <div className="text-xs text-gray-500">Current Score</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <div className="text-sm font-bold text-orange-600">Recommended</div>
                <div className="text-xs text-gray-500">Maintenance State</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-red-500">18h</div>
                <div className="text-xs text-gray-500">Time to Critical</div>
              </div>
            </div>
          </div>

          {/* Contribution Bars */}
          <div className="space-y-2">
            {wqiContributions.map(({ param, weight, contribution, color }) => (
              <div key={param} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-20 flex-shrink-0">{param} ({weight}%)</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(contribution / 62) * 100}%`, background: color }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{contribution.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sensor Trends */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 mb-4">24h Sensor Trends</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={sensorData24h} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#aaa' }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: '#aaa' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="wqi" stroke="#006B6B" strokeWidth={2.5} dot={false} name="WQI" />
                <Line type="monotone" dataKey="temperature" stroke="#FF9800" strokeWidth={1.5} dot={false} name="Temp" />
                <Line type="monotone" dataKey="ph" stroke="#4CAF50" strokeWidth={1.5} dot={false} name="pH" />
                <Line type="monotone" dataKey="turbidity" stroke="#8B5CF6" strokeWidth={1.5} dot={false} name="Turbidity" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" /> Recent Alerts
            </h2>
            <div className="space-y-3">
              {recentAlerts.map((a, i) => (
                <div key={i} className="flex gap-3 items-start p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: a.color }} />
                  <div>
                    <p className="text-xs text-gray-700">{a.msg}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default AdvancedOverview;

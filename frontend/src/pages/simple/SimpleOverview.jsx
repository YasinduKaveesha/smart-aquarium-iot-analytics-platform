import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, Droplets, Beaker, Eye, ArrowRight, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SimpleLayout from '../../components/SimpleLayout';
import WQIGauge from '../../components/WQIGauge';
import { sevenDayTrend } from '../../data/mockData';

const paramCards = [
  { label: 'Temperature', value: '26.2', unit: '°C', status: 'Good', color: '#F97316', icon: Thermometer, bg: '#FFF7ED' },
  { label: 'pH Level', value: '7.1', unit: '', status: 'Good', color: '#2E75B6', icon: Droplets, bg: '#EFF6FF' },
  { label: 'TDS', value: '312', unit: ' ppm', status: 'Good', color: '#006B6B', icon: Beaker, bg: '#F0FAFA' },
  { label: 'Turbidity', value: '3.2', unit: ' NTU', status: 'Good', color: '#8B5CF6', icon: Eye, bg: '#F5F3FF' },
];

const SimpleOverview = () => {
  const navigate = useNavigate();

  return (
    <SimpleLayout>
      {/* Gradient Header */}
      <div className="text-white p-6 pb-8" style={{ background: 'linear-gradient(145deg, #1F4E79, #2E75B6, #006B6B)' }}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <WQIGauge value={62} size={160} color="#FF9800" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-blue-200 text-sm">Live</span>
            </div>
            <h1 className="text-3xl font-bold">WQI Score: 62</h1>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#FF980030', border: '1px solid #FF9800' }}>
              <span style={{ color: '#FF9800' }}>⚠ Recommended Soon</span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-blue-200 text-sm">
              <Clock size={14} />
              <span>Last updated 14:32</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Parameter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {paramCards.map(({ label, value, unit, status, color, icon: Icon, bg }) => (
            <div key={label} className="rounded-xl p-4 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color }}>{value}<span className="text-base">{unit}</span></div>
              <div className="mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#4CAF5020', color: '#4CAF50' }}>
                  ✓ {status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 7-Day Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: '#2E75B6' }} />
            7-Day Quality Trend
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sevenDayTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="wqiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E75B6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2E75B6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#888' }} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 12, fill: '#888' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v) => [v, 'WQI']}
              />
              <Area type="monotone" dataKey="wqi" stroke="#2E75B6" strokeWidth={2.5} fill="url(#wqiGrad)" dot={{ fill: '#2E75B6', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/simple/status')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-white font-semibold transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(to right, #1F4E79, #2E75B6)' }}
          >
            View Detailed Status
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/simple/history')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ color: '#1F4E79', borderColor: '#1F4E79' }}
          >
            Maintenance History
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default SimpleOverview;

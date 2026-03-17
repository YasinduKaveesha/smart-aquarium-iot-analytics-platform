import React from 'react';
import { AlertTriangle, TrendingDown, Brain, BarChart2, Lightbulb } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import AdvancedLayout from '../../components/AdvancedLayout';
import { forecastData } from '../../data/mockData';

const forecastCards = [
  { label: '+6 Hours', wqi: 60, color: '#FF9800' },
  { label: '+12 Hours', wqi: 56, color: '#F97316' },
  { label: '+18 Hours', wqi: 52, color: '#F44336' },
  { label: '+24 Hours', wqi: 48, color: '#F44336' },
];

const insights = [
  { color: '#F44336', text: 'WQI predicted to drop below 50 within 18 hours — schedule maintenance.' },
  { color: '#FF9800', text: 'TDS is the primary driver of quality decline; a 30% water change is recommended.' },
  { color: '#4CAF50', text: 'pH and Temperature remain stable — no immediate concern with those parameters.' },
];

const ForecastPrediction = () => {
  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* Forecast Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {forecastCards.map(({ label, wqi, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 text-center">
              <div className="text-xs text-gray-500 mb-2">{label}</div>
              <div className="text-4xl font-bold mb-1" style={{ color }}>{wqi}</div>
              <div className="text-xs text-gray-400">WQI</div>
              <div className="mt-2 flex items-center justify-center gap-1 text-xs" style={{ color }}>
                <TrendingDown size={12} />
                <span>{wqi < 50 ? 'Critical' : 'Warning'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Alert Banner */}
        <div className="rounded-xl p-4 border-2 flex items-center gap-3" style={{ background: '#FFF3E0', borderColor: '#FF9800' }}>
          <AlertTriangle size={22} style={{ color: '#FF9800' }} className="flex-shrink-0" />
          <div>
            <div className="font-semibold text-orange-700">Predicted Maintenance Window</div>
            <div className="text-sm text-orange-600 mt-0.5">WQI will reach critical level (~50) in approximately <strong>18 hours</strong>. Schedule a water change soon.</div>
          </div>
        </div>

        {/* Main Forecast Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Brain size={18} style={{ color: '#2E75B6' }} />
            WQI Forecast — Historical + Predicted
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={forecastData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006B6B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#006B6B" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E75B6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2E75B6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#aaa' }} interval={5} />
              <YAxis domain={[20, 100]} tick={{ fontSize: 10, fill: '#aaa' }} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
              <ReferenceLine y={70} stroke="#4CAF50" strokeDasharray="4 4" label={{ value: 'Good', position: 'insideTopRight', fontSize: 10, fill: '#4CAF50' }} />
              <ReferenceLine y={50} stroke="#FF9800" strokeDasharray="4 4" label={{ value: 'Warning', position: 'insideTopRight', fontSize: 10, fill: '#FF9800' }} />
              <ReferenceLine y={30} stroke="#F44336" strokeDasharray="4 4" label={{ value: 'Critical', position: 'insideTopRight', fontSize: 10, fill: '#F44336' }} />
              <ReferenceLine x="NOW" stroke="#555" strokeWidth={2} label={{ value: 'NOW', position: 'top', fontSize: 10, fill: '#555' }} />
              <Area type="monotone" dataKey="historical" stroke="#006B6B" strokeWidth={2.5} fill="url(#histGrad)" connectNulls={false} dot={false} name="Historical" />
              <Area type="monotone" dataKey="forecast" stroke="#2E75B6" strokeWidth={2} strokeDasharray="6 3" fill="url(#foreGrad)" connectNulls={false} dot={false} name="Forecast" />
              <Area type="monotone" dataKey="confidence_upper" stroke="none" fill="#2E75B620" connectNulls={false} dot={false} legendType="none" />
              <Area type="monotone" dataKey="confidence_lower" stroke="none" fill="white" connectNulls={false} dot={false} legendType="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Detail Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Model Info */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 size={16} style={{ color: '#2E75B6' }} /> Prediction Model
            </h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Algorithm', 'Time Series Regression'],
                  ['Training Window', '7 Day History'],
                  ['Confidence', '85%'],
                  ['Next Update', '15 minutes'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2.5 text-gray-500">{k}</td>
                    <td className="py-2.5 font-medium text-gray-800 text-right">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lightbulb size={16} style={{ color: '#FF9800' }} /> Key Insights
            </h2>
            <div className="space-y-3">
              {insights.map(({ color, text }, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: color + '10' }}>
                  <div className="w-1.5 rounded-full flex-shrink-0 self-stretch" style={{ background: color }} />
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default ForecastPrediction;

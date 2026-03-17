import React from 'react';
import { Fish, Thermometer, Droplets, Beaker, Eye, Wind, Droplet, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import AdvancedLayout from '../../components/AdvancedLayout';

const paramGauges = [
  { label: 'Temperature', value: 26.2, unit: '°C', min: 24, max: 30, color: '#FF9800', icon: Thermometer, status: 'Optimal' },
  { label: 'pH Level', value: 7.1, unit: '', min: 6.0, max: 7.5, color: '#2E75B6', icon: Droplets, status: 'Optimal' },
  { label: 'TDS', value: 312, unit: ' ppm', min: 0, max: 500, color: '#006B6B', icon: Beaker, status: 'Optimal' },
  { label: 'Turbidity', value: 3.2, unit: ' NTU', min: 0, max: 10, color: '#8B5CF6', icon: Eye, status: 'Optimal' },
  { label: 'Dissolved Oxygen', value: 6.8, unit: ' mg/L', min: 5, max: 10, color: '#4CAF50', icon: Wind, status: 'Optimal' },
];

const recommendations = [
  { label: 'Perform Water Change', desc: '30% water change recommended to reduce TDS.', color: '#FF9800', icon: Droplet },
  { label: 'Monitor Feeding', desc: 'Excess feed raises TDS; feed sparingly.', color: '#2E75B6', icon: Fish },
  { label: 'Temperature Stability', desc: 'Keep heater consistent. Fluctuations stress fish.', color: '#4CAF50', icon: Thermometer },
  { label: 'Ensure Oxygenation', desc: 'Maintain aeration for optimal dissolved oxygen.', color: '#006B6B', icon: Wind },
];

const GaugeCard = ({ label, value, unit, min, max, color, icon: Icon, status }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#4CAF5018', color: '#4CAF50' }}>
          <CheckCircle size={10} className="inline mr-1" />{status}
        </span>
      </div>
      <div className="text-2xl font-bold mb-3" style={{ color }}>{value}<span className="text-sm">{unit}</span></div>
      <div className="relative h-2.5 rounded-full bg-gray-100">
        <div className="absolute h-full rounded-full opacity-20" style={{ width: '100%', background: color }} />
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${Math.min(98, Math.max(2, pct))}%`, background: color }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
};

const FishHealthReport = () => {
  const stressScore = 0;
  const pieData = [
    { value: stressScore, fill: '#F44336' },
    { value: 100 - stressScore, fill: '#4CAF50' },
  ];

  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* Species + Stress Row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Species Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: '#2E75B620' }}>
              <Fish size={32} style={{ color: '#2E75B6' }} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Monitored Species</div>
              <div className="text-xl font-bold text-gray-800">Neon Tetra</div>
              <div className="text-sm text-gray-500 mt-1">Paracheirodon innesi</div>
              <div className="text-xs text-gray-400 mt-1">Tropical freshwater fish</div>
            </div>
          </div>

          {/* Stress Score */}
          <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={55} startAngle={90} endAngle={-270} strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="relative" style={{ marginLeft: '-60px', marginTop: '-10px' }}>
              <div className="text-3xl font-bold text-gray-800" style={{ position: 'relative', zIndex: 1 }}></div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-sm text-gray-500">Overall Stress Score</div>
              <div className="text-4xl font-bold mt-1" style={{ color: '#4CAF50' }}>0 <span className="text-xl text-gray-400">/ 100</span></div>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#4CAF5018', color: '#4CAF50' }}>
                Low Stress
              </span>
              <p className="text-sm text-gray-500 mt-2">All water parameters are within the safe range for Neon Tetras. Fish are healthy and thriving.</p>
            </div>
          </div>
        </div>

        {/* Parameter Gauges */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paramGauges.map((p) => <GaugeCard key={p.label} {...p} />)}
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Care Recommendations</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {recommendations.map(({ label, desc, color, icon: Icon }) => (
              <div key={label} className="rounded-xl p-4 flex gap-3" style={{ background: color + '0F' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '20' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color }}>{label}</div>
                  <p className="text-xs text-gray-600 mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default FishHealthReport;

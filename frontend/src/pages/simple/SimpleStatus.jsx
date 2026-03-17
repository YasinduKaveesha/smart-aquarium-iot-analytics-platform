import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Thermometer, Droplets, Beaker, Eye, CheckCircle } from 'lucide-react';
import SimpleLayout from '../../components/SimpleLayout';
import WQIGauge from '../../components/WQIGauge';

const paramBars = [
  { label: 'Temperature', value: 26.2, unit: '°C', min: 24, max: 28, status: 'Normal', color: '#F97316', icon: Thermometer },
  { label: 'pH Level', value: 7.1, unit: '', min: 6.0, max: 7.5, status: 'Normal', color: '#2E75B6', icon: Droplets },
  { label: 'TDS', value: 312, unit: ' ppm', min: 150, max: 400, status: 'Normal', color: '#006B6B', icon: Beaker },
  { label: 'Turbidity', value: 3.2, unit: ' NTU', min: 0, max: 5, status: 'Normal', color: '#8B5CF6', icon: Eye },
];

const ParamBar = ({ label, value, unit, min, max, status, color, icon: Icon }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#4CAF5018', color: '#4CAF50' }}>
          {status}
        </span>
      </div>
      <div className="text-3xl font-bold mb-4" style={{ color }}>
        {value}<span className="text-lg">{unit}</span>
      </div>
      {/* Range bar */}
      <div className="relative h-2.5 rounded-full bg-gray-100 mb-2">
        <div className="absolute h-full rounded-full opacity-30" style={{ background: color, width: '100%' }} />
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

const SimpleStatus = () => {
  const navigate = useNavigate();

  return (
    <SimpleLayout>
      {/* Header */}
      <div className="text-white p-6 pb-8" style={{ background: 'linear-gradient(145deg, #1F4E79, #2E75B6, #006B6B)' }}>
        <button
          onClick={() => navigate('/simple')}
          className="flex items-center gap-1 text-blue-200 hover:text-white transition-colors mb-4 text-sm"
        >
          <ChevronLeft size={16} /> Back to Overview
        </button>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <WQIGauge value={62} size={150} color="#FF9800" />
          <div>
            <h1 className="text-2xl font-bold">Water Quality Status</h1>
            <p className="text-blue-200 mt-1">Detailed parameter analysis</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* What This Means */}
            <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: '#FF9800' }}>
              <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-orange-500">⚠</span> What This Means
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your aquarium's water quality score of <strong>62/100</strong> indicates that maintenance will be needed soon.
                TDS levels are gradually rising, which can stress your fish over time. All other parameters remain within safe ranges.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">TDS Rising</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">pH Normal</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">Temp OK</span>
              </div>
            </div>

            {/* Time Until Critical */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-3">Time Until Critical</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Clock size={24} className="text-orange-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-500">18 hrs</div>
                  <div className="text-sm text-gray-500">estimated until WQI drops below 50</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button className="w-full py-3 px-5 rounded-xl text-white font-semibold transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #1F4E79, #2E75B6)' }}>
                <CheckCircle size={18} />
                I'll Clean It Today
              </button>
              <button className="w-full py-3 px-5 rounded-xl font-semibold border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ color: '#1F4E79', borderColor: '#1F4E79' }}>
                <Clock size={18} />
                Remind Me Tomorrow
              </button>
            </div>
          </div>

          {/* Right column: parameter bars */}
          <div className="space-y-4">
            {paramBars.map((p) => <ParamBar key={p.label} {...p} />)}
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
};

export default SimpleStatus;

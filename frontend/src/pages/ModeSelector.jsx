import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, BarChart3 } from 'lucide-react';

const ModeSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start md:justify-center px-4 py-8 md:py-12" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Droplets size={32} className="text-blue-600 md:w-10 md:h-10" />
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#1F4E79' }}>AquaGuard</h1>
        </div>
        <p className="text-gray-500 text-base md:text-lg max-w-md">Smart Aquarium Water Quality Monitoring Platform</p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl w-full">
        {/* Simple Mode */}
        <div
          className="border-2 border-gray-200 rounded-xl p-6 md:p-8 bg-white hover:border-blue-500 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center text-center group"
          onClick={() => navigate('/simple')}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6 transition-transform group-hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #006B6B20, #006B6B40)' }}>
            <Droplets size={30} style={{ color: '#006B6B' }} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3" style={{ color: '#1F4E79' }}>Simple Mode</h2>
          <p className="text-gray-500 mb-5 md:mb-8 leading-relaxed text-sm md:text-base">
            Quick insights and easy-to-understand water quality status for everyday aquarium owners.
          </p>
          <button
            className="w-full py-3 px-6 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-md"
            style={{ background: '#006B6B' }}
            onClick={(e) => { e.stopPropagation(); navigate('/simple'); }}
          >
            Enter Simple Mode
          </button>
        </div>

        {/* Advanced Mode */}
        <div
          className="border-2 border-gray-200 rounded-xl p-8 bg-white hover:border-blue-500 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center text-center group"
          onClick={() => navigate('/advanced/overview')}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6 transition-transform group-hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #2E75B620, #2E75B640)' }}>
            <BarChart3 size={30} style={{ color: '#2E75B6' }} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3" style={{ color: '#1F4E79' }}>Advanced Mode</h2>
          <p className="text-gray-500 mb-5 md:mb-8 leading-relaxed text-sm md:text-base">
            Detailed analytics dashboard with sensor data, forecasts, and anomaly detection.
          </p>
          <button
            className="w-full py-3 px-6 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-md"
            style={{ background: '#2E75B6' }}
            onClick={(e) => { e.stopPropagation(); navigate('/advanced/overview'); }}
          >
            Enter Advanced Mode
          </button>
        </div>
      </div>

      <p className="mt-8 text-gray-400 text-sm">© 2026 AquaGuard · Smart Water Monitoring</p>
    </div>
  );
};

export default ModeSelector;

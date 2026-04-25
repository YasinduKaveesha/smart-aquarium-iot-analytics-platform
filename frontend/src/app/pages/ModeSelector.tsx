import { useNavigate } from 'react-router';
import { Droplets, Zap, Shield, BarChart3, Brain, AlertTriangle, Wifi } from 'lucide-react';
import { useLatest } from '../hooks/useLatest';
import { useAnomalies } from '../hooks/useAnomalies';
import { useStatus } from '../hooks/useStatus';

export function ModeSelector() {
  const navigate = useNavigate();
  const { reading, mode: apiMode, sensorErrors } = useLatest();
  const { data: anomalyData } = useAnomalies();
  const { data: statusData } = useStatus();

  const isSensorError = apiMode === 'SENSOR_ERROR';
  const phFailed = isSensorError && ((reading?.pH === 0) || sensorErrors.some(e => e.toLowerCase().includes('ph')));
  const activeSensors = phFailed ? 3 : 4;
  const anomalyCount = anomalyData?.length ?? 0;
  const daysMonitored = statusData
    ? Math.floor((Date.now() - new Date(statusData.install_date).getTime()) / 86400000)
    : 7;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2940 0%, #1A3D5C 40%, #1E4976 70%, #0D3B6E 100%)' }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #2E75B6, transparent)', filter: 'blur(60px)', animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #006B6B, transparent)', filter: 'blur(60px)', animation: 'pulse 4s ease-in-out infinite 2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #60A5FA, transparent)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 text-center">
        {/* Hero */}
        <div className="mb-14">
          <div className="flex items-center justify-center mb-7">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(46,117,182,0.6) 0%, rgba(0,107,107,0.6) 100%)', border: '1.5px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Droplets className="w-12 h-12 text-white drop-shadow-lg" />
              </div>
              <div className="absolute -inset-2 rounded-3xl opacity-30 blur-md" style={{ background: 'linear-gradient(135deg, #2E75B6, #006B6B)' }} />
            </div>
          </div>
          <h1 className="text-6xl font-black text-white mb-4 tracking-tight" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            Aqua<span style={{ color: '#60A5FA' }}>Guard</span>
          </h1>
          <p className="text-xl text-blue-200 max-w-xl mx-auto leading-relaxed font-light">
            Smart aquarium monitoring powered by IoT sensors and AI-driven analytics
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Simple Mode */}
          <button
            onClick={() => navigate('/simple')}
            className="group relative text-left rounded-3xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(46,117,182,0.15), rgba(0,107,107,0.1))' }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl" style={{ background: 'linear-gradient(135deg, #2E75B6, #1A5C99)' }}>
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-white">Simple Mode</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(46,117,182,0.3)', color: '#90CAF9', border: '1px solid rgba(46,117,182,0.4)' }}>Recommended</span>
              </div>
              <p className="text-blue-200 text-sm leading-relaxed mb-6 font-light">
                Clean, easy-to-read dashboard designed for everyday aquarium care. Get instant health status, maintenance alerts, and simple trend views.
              </p>
              <div className="space-y-2">
                {['Real-time water quality score', 'Maintenance recommendations', 'Simple trend charts', 'Mobile-friendly design'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#60A5FA' }} />
                    <span className="text-sm text-blue-200">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-blue-300 group-hover:text-white transition-colors font-medium">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Get started</span>
                <span className="ml-auto text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>

          {/* Advanced Mode */}
          <button
            onClick={() => navigate('/advanced/overview')}
            className="group relative text-left rounded-3xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(0,107,107,0.15), rgba(46,117,182,0.1))' }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl" style={{ background: 'linear-gradient(135deg, #006B6B, #004F4F)' }}>
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-white">Advanced Mode</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,107,107,0.3)', color: '#80CBC4', border: '1px solid rgba(0,107,107,0.4)' }}>Pro</span>
              </div>
              <p className="text-blue-200 text-sm leading-relaxed mb-6 font-light">
                Full analytics suite with predictive forecasting, anomaly detection, and detailed sensor breakdowns for researchers and enthusiasts.
              </p>
              <div className="space-y-2">
                {['AI-powered WQI forecasting', 'Anomaly detection alerts', 'Sensor analytics dashboard', 'Fish health correlation'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4DD0E1' }} />
                    <span className="text-sm text-blue-200">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-blue-300 group-hover:text-white transition-colors font-medium">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Explore analytics</span>
                <span className="ml-auto text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { icon: phFailed ? Wifi : Droplets, label: phFailed ? 'Sensors (1 fault)' : 'Sensors Active', value: String(activeSensors), warn: phFailed },
            { icon: AlertTriangle, label: 'Anomalies Detected', value: String(anomalyCount), warn: false },
            { icon: BarChart3, label: 'Days Monitored', value: String(daysMonitored), warn: false },
          ].map(({ icon: Icon, label, value, warn }) => (
            <div key={label} className="rounded-2xl px-4 py-4 text-center" style={{ background: warn ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${warn ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: warn ? '#F87171' : '#93C5FD' }} />
              <p className="text-2xl font-bold" style={{ color: warn ? '#FCA5A5' : 'white' }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: warn ? '#F87171' : '#93C5FD' }}>{label}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-blue-300/50 text-xs">AquaGuard v1.0 — Smart Aquarium IoT Analytics Platform</p>
      </div>
    </div>
  );
}

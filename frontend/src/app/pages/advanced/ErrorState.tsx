import { useNavigate } from 'react-router';
import { AdvancedLayout } from '../../components/AdvancedLayout';
import { AlertTriangle, RefreshCw, Home, Wifi, Database, Server } from 'lucide-react';

interface ErrorScenario {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  suggestion: string;
}

const errorScenarios: ErrorScenario[] = [
  {
    title: 'Sensor Disconnected',
    description: 'One or more IoT sensors are not transmitting data. Check physical connections and power supply.',
    icon: Wifi,
    color: '#F44336',
    bg: '#FFEBEE',
    suggestion: 'Check sensor USB/power connections and restart the sensor module.',
  },
  {
    title: 'Database Timeout',
    description: 'Unable to retrieve historical data from the time-series database. Connection timed out after 30s.',
    icon: Database,
    color: '#FF9800',
    bg: '#FFF3E0',
    suggestion: 'Verify database service is running. Try refreshing in 60 seconds.',
  },
  {
    title: 'API Server Unreachable',
    description: 'The analytics backend server is not responding. Forecasting and anomaly detection are unavailable.',
    icon: Server,
    color: '#9C27B0',
    bg: '#F3E5F5',
    suggestion: 'Check backend service status. Contact system administrator if issue persists.',
  },
];

export function ErrorState() {
  const navigate = useNavigate();

  return (
    <AdvancedLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1F4E79] mb-1">Error States</h2>
        <p className="text-[#555]">Demonstration of system error handling and recovery guidance</p>
      </div>

      {/* Primary error banner */}
      <div className="rounded-2xl p-8 mb-8 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFF5F5, #FFF0F0)', border: '2px solid #FFCDD2' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F44336, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl" style={{ background: 'linear-gradient(135deg, #F44336, #D32F2F)' }}>
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-[#C62828] mb-3">System Alert</h3>
          <p className="text-[#555] max-w-lg mx-auto mb-6 leading-relaxed">
            AquaGuard has detected one or more system issues. Your fish may be at risk. Please review the errors below and take corrective action immediately.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/advanced/overview')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #F44336, #D32F2F)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white shadow-md transition-all hover:shadow-lg hover:scale-105 text-[#555]"
              style={{ border: '1.5px solid rgba(0,0,0,0.1)' }}
            >
              <Home className="w-4 h-4" />
              Return Home
            </button>
          </div>
        </div>
      </div>

      {/* Error scenarios */}
      <div className="space-y-4 mb-8">
        {errorScenarios.map((err, i) => {
          const Icon = err.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: `${err.color}30` }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ backgroundColor: err.bg }}>
                  <Icon className="w-6 h-6" style={{ color: err.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h4 className="font-bold text-[#333] text-lg">{err.title}</h4>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: err.bg, color: err.color }}>
                      Error
                    </span>
                  </div>
                  <p className="text-sm text-[#555] leading-relaxed mb-3">{err.description}</p>
                  <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: `${err.color}08` }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: err.color }} />
                    <p className="text-xs text-[#555] leading-relaxed"><strong>Suggestion:</strong> {err.suggestion}</p>
                  </div>
                </div>
                <button className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-md" style={{ backgroundColor: err.bg, color: err.color }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* System status grid */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#1F4E79] mb-5">System Component Status</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Temperature Sensor', status: 'online', uptime: '99.2%' },
            { name: 'pH Sensor', status: 'online', uptime: '98.7%' },
            { name: 'TDS Sensor', status: 'warning', uptime: '94.1%' },
            { name: 'Turbidity Sensor', status: 'online', uptime: '97.8%' },
            { name: 'MQTT Broker', status: 'online', uptime: '99.9%' },
            { name: 'Time-Series DB', status: 'warning', uptime: '91.3%' },
            { name: 'Analytics API', status: 'offline', uptime: '82.5%' },
            { name: 'Web Frontend', status: 'online', uptime: '100%' },
          ].map(({ name, status, uptime }) => {
            const statusColors = {
              online: { dot: '#4CAF50', bg: '#E8F5E9', text: '#4CAF50' },
              warning: { dot: '#FF9800', bg: '#FFF3E0', text: '#FF9800' },
              offline: { dot: '#F44336', bg: '#FFEBEE', text: '#F44336' },
            };
            const sc = statusColors[status as keyof typeof statusColors];
            return (
              <div key={name} className="p-4 rounded-xl" style={{ backgroundColor: sc.bg, border: `1px solid ${sc.dot}20` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot }} />
                  <span className="text-xs font-bold capitalize" style={{ color: sc.text }}>{status}</span>
                </div>
                <p className="text-xs font-semibold text-[#333] leading-tight mb-1">{name}</p>
                <p className="text-xs text-[#777]">Uptime: {uptime}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AdvancedLayout>
  );
}

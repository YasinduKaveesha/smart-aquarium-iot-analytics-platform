import { useNavigate } from 'react-router';

export function Wireframe() {
  const navigate = useNavigate();

  const routes = [
    { path: '/', label: 'Mode Selector', description: 'Landing page - choose Simple or Advanced mode' },
    { path: '/simple', label: 'Simple Overview', description: 'Main dashboard for casual users' },
    { path: '/simple/status', label: 'Simple Status', description: 'Current sensor readings and alerts' },
    { path: '/simple/history', label: 'Simple History', description: 'Maintenance history and past events' },
    { path: '/advanced/overview', label: 'Advanced Overview', description: 'Full analytics dashboard' },
    { path: '/advanced/sensors', label: 'Sensor Analytics', description: 'Detailed per-sensor charts' },
    { path: '/advanced/wqi', label: 'WQI Breakdown', description: 'Water Quality Index analysis' },
    { path: '/advanced/forecast', label: 'Forecast', description: 'AI-powered predictions' },
    { path: '/advanced/anomaly', label: 'Anomaly Detection', description: 'Detected anomalies and alerts' },
    { path: '/advanced/health', label: 'Fish Health', description: 'Species-specific health analysis' },
    { path: '/advanced/error', label: 'Error State', description: 'Error handling demonstration' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AquaGuard Wireframe</h1>
        <p className="text-gray-500 mb-8">All application routes and pages</p>

        <div className="grid gap-3">
          {routes.map(({ path, label, description }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="text-left p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{path}</code>
                  <span className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

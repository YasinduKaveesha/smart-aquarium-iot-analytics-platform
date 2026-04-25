import { useNavigate, useLocation } from 'react-router';
import { Droplets, BarChart3, Activity, TrendingUp, AlertTriangle, Heart, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { ReactNode } from 'react';
import { ChatWidget } from './ChatWidget';

interface AdvancedLayoutProps {
  children: ReactNode;
}

export function AdvancedLayout({ children }: AdvancedLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/advanced/overview', label: 'Overview', icon: BarChart3 },
    { path: '/advanced/sensors', label: 'Sensors', icon: Activity },
    { path: '/advanced/wqi', label: 'WQI', icon: TrendingUp },
    { path: '/advanced/forecast', label: 'Forecast', icon: TrendingUp },
    { path: '/advanced/anomaly', label: 'Anomaly', icon: AlertTriangle },
    { path: '/advanced/health', label: 'Health', icon: Heart },
    { path: '/advanced/error', label: 'Error', icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#E0F2FE]">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-[120px]">
          <div className="flex items-center justify-between py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2E75B6] to-[#006B6B] flex items-center justify-center shadow-lg">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] bg-clip-text text-transparent">AquaGuard</h1>
                <p className="text-xs text-[#555555]">Advanced Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/simple')} className="px-5 py-2 text-sm text-[#555555] hover:text-[#2E75B6] hover:bg-gray-50 rounded-lg transition-all duration-200">Simple Mode</button>
              <Badge className="bg-gradient-to-r from-[#2E75B6] to-[#006B6B] text-white px-5 py-2 shadow-md">Advanced Mode</Badge>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-3 relative group ${isActive ? 'text-[#2E75B6] border-b-[#2E75B6]' : 'text-[#555555] border-b-transparent hover:text-[#2E75B6] hover:bg-gray-50'}`}
                  style={{ borderBottomWidth: '3px' }}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent opacity-50 rounded-t-lg"></div>}
                  <Icon className={`w-4 h-4 relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto px-8 lg:px-[120px] py-10">{children}</div>
      <ChatWidget />
    </div>
  );
}

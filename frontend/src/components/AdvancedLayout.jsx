import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Droplets, ChevronLeft, Menu, X } from 'lucide-react';

const tabs = [
  { to: '/advanced/overview', label: 'Overview' },
  { to: '/advanced/sensors', label: 'Sensors' },
  { to: '/advanced/wqi', label: 'WQI' },
  { to: '/advanced/forecast', label: 'Forecast' },
  { to: '/advanced/anomaly', label: 'Anomaly' },
  { to: '/advanced/health', label: 'Health' },
  { to: '/advanced/error', label: 'Error' },
];

const AdvancedLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Nav */}
      <header className="text-white shadow-lg sticky top-0 z-30" style={{ background: 'linear-gradient(to right, #1F4E79, #2E75B6)' }}>
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Droplets size={18} className="text-teal-300" />
              </div>
              <div>
                <span className="font-bold text-lg leading-none">AquaGuard</span>
                <div className="text-xs text-blue-200">Advanced Mode</div>
              </div>
            </div>

            {/* Desktop Tabs */}
            <nav className="hidden lg:flex gap-1">
              {tabs.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="hidden lg:flex items-center gap-1 text-blue-200 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
              >
                <ChevronLeft size={16} />
                Mode Select
              </button>
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile tab dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-3 grid grid-cols-2 gap-1">
              {tabs.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm text-center transition-all ${
                      isActive ? 'bg-white/20 text-white font-semibold' : 'text-blue-200 hover:bg-white/10'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                className="col-span-2 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-white/10 border border-white/10 mt-1"
              >
                <ChevronLeft size={14} />
                Back to Mode Selector
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default AdvancedLayout;

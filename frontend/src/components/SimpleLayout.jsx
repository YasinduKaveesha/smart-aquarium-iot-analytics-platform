import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Droplets, Home, Activity, Clock, ChevronLeft, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/simple', label: 'Home', icon: Home, end: true },
  { to: '/simple/status', label: 'Status', icon: Activity },
  { to: '/simple/history', label: 'History', icon: Clock },
];

const SimpleLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 text-white" style={{ background: 'linear-gradient(to bottom, #1A3D5C, #0F2940)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
            <Droplets size={22} className="text-teal-300" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">AquaGuard</div>
            <div className="text-xs text-blue-300 mt-0.5">Simple Mode</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Back to selector — desktop only */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm w-full px-4 py-2"
          >
            <ChevronLeft size={16} />
            Mode Selector
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full flex flex-col text-white" style={{ background: 'linear-gradient(to bottom, #1A3D5C, #0F2940)' }}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Droplets size={22} className="text-teal-300" />
                <span className="font-bold">AquaGuard</span>
              </div>
              <button onClick={() => setMobileOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive ? 'bg-white/15 text-white font-semibold' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => { setMobileOpen(false); navigate('/'); }}
                className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm w-full px-4 py-2"
              >
                <ChevronLeft size={16} />
                Mode Selector
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 text-white" style={{ background: '#1A3D5C' }}>
          <div className="flex items-center gap-2">
            <Droplets size={20} className="text-teal-300" />
            <span className="font-bold">AquaGuard</span>
          </div>
          <button onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="md:hidden flex border-t bg-white">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
                }`
              }
            >
              <Icon size={20} className="mb-1" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleLayout;

import { useNavigate, useLocation } from 'react-router';
import { Home, TrendingUp, History, Settings, Droplets } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

interface SimpleLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const navItems = [
  { icon: Home, label: 'Home', path: '/simple' },
  { icon: TrendingUp, label: 'Status', path: '/simple/status' },
  { icon: History, label: 'History', path: '/simple/history' },
];

export function SimpleLayout({ children, hideNav }: SimpleLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F4F8' }}>
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-full z-40"
        style={{
          width: 240,
          background: 'linear-gradient(180deg, #1A3D5C 0%, #0F2940 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="flex items-center gap-3 px-6 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'rgba(46,117,182,0.5)' }}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white" style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1 }}>AquaGuard</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 2 }}>Simple Mode</p>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-5 space-y-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => navigate(path)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left hover:shadow-md" style={{ background: active ? 'rgba(46,117,182,0.35)' : 'transparent', color: active ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontWeight: active ? 700 : 400, fontSize: '0.88rem' }}>{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#60A5FA' }} />}
              </button>
            );
          })}
        </nav>
        <div className="px-4 pb-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:shadow-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
            <Settings className="w-4 h-4" />
            <span style={{ fontSize: '0.82rem' }}>Switch Mode</span>
          </button>
          <p className="mt-4 text-center" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem' }}>AquaGuard v1.0</p>
        </div>
      </aside>
      <div className="flex-1 lg:ml-60 min-h-screen">{children}</div>
      <ChatWidget />
      {!hideNav && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)' }}>
          <div className="max-w-md mx-auto flex items-center justify-around px-4 py-2">
            {navItems.map(({ icon: Icon, label, path }) => {
              const active = location.pathname === path;
              return (
                <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-95" style={{ color: active ? '#2E75B6' : '#94A3B8' }}>
                  <div className="p-1.5 rounded-xl transition-all" style={{ background: active ? 'rgba(46,117,182,0.12)' : 'transparent' }}>
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className="text-xs" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

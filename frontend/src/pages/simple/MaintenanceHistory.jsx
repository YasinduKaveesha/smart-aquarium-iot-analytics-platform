import React, { useState } from 'react';
import { AlertTriangle, Droplets, Filter, RefreshCw, Sparkles } from 'lucide-react';
import SimpleLayout from '../../components/SimpleLayout';
import { maintenanceHistory } from '../../data/mockData';

const typeConfig = {
  alert: { color: '#FF9800', icon: AlertTriangle, label: 'Alert', bg: '#FFF3E0' },
  cleaning: { color: '#2E75B6', icon: Sparkles, label: 'Cleaning', bg: '#EFF6FF' },
  waterchange: { color: '#006B6B', icon: Droplets, label: 'Water Change', bg: '#F0FAFA' },
  filterchange: { color: '#8B5CF6', icon: Filter, label: 'Filter Change', bg: '#F5F3FF' },
};

const filterOptions = [
  { key: 'all', label: 'All Events' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'alert', label: 'Alerts' },
  { key: 'waterchange', label: 'Water Change' },
  { key: 'filterchange', label: 'Filter Change' },
];

const MaintenanceHistory = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? maintenanceHistory
    : maintenanceHistory.filter((e) => e.type === activeFilter);

  return (
    <SimpleLayout>
      {/* Header */}
      <div className="text-white p-6 pb-10" style={{ background: 'linear-gradient(145deg, #1F4E79, #2E75B6, #006B6B)' }}>
        <h1 className="text-2xl font-bold mb-4">Maintenance History</h1>
        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total Events', value: 5 },
            { label: 'Cleanings', value: 3 },
            { label: 'Alerts', value: 2 },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-blue-200 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === key
                  ? 'text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
              }`}
              style={activeFilter === key ? { background: '#2E75B6' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" style={{ marginLeft: '1px' }} />

          <div className="space-y-4">
            {filtered.map((event) => {
              const cfg = typeConfig[event.type];
              const Icon = cfg.icon;
              return (
                <div key={event.id} className="flex gap-4 relative">
                  {/* Icon dot */}
                  <div className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ background: cfg.bg, border: `2px solid ${cfg.color}` }}>
                    <Icon size={18} style={{ color: cfg.color }} />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 -mt-1">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full mr-2"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <p className="text-gray-700 text-sm mt-2">{event.title}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">{event.date}</div>
                        <div className="text-sm font-semibold mt-1" style={{ color: event.wqi >= 85 ? '#4CAF50' : event.wqi >= 70 ? '#FF9800' : '#F44336' }}>
                          WQI {event.wqi}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw size={40} className="mx-auto mb-3 opacity-30" />
            <p>No events found for this filter.</p>
          </div>
        )}
      </div>
    </SimpleLayout>
  );
};

export default MaintenanceHistory;

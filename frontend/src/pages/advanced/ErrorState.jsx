import React from 'react';
import { AlertCircle, Clock, WifiOff, Wifi, Database, Mail, MessageSquare, BookOpen, RotateCcw, Eye } from 'lucide-react';
import AdvancedLayout from '../../components/AdvancedLayout';

const causes = [
  { icon: WifiOff, label: 'Sensor Disconnected', desc: 'Physical sensor cable may have come loose', color: '#F44336' },
  { icon: Wifi, label: 'Network Interruption', desc: 'WiFi signal dropped or router issue', color: '#FF9800' },
  { icon: Database, label: 'Device Offline', desc: 'AquaGuard hub may need to be restarted', color: '#8B5CF6' },
];

const steps = [
  { n: 1, label: 'Check Physical Connections', desc: 'Ensure sensor cables are firmly connected to the AquaGuard hub.' },
  { n: 2, label: 'Verify Network Connection', desc: 'Confirm the device is connected to WiFi and has internet access.' },
  { n: 3, label: 'Restart the Device', desc: 'Unplug the AquaGuard hub for 10 seconds, then reconnect.' },
  { n: 4, label: 'Clean Sensor Probes', desc: 'Mineral deposits can block sensors. Rinse probes with distilled water.' },
];

const ErrorState = () => {
  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* Error Header */}
        <div className="rounded-xl p-6 border-4 text-center" style={{ background: 'linear-gradient(to bottom right, #FFEBEE, #FFF3E0)', borderColor: '#F44336' }}>
          <AlertCircle size={56} className="mx-auto mb-3 animate-pulse" style={{ color: '#F44336' }} />
          <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3" style={{ background: '#F4433618', color: '#F44336' }}>
            Connection Error
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Unable to Retrieve Sensor Data</h1>
          <p className="text-gray-500 mt-2">The AquaGuard system cannot communicate with the monitoring device. Please follow the troubleshooting steps below.</p>
        </div>

        {/* Last Reading */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Clock size={22} className="text-gray-500" />
          </div>
          <div>
            <div className="font-semibold text-gray-800">Last Successful Reading</div>
            <div className="text-2xl font-bold text-gray-500 mt-0.5">120 min ago</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-400">WQI at last reading</div>
            <div className="text-xl font-bold" style={{ color: '#FF9800' }}>62</div>
          </div>
        </div>

        {/* Possible Causes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {causes.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: color + '15' }}>
                <Icon size={26} style={{ color }} />
              </div>
              <div className="font-semibold text-gray-800 mb-1">{label}</div>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Troubleshooting Steps */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Troubleshooting Steps</h2>
          <div className="space-y-3">
            {steps.map(({ n, label, desc }) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ background: '#2E75B6' }}>
                  {n}
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{label}</div>
                  <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 py-3 px-6 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(to right, #1F4E79, #2E75B6)' }}>
            <RotateCcw size={18} />
            Retry Connection
          </button>
          <button className="flex-1 py-3 px-6 rounded-xl font-semibold border-2 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ color: '#1F4E79', borderColor: '#1F4E79' }}>
            <Eye size={18} />
            View Last Known Data
          </button>
        </div>

        {/* Support Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm font-semibold text-gray-800 mb-4">Need Help?</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Mail, label: 'Email Support', sub: 'support@aquaguard.io', color: '#2E75B6' },
              { icon: MessageSquare, label: 'Live Chat', sub: 'Available 9am – 6pm', color: '#4CAF50' },
              { icon: BookOpen, label: 'Knowledge Base', sub: 'Browse articles & guides', color: '#8B5CF6' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-800">{label}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default ErrorState;

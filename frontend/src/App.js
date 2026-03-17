import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ModeSelector from './pages/ModeSelector';
import SimpleOverview from './pages/simple/SimpleOverview';
import SimpleStatus from './pages/simple/SimpleStatus';
import MaintenanceHistory from './pages/simple/MaintenanceHistory';
import AdvancedOverview from './pages/advanced/AdvancedOverview';
import SensorAnalytics from './pages/advanced/SensorAnalytics';
import WQIBreakdown from './pages/advanced/WQIBreakdown';
import ForecastPrediction from './pages/advanced/ForecastPrediction';
import AnomalyDetection from './pages/advanced/AnomalyDetection';
import FishHealthReport from './pages/advanced/FishHealthReport';
import ErrorState from './pages/advanced/ErrorState';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ModeSelector />} />
        <Route path="/simple" element={<SimpleOverview />} />
        <Route path="/simple/status" element={<SimpleStatus />} />
        <Route path="/simple/history" element={<MaintenanceHistory />} />
        <Route path="/advanced/overview" element={<AdvancedOverview />} />
        <Route path="/advanced/sensors" element={<SensorAnalytics />} />
        <Route path="/advanced/wqi" element={<WQIBreakdown />} />
        <Route path="/advanced/forecast" element={<ForecastPrediction />} />
        <Route path="/advanced/anomaly" element={<AnomalyDetection />} />
        <Route path="/advanced/health" element={<FishHealthReport />} />
        <Route path="/advanced/error" element={<ErrorState />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

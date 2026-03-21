import { AdvancedLayout } from '../../components/AdvancedLayout';
import { pHForecastData, tempForecastData, currentReading } from '../../data/mockData';
import { useLatest } from '../../hooks/useLatest';
import { useForecast } from '../../hooks/useForecast';
import { Brain, TrendingDown, AlertTriangle, Info, Wifi } from 'lucide-react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

const SAFE_PH_LOW    = 6.5;
const SAFE_PH_HIGH   = 7.8;
const SAFE_TEMP_LOW  = 23;
const SAFE_TEMP_HIGH = 27;

export function Forecast() {
  const { reading: apiReading, mode: apiMode, sensorErrors } = useLatest();
  const { phForecast: apiForecast, tempForecast: apiTempForecast } = useForecast();

  const live         = apiReading ?? currentReading;
  const pHData       = apiForecast   ?? pHForecastData;
  const tempData     = apiTempForecast ?? tempForecastData;

  const isSensorError = apiMode === 'SENSOR_ERROR';
  const phFailed = isSensorError && (live.pH === 0 || sensorErrors.some(e => e.toLowerCase().includes('ph')));

  // pH: lower CI near danger zone?
  const phRiskHour = phFailed ? -1 : pHData.findIndex(d => d.lower <= SAFE_PH_LOW);
  const phRisk     = phRiskHour !== -1;

  // Temp: upper CI near danger zone?
  const tempRiskHour = tempData.findIndex(d => d.upper >= SAFE_TEMP_HIGH);
  const tempRisk     = tempRiskHour !== -1;

  return (
    <AdvancedLayout>
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#1F4E79] mb-1">SARIMA Forecast</h2>
            <p className="text-[#555] text-sm">24-hour pH &amp; Temperature predictions · 95% confidence intervals</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: '#EFF6FF', color: '#2E75B6', border: '1.5px solid #BFDBFE' }}>
            <Brain className="w-3.5 h-3.5" />
            Models trained on this tank's history
          </div>
        </div>
      </div>

      {/* ── Pessimistic Early Warning explanation ── */}
      <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-2xl" style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD' }}>
        <Info className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-sky-800 mb-0.5">How the WQI is calculated</p>
          <p className="text-xs text-sky-700 leading-relaxed">
            The WQI gauge uses <strong>Pessimistic Early Warning</strong> — it is weighted using the <strong>lower 95% pH CI</strong> and the <strong>upper 95% Temperature CI</strong> from these SARIMA forecasts.
            If those bounds are drifting toward the danger zone, the WQI score is already reduced <em>before</em> the parameter breaches the threshold.
          </p>
        </div>
      </div>

      {/* ── Model spec cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: phFailed ? '1.5px solid #FECACA' : '1px solid #F3F4F6' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">pH Model</p>
          {phFailed ? (
            <>
              <p className="text-sm font-black text-red-500 mb-0.5">Unavailable</p>
              <p className="text-xs text-red-400">pH sensor offline — forecast cannot be generated</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-500">Sensor not connected</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-[#2E75B6] mb-0.5">SARIMA(1,1,0)(0,0,1,24)</p>
              <p className="text-xs text-[#777]">Seasonal period 24 h · lower CI = pessimistic bound</p>
              <div className="mt-2 flex items-center gap-1.5">
                {phRisk
                  ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  : <TrendingDown className="w-3.5 h-3.5 text-green-500 rotate-180" />}
                <span className="text-xs font-semibold" style={{ color: phRisk ? '#EA580C' : '#16A34A' }}>
                  {phRisk ? `Lower CI reaches danger at +${phRiskHour}h` : 'Lower CI stays in safe range'}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">Temperature Model</p>
          <p className="text-sm font-black text-[#E53E3E] mb-0.5">SARIMA(1,0,1)(0,1,0,24)</p>
          <p className="text-xs text-[#777]">Seasonal differencing 24 h · upper CI = pessimistic bound</p>
          <div className="mt-2 flex items-center gap-1.5">
            {tempRisk
              ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              : <TrendingDown className="w-3.5 h-3.5 text-green-500 rotate-180" />}
            <span className="text-xs font-semibold" style={{ color: tempRisk ? '#EA580C' : '#16A34A' }}>
              {tempRisk ? `Upper CI reaches danger at +${tempRiskHour}h` : 'Upper CI stays in safe range'}
            </span>
          </div>
        </div>
      </div>

      {/* ── pH Forecast chart ── */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm" style={{ border: phFailed ? '1.5px solid #FECACA' : '1px solid #F3F4F6' }}>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-[#1F4E79] text-base">pH Forecast — Next 24 Hours</h3>
            {phFailed
              ? <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><Wifi className="w-3 h-3" /> pH sensor offline — forecast unavailable</p>
              : <p className="text-xs text-[#777] mt-0.5">Safe range: <span className="font-semibold text-[#555]">6.5 – 7.8</span> · Current: <span className="font-semibold text-[#2E75B6]">{live.pH.toFixed(2)}</span></p>
            }
          </div>
          {!phFailed && (
            <div className="flex items-center gap-4 text-xs text-[#777]">
              <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-blue-500 rounded" /><span>Mean</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded opacity-40 bg-blue-300" /><span>95% CI</span></div>
            </div>
          )}
        </div>
        {phFailed ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FEF2F2' }}>
              <Wifi className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-lg font-bold text-red-500 mb-1">pH Forecast Unavailable</p>
            <p className="text-sm text-[#777] max-w-md">The pH sensor is not connected. SARIMA forecast cannot be generated without live pH data. Reconnect the sensor to restore predictions.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={pHData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis domain={[6.0, 8.0]} tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1)} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(val: number, name: string) => {
                    const labels: Record<string, string> = { mean: 'Mean pH', lower: 'Lower CI (95%)', upper: 'Upper CI (95%)' };
                    return [val.toFixed(3), labels[name] ?? name];
                  }}
                />
                <ReferenceLine y={SAFE_PH_LOW}  stroke="#F44336" strokeDasharray="5 3" strokeOpacity={0.6} label={{ value: `pH ${SAFE_PH_LOW} (min safe)`,  fill: '#F44336', fontSize: 9, position: 'insideTopLeft' }} />
                <ReferenceLine y={SAFE_PH_HIGH} stroke="#4CAF50" strokeDasharray="5 3" strokeOpacity={0.5} label={{ value: `pH ${SAFE_PH_HIGH} (max safe)`, fill: '#4CAF50', fontSize: 9, position: 'insideTopLeft' }} />
                <Area type="monotone" dataKey="upper" fill="#BFDBFE" stroke="none" fillOpacity={0.5} legendType="none" />
                <Area type="monotone" dataKey="lower" fill="#ffffff" stroke="none" fillOpacity={1}  legendType="none" />
                <Line type="monotone" dataKey="mean"  stroke="#2E75B6" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            {phRisk && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-orange-700">Lower CI dips below pH {SAFE_PH_LOW} at hour +{phRiskHour}. WQI already reflects this predicted risk.</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Temperature Forecast chart ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-[#1F4E79] text-base">Temperature Forecast — Next 24 Hours</h3>
            <p className="text-xs text-[#777] mt-0.5">Safe range: <span className="font-semibold text-[#555]">23 – 27 °C</span> · Current: <span className="font-semibold text-[#E53E3E]">{live.temperature.toFixed(1)} °C</span></p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#777]">
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-red-500 rounded" /><span>Mean</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded opacity-40 bg-red-200" /><span>95% CI</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={tempData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} interval={5} />
            <YAxis domain={[21, 30]} tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}°`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
              formatter={(val: number, name: string) => {
                const labels: Record<string, string> = { mean: 'Mean Temp (°C)', lower: 'Lower CI (95%)', upper: 'Upper CI (95%)' };
                return [`${val.toFixed(2)} °C`, labels[name] ?? name];
              }}
            />
            <ReferenceLine y={SAFE_TEMP_LOW}  stroke="#F44336" strokeDasharray="5 3" strokeOpacity={0.6} label={{ value: `${SAFE_TEMP_LOW}°C (min safe)`,  fill: '#F44336', fontSize: 9, position: 'insideTopLeft' }} />
            <ReferenceLine y={SAFE_TEMP_HIGH} stroke="#F44336" strokeDasharray="5 3" strokeOpacity={0.6} label={{ value: `${SAFE_TEMP_HIGH}°C (max safe)`, fill: '#F44336', fontSize: 9, position: 'insideTopLeft' }} />
            <Area type="monotone" dataKey="upper" fill="#FCA5A5" stroke="none" fillOpacity={0.4} legendType="none" />
            <Area type="monotone" dataKey="lower" fill="#ffffff" stroke="none" fillOpacity={1}  legendType="none" />
            <Line type="monotone" dataKey="mean"  stroke="#E53E3E" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        {tempRisk && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-orange-700">Upper CI exceeds {SAFE_TEMP_HIGH}°C at hour +{tempRiskHour}. WQI already reflects this predicted risk.</span>
          </div>
        )}
      </div>
    </AdvancedLayout>
  );
}

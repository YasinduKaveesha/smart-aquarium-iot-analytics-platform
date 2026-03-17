import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AdvancedLayout from '../../components/AdvancedLayout';
import { wqiContributions } from '../../data/mockData';

const WQIBreakdown = () => {
  const [hoveredSeg, setHoveredSeg] = useState(null);

  const total = wqiContributions.reduce((acc, c) => acc + c.contribution, 0).toFixed(1);

  return (
    <AdvancedLayout>
      <div className="space-y-6">
        {/* WQI Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="text-sm text-gray-500 mb-2">Current Water Quality Index</div>
          <div className="text-6xl font-bold mb-3" style={{ color: '#FF9800' }}>
            62 <span className="text-3xl text-gray-400">/ 100</span>
          </div>
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: '#FFF3E0', color: '#FF9800' }}>
            ⚠ Recommended Soon
          </span>
        </div>

        {/* Formula */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-2 font-medium">WQI Formula</div>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 overflow-x-auto">
            WQI = <span style={{ color: '#4CAF50' }}>(pH × 35%)</span> +{' '}
            <span style={{ color: '#2E75B6' }}>(TDS × 35%)</span> +{' '}
            <span style={{ color: '#F44336' }}>(Turbidity × 20%)</span> +{' '}
            <span style={{ color: '#FF9800' }}>(Temperature × 10%)</span>
          </div>
        </div>

        {/* Stacked Contribution Bar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm font-semibold text-gray-700 mb-3">WQI Composition</div>
          <div className="flex h-10 rounded-xl overflow-hidden gap-0.5">
            {wqiContributions.map(({ param, contribution, color, weight }) => (
              <div
                key={param}
                className="flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all duration-200"
                style={{
                  width: `${weight}%`,
                  background: color,
                  opacity: hoveredSeg === null || hoveredSeg === param ? 1 : 0.5,
                  transform: hoveredSeg === param ? 'scaleY(1.08)' : 'scaleY(1)',
                }}
                onMouseEnter={() => setHoveredSeg(param)}
                onMouseLeave={() => setHoveredSeg(null)}
                title={`${param}: ${weight}% weight, ${contribution.toFixed(1)} pts`}
              >
                {weight}%
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {wqiContributions.map(({ param, color }) => (
              <div key={param} className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                {param}
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm font-semibold text-gray-700 mb-4">Normalized Scores by Parameter</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wqiContributions} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="param" tick={{ fontSize: 12, fill: '#666' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#aaa' }} />
              <Tooltip
                formatter={(v, n, p) => [`${v} / 100`, 'Score']}
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {wqiContributions.map(({ param, color }) => (
                  <Cell key={param} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detail Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-700">Parameter Breakdown</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Parameter', 'Raw Value', 'Optimal Range', 'Normalized Score', 'Weight', 'Contribution'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wqiContributions.map(({ param, rawValue, range, score, weight, contribution, color }) => (
                  <tr key={param} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                        {param}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{rawValue}</td>
                    <td className="px-4 py-3 text-gray-600">{range}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color }}>{score}</td>
                    <td className="px-4 py-3 text-gray-600">{weight}%</td>
                    <td className="px-4 py-3 font-semibold" style={{ color }}>{contribution.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-800" colSpan={5}>Total WQI</td>
                  <td className="px-4 py-3 text-2xl font-bold" style={{ color: '#FF9800' }}>{total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AdvancedLayout>
  );
};

export default WQIBreakdown;

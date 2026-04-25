import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { LucideIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: 'stable' | 'warning' | 'critical';
  trend?: Array<{ value: number }>;
}

export function KPICard({ title, value, unit, icon: Icon, status, trend }: KPICardProps) {
  const statusColors = {
    stable: { bg: '#E8F5E9', text: '#4CAF50', gradient: 'from-emerald-50 to-green-50', border: '#4CAF50' },
    warning: { bg: '#FFF3E0', text: '#FF9800', gradient: 'from-orange-50 to-amber-50', border: '#FF9800' },
    critical: { bg: '#FFEBEE', text: '#F44336', gradient: 'from-red-50 to-pink-50', border: '#F44336' },
  };

  const colors = status ? statusColors[status] : { bg: '#E3F2FD', text: '#2E75B6', gradient: 'from-blue-50 to-cyan-50', border: '#2E75B6' };

  return (
    <Card className="p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4" style={{ borderLeftColor: colors.border }}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-30 pointer-events-none`}></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: colors.text, boxShadow: `0 4px 14px 0 ${colors.text}40` }}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {status && (
            <Badge className="text-xs px-3 py-1 font-semibold uppercase tracking-wide" style={{ backgroundColor: colors.bg, color: colors.text, border: `1.5px solid ${colors.text}` }}>
              {status}
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium text-[#555555] mb-2 uppercase tracking-wide">{title}</p>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-[#212121]">{value}</span>
          {unit && <span className="text-base text-[#555555] font-medium">{unit}</span>}
        </div>
        {trend && trend.length > 0 && (
          <div className="h-14 -mx-1 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <Line type="monotone" dataKey="value" stroke={colors.text} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

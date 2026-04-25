import { useId } from 'react';

interface WQIGaugeProps {
  value: number;
  size?: number;
  color: string;
  bgColor: string;
  status: string;
  /** When true the score + status badge are hidden — use when the parent already shows them */
  arcOnly?: boolean;
}

export function WQIGauge({ value, size = 180, color, status, arcOnly = false }: WQIGaugeProps) {
  const uid           = useId().replace(/:/g, '');
  const trackId       = `gt-${uid}`;
  const fillId        = `gf-${uid}`;

  const radius        = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength     = circumference * 0.75;
  const progress      = Math.min(Math.max(value / 100, 0), 1);
  const filled        = arcLength * progress;
  const gap           = arcLength - filled;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={trackId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#E2E8F0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Rotate arcs internally around SVG center — no CSS transform needed */}
        <g transform={`rotate(135, ${size / 2}, ${size / 2})`}>
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={`url(#${trackId})`}
            strokeWidth={arcOnly ? 10 : 14}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          />
          {/* Value fill */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={`url(#${fillId})`}
            strokeWidth={arcOnly ? 10 : 14}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${gap + (circumference - arcLength)}`}
            style={{ transition: 'stroke-dasharray 1.2s ease-in-out' }}
          />
        </g>
      </svg>

      {/* Inner content — hidden in arcOnly mode */}
      {!arcOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className="tabular-nums font-black leading-none"
            style={{ fontSize: size * 0.24, color }}
          >
            {value}
          </span>
          <span style={{ fontSize: size * 0.08, color: '#94A3B8', fontWeight: 500 }}>
            / 100 WQI
          </span>
          <div
            className="px-2 py-0.5 rounded-full mt-0.5"
            style={{ background: `${color}22`, border: `1.5px solid ${color}44` }}
          >
            <span style={{ fontSize: size * 0.072, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
              {status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

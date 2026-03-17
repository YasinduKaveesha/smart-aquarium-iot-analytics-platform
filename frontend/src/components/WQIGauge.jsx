import React from 'react';

const WQIGauge = ({ value = 62, size = 180, color = '#FF9800' }) => {
  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.065;

  // 270-degree arc from 135deg to 405deg
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = 270;
  const valueAngle = startAngle + (value / 100) * totalAngle;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const arcPath = (start, end) => {
    const x1 = cx + radius * Math.cos(toRad(start));
    const y1 = cy + radius * Math.sin(toRad(start));
    const x2 = cx + radius * Math.cos(toRad(end));
    const y2 = cy + radius * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      {/* Background track */}
      <path
        d={arcPath(startAngle, endAngle)}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={arcPath(startAngle, valueAngle)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize={size * 0.2} fontWeight="bold">
        {value}
      </text>
      <text x={cx} y={cy + size * 0.1} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={size * 0.065}>
        WQI Score
      </text>
    </svg>
  );
};

export default WQIGauge;

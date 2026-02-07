import type { CSSProperties } from 'react';

export const Sparkline = (props: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  showArea?: boolean;
  showLastDot?: boolean;
  className?: string;
  style?: CSSProperties;
}) => {
  const width = props.width ?? 240;
  const height = props.height ?? 64;
  const stroke = props.stroke ?? '#0f766e';
  const strokeWidth = props.strokeWidth ?? 2.75;
  const showArea = props.showArea ?? true;
  const showLastDot = props.showLastDot ?? true;

  const values = props.values.filter((v) => Number.isFinite(v));
  if (values.length < 2) {
    return <div className={props.className} style={props.style} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 2) + 1;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 2) + 1;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  const lastX = (width - 2) + 1;
  const lastY = height - ((values[values.length - 1]! - min) / range) * (height - 2) - 1;
  const areaPath = `${path} L ${lastX} ${height - 1} L 1 ${height - 1} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={props.className}
      style={props.style}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2dd4bf" stopOpacity="0.28" />
          <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
        </linearGradient>
      </defs>

      {showArea ? <path d={areaPath} fill="url(#sparkline-fill)" /> : null}

      <polyline
        points={points}
        fill="none"
        stroke="#99f6e4"
        strokeWidth={strokeWidth + 2}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />

      {showLastDot ? (
        <>
          <circle cx={lastX} cy={lastY} r={5.5} fill="#ffffff" opacity={0.9} />
          <circle cx={lastX} cy={lastY} r={3.5} fill={stroke} />
        </>
      ) : null}
    </svg>
  );
};

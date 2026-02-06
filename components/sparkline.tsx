import type { CSSProperties } from 'react';

export const Sparkline = (props: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) => {
  const width = props.width ?? 240;
  const height = props.height ?? 64;
  const stroke = props.stroke ?? '#059669';
  const strokeWidth = props.strokeWidth ?? 2;

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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={props.className}
      style={props.style}
      aria-hidden
    >
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

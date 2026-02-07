export const fmt1 = (n: number): string => {
  if (!Number.isFinite(n)) return '-';
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};

export const fmt0 = (n: number): string => {
  if (!Number.isFinite(n)) return '-';
  return String(Math.round(n));
};

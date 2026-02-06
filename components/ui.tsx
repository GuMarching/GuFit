import type { ReactNode } from 'react';

export const Card = (props: { title?: string; children: ReactNode }) => {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {props.title ? <h2 className="mb-3 text-base font-semibold tracking-tight text-gray-900">{props.title}</h2> : null}
      {props.children}
    </section>
  );
};

export const Field = (props: { label: string; children: ReactNode }) => {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-gray-700">{props.label}</div>
      {props.children}
    </label>
  );
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      {...props}
      className={
        'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/25 ' +
        (props.className ?? '')
      }
    />
  );
};

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select
      {...props}
      className={
        'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/25 ' +
        (props.className ?? '')
      }
    />
  );
};

export const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={
        'w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 ' +
        (props.className ?? '')
      }
    />
  );
};

export const DangerButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={
        'rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 ' +
        (props.className ?? '')
      }
    />
  );
};

export const Progress = (props: { value: number; max: number }) => {
  const pct = props.max <= 0 ? 0 : Math.max(0, Math.min(100, (props.value / props.max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
    </div>
  );
};

export const StatRow = (props: { label: string; value: ReactNode; sub?: ReactNode }) => {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-600">{props.label}</div>
        {props.sub ? <div className="text-[11px] text-gray-500">{props.sub}</div> : null}
      </div>
      <div className="shrink-0 text-sm font-semibold text-gray-900">{props.value}</div>
    </div>
  );
};

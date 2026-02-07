import type { ReactNode } from 'react';

export const Card = (props: { title?: string; children: ReactNode }) => {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white/90 p-4 shadow-sm backdrop-blur">
      {props.title ? <h2 className="mb-3 text-base font-semibold tracking-tight text-gray-900">{props.title}</h2> : null}
      {props.children}
    </section>
  );
};

export const CardMuted = (props: { title?: string; children: ReactNode }) => {
  return (
    <section className="rounded-3xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
      {props.title ? <h2 className="mb-3 text-base font-semibold tracking-tight text-gray-900">{props.title}</h2> : null}
      {props.children}
    </section>
  );
};

export const Field = (props: { label: string; children: ReactNode }) => {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-semibold text-gray-700">{props.label}</div>
      {props.children}
    </label>
  );
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      {...props}
      className={
        'w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 ' +
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
        'w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 ' +
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
        'w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/25 disabled:cursor-not-allowed disabled:opacity-60 ' +
        (props.className ?? '')
      }
    />
  );
};

export const SecondaryButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={
        'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-900 shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60 ' +
        (props.className ?? '')
      }
    />
  );
};

export const GhostButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={
        'w-full rounded-2xl px-4 py-2.5 text-sm font-extrabold text-gray-900 transition active:translate-y-px active:scale-[0.99] hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60 ' +
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
        'rounded-2xl bg-rose-600 px-3 py-2 text-sm font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60 ' +
        (props.className ?? '')
      }
    />
  );
};

export const Pill = (props: { children: ReactNode; tone?: 'default' | 'primary' | 'muted'; className?: string }) => {
  const tone = props.tone ?? 'default';
  const cls =
    tone === 'primary'
      ? 'border-teal-200 bg-teal-50 text-teal-800'
      : tone === 'muted'
        ? 'border-gray-200 bg-gray-50 text-gray-700'
        : 'border-gray-200 bg-white text-gray-800';
  return (
    <span
      className={
        `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls} ` +
        (props.className ?? '')
      }
    >
      {props.children}
    </span>
  );
};

export const Progress = (props: { value: number; max: number }) => {
  const pct = props.max <= 0 ? 0 : Math.max(0, Math.min(100, (props.value / props.max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
    </div>
  );
};

export const StatRow = (props: { label: string; value: ReactNode; sub?: ReactNode }) => {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-gray-600">{props.label}</div>
        {props.sub ? <div className="text-[11px] text-gray-500">{props.sub}</div> : null}
      </div>
      <div className="shrink-0 text-sm font-semibold text-gray-900">{props.value}</div>
    </div>
  );
};

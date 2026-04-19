import React from 'react';

export const page = 'min-h-screen bg-slate-900 text-slate-100 p-6';
export const card = 'rounded-2xl border border-slate-800 bg-slate-800/70 p-5 shadow';
export const input = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500';
export const button = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50';
export const buttonSecondary = 'rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700';
export const smallButton = 'rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800';
export const pill = 'inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs';

export function StatusBadge({ value }) {
  const map = {
    draft: 'bg-slate-700 text-slate-100',
    active: 'bg-blue-900 text-blue-200',
    assigned: 'bg-slate-700 text-slate-100',
    in_progress: 'bg-amber-900 text-amber-200',
    submitted: 'bg-violet-900 text-violet-200',
    resubmitted: 'bg-orange-900 text-orange-200',
    approved: 'bg-emerald-900 text-emerald-200',
    rejected: 'bg-rose-900 text-rose-200',
    completed: 'bg-emerald-900 text-emerald-200',
    required: 'bg-cyan-900 text-cyan-200',
    optional: 'bg-slate-700 text-slate-100',
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${map[value] || 'bg-slate-700 text-slate-100'}`}>{value || 'unknown'}</span>;
}

export function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ text }) {
  return <div className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">{text}</div>;
}
export const pretty = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};
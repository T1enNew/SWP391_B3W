import React from 'react';

const cardStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
};

export const StatCard = ({ title, value, hint, accent }) => (
  <div style={{ ...cardStyle, padding: 20, minHeight: 118, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 5, background: accent }} />
    <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 10 }}>{title}</div>
    <div style={{ color: '#f8fafc', fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>{hint}</div>
  </div>
);

export const ProgressBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 10, background: '#0f172a', borderRadius: 999, overflow: 'hidden', border: '1px solid #1e293b' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
        <span>{value}/{max}</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
};

export const MiniBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px', gap: 12, alignItems: 'center' }}>
      <div style={{ color: '#cbd5e1', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={label}>
        {label}
      </div>
      <div style={{ height: 12, background: '#0f172a', borderRadius: 999, overflow: 'hidden', border: '1px solid #1e293b' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right' }}>{value}</div>
    </div>
  );
};

export const StatusPill = ({ label, color, bg }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, color, background: bg, border: `1px solid ${color}40` }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
    {label}
  </span>
);

// DashboardComponents.jsx
// Tập hợp các UI component tái sử dụng cho trang Manager Dashboard.
// Không chứa logic nghiệp vụ — chỉ nhận props và render.
//
// Danh sách export:
//   StatCard        — Thẻ KPI hiển thị 1 chỉ số (tổng, tỷ lệ...) với màu accent và icon
//   ProgressBar     — Thanh tiến độ có nhãn giá trị và % bên dưới
//   MiniBar         — Thanh tiến độ thu gọn dạng 1 hàng (label | bar | value)
//   StatusPill      — Nhãn badge tròn với chấm màu (trạng thái dataset/project)
//   SectionHeader   — Tiêu đề + mô tả phụ của từng section trong dashboard
//   AlertItem       — Dòng cảnh báo màu theo severity (error/warning/info)
//   QuickActionCard — Nút điều hướng nhanh dạng card (icon + label + mô tả)
//   PipelineStage   — Ô đại diện 1 bước trong Task Pipeline, nối bởi mũi tên ›

import React from 'react';

// Màu nền/border/chữ dùng chung trong tất cả component của file này
const C = {
  panel:  '#0d1829',
  border: '#1a2740',
  text:   '#e2e8f0',
  muted:  '#64748b',
};

// StatCard — Thẻ chỉ số KPI
// Props: title (nhãn), value (giá trị hiển thị lớn), hint (mô tả nhỏ bên dưới),
//        accent (màu thanh trái + highlight), icon (emoji nền mờ góc phải)
export const StatCard = ({ title, value, hint, accent, icon }) => (
  <div style={{
    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '18px 20px',
    minHeight: 110, position: 'relative', overflow: 'hidden',
    transition: 'transform 0.15s, box-shadow 0.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}40`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
  >
    <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 4, background: `linear-gradient(180deg, ${accent}, ${accent}80)`, borderRadius: '16px 0 0 16px' }} />
    <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 22, opacity: 0.15 }}>{icon}</div>
    <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{title}</div>
    <div style={{ color: '#f8fafc', fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
    <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{hint}</div>
  </div>
);

// ProgressBar — Thanh tiến độ đầy đủ: bar + chú thích "value/max  X%"
// Tự clamp pct về [0, 100] để tránh bar tràn khỏi container
export const ProgressBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 8, background: '#060d1a', borderRadius: 999, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ marginTop: 5, fontSize: 12, color: C.muted, display: 'flex', justifyContent: 'space-between' }}>
        <span>{value}/{max}</span><span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
    </div>
  );
};

// MiniBar — Dạng thu gọn: "label | bar | count" trên 1 hàng
// Dùng trong bảng so sánh nhiều annotator/reviewer (Team Performance)
export const MiniBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: 10, alignItems: 'center' }}>
      <div style={{ color: '#cbd5e1', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</div>
      <div style={{ height: 8, background: '#060d1a', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s' }} />
      </div>
      <div style={{ color: C.muted, fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{value}</div>
    </div>
  );
};

// StatusPill — Badge tròn với chấm màu bên trái nhãn
// Dùng để hiển thị trạng thái dataset (Ready / Reviewing / Annotating / Needs Attention...)
export const StatusPill = ({ label, color, bg }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${color}40` }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{label}
  </span>
);

// SectionHeader — Tiêu đề section: bên trái là title + subtitle, bên phải là action (nút tùy chọn)
export const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
);

// AlertItem — Dòng cảnh báo có màu nền, border và icon theo mức độ nghiêm trọng (sev)
//   sev: 'error' | 'warning' | 'info'  (mặc định là xám nếu không khớp)
export const AlertItem = ({ type, msg, sev }) => {
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   icon: '🔴', color: '#fca5a5' },
    warning: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  icon: '🟡', color: '#fcd34d' },
    info:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  icon: '🔵', color: '#93c5fd' },
  }[sev] || { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', icon: '⚪', color: C.muted };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ fontSize: 13, color: cfg.color, lineHeight: 1.5 }}>{msg}</span>
    </div>
  );
};

// QuickActionCard — Nút điều hướng nhanh dạng card (icon + tên + mô tả ngắn)
// Hover đổi border và nền theo màu accent của từng action
export const QuickActionCard = ({ icon, label, desc, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '16px 18px', cursor: 'pointer', textAlign: 'left', width: '100%',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}10`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.panel; }}
  >
    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{desc}</div>
    </div>
  </button>
);

// PipelineStage — Ô đại diện 1 bước trong luồng Task Pipeline
// isLast=true → bỏ mũi tên › ở cuối (không thêm separator sau ô cuối)
export const PipelineStage = ({ label, value, color, isLast }) => (
  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
    <div style={{ flex: 1, background: '#060d1a', border: `1px solid ${color}40`, borderRadius: 12, padding: '14px 12px', textAlign: 'center', position: 'relative' }}>
      <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 8, height: 3, borderRadius: 999, background: `${color}30`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 999 }} />
      </div>
    </div>
    {!isLast && (
      <div style={{ color: C.muted, fontSize: 18, padding: '0 6px', flexShrink: 0 }}>›</div>
    )}
  </div>
);

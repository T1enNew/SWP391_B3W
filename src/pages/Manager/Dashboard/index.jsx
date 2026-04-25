import React, { useState } from 'react';
import { StatCard, ProgressBar, StatusPill } from './DashboardComponents';
import { useDashboard } from './hooks/useDashboard';

const C = {
  bg:      '#080f1e',
  panel:   '#0d1829',
  border:  '#1a2740',
  text:    '#e2e8f0',
  muted:   '#64748b',
  primary: '#3b82f6',
};

const card = {
  background:   C.panel,
  border:       `1px solid ${C.border}`,
  borderRadius: 16,
  boxShadow:    '0 4px 24px rgba(0,0,0,0.25)',
};

const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: C.text,
  marginBottom: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const PAGE_SIZE = 5;

// Row đơn giản trong bảng Dataset health
const DatasetRow = ({ ds, index, pageOffset }) => {
  const pct = ds.raw > 0 ? Math.round((ds.approved / ds.raw) * 100) : 0;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 110px 60px 60px 60px 60px 90px',
        gap: 12,
        alignItems: 'center',
        padding: '13px 16px',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* # */}
      <span style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>{pageOffset + index + 1}</span>

      {/* Name + type */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{ color: C.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={ds.name}
        >
          {ds.name}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
          {String(ds.type || 'image').toUpperCase()} • {ds.raw} items
        </div>
      </div>

      {/* Progress bar + % */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: '#0f172a', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: ds.stateColor, borderRadius: 999, transition: 'width 0.4s' }} />
        </div>
        <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{pct}%</span>
      </div>

      {/* Stats */}
      <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.approved}</span>
      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.submitted}</span>
      <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.pendingAnnotation}</span>
      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.rejected}</span>

      {/* Status pill */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <StatusPill label={ds.state} color={ds.stateColor} bg={ds.stateBg} />
      </div>
    </div>
  );
};

// Header cột của bảng
const TableHeader = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 110px 60px 60px 60px 60px 90px',
      gap: 12,
      padding: '10px 16px',
      borderBottom: `1px solid ${C.border}`,
      background: 'rgba(15,23,42,0.6)',
      borderRadius: '12px 12px 0 0',
    }}
  >
    <span style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>#</span>
    <span style={{ color: C.muted, fontSize: 11 }}>Dataset</span>
    <span style={{ color: C.muted, fontSize: 11 }}>Progress</span>
    <span style={{ color: '#22c55e', fontSize: 11, textAlign: 'center' }}>Done</span>
    <span style={{ color: '#f59e0b', fontSize: 11, textAlign: 'center' }}>Review</span>
    <span style={{ color: '#3b82f6', fontSize: 11, textAlign: 'center' }}>Anno.</span>
    <span style={{ color: '#ef4444', fontSize: 11, textAlign: 'center' }}>Redo</span>
    <span style={{ color: C.muted, fontSize: 11, textAlign: 'right' }}>Status</span>
  </div>
);

// Thanh phân trang
const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '12px 16px' }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        style={{
          padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: page === 0 ? 'transparent' : C.panel,
          color: page === 0 ? C.muted : C.text,
          cursor: page === 0 ? 'default' : 'pointer', fontSize: 13,
        }}
      >
        ‹
      </button>

      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            width: 30, height: 30, borderRadius: 8,
            border: `1px solid ${i === page ? C.primary : C.border}`,
            background: i === page ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: i === page ? C.primary : C.muted,
            cursor: 'pointer', fontSize: 13, fontWeight: i === page ? 700 : 400,
          }}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages - 1}
        style={{
          padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: page === totalPages - 1 ? 'transparent' : C.panel,
          color: page === totalPages - 1 ? C.muted : C.text,
          cursor: page === totalPages - 1 ? 'default' : 'pointer', fontSize: 13,
        }}
      >
        ›
      </button>
    </div>
  );
};

const ManagerDashboard = () => {
  const { loading, stats } = useDashboard();
  const [dsPage, setDsPage] = useState(0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: C.muted, fontSize: 14 }}>Đang tải dữ liệu...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const totalDsPages = Math.ceil(stats.datasetHealth.length / PAGE_SIZE);
  const pagedDs      = stats.datasetHealth.slice(dsPage * PAGE_SIZE, dsPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '28px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ ...card, padding: '20px 24px', background: 'linear-gradient(135deg, #0d1829 0%, #080f1e 100%)' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 6 }}>Manager Dashboard</div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            Theo dõi toàn bộ trạng thái dataset, review, annotation và hiệu suất gán nhãn.
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <StatCard title="Datasets"          value={stats.totalDatasets}        hint="Tổng số bộ dữ liệu"   accent="#3b82f6" />
          <StatCard title="Projects"          value={stats.totalProjects}        hint="Tổng số project"       accent="#8b5cf6" />
          <StatCard title="Approved"          value={stats.totalApproved}        hint="Dữ liệu đã duyệt"     accent="#22c55e" />
          <StatCard title="Chờ review"        value={stats.totalSubmitted}       hint="Annotator đã nộp"      accent="#f59e0b" />
          <StatCard title="Cần làm lại"       value={stats.totalRejected}        hint="Reviewer reject"       accent="#ef4444" />
          <StatCard title="Completion"        value={`${stats.completionRate}%`} hint="Approved / raw items"  accent="#06b6d4" />
        </div>

        {/* ── Pipeline + Quality ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          {/* Pipeline */}
          <div style={{ ...card, padding: 20 }}>
            <div style={sectionTitle}>
              <span>Pipeline hệ thống</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: 'Raw',        value: stats.pipeline.raw,        color: '#64748b' },
                { label: 'Annotating', value: stats.pipeline.annotating, color: '#3b82f6' },
                { label: 'Reviewing',  value: stats.pipeline.reviewing,  color: '#f59e0b' },
                { label: 'Approved',   value: stats.pipeline.approved,   color: '#22c55e' },
                { label: 'Rework',     value: stats.pipeline.rework,     color: '#ef4444' },
              ].map((x) => (
                <div key={x.label} style={{ background: '#060d1a', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{x.label}</div>
                  <div style={{ color: x.color, fontSize: 28, fontWeight: 800 }}>{x.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div style={{ ...card, padding: 20 }}>
            <div style={sectionTitle}><span>Chất lượng review</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Approval rate</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{stats.approvalRate}%</span>
                </div>
                <ProgressBar value={stats.approvalRate} max={100} color="#22c55e" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Completion rate</span>
                  <span style={{ color: C.primary, fontWeight: 700 }}>{stats.completionRate}%</span>
                </div>
                <ProgressBar value={stats.completionRate} max={100} color={C.primary} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Dataset health table ── */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Dataset health</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: C.muted, fontSize: 12 }}>
                {dsPage * PAGE_SIZE + 1}–{Math.min((dsPage + 1) * PAGE_SIZE, stats.datasetHealth.length)} / {stats.datasetHealth.length} datasets
              </span>
            </div>
          </div>

          {/* Table */}
          <TableHeader />

          {pagedDs.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>
              Chưa có dataset nào
            </div>
          ) : (
            pagedDs.map((ds, i) => (
              <DatasetRow key={ds.id} ds={ds} index={i} pageOffset={dsPage * PAGE_SIZE} />
            ))
          )}

          <Pagination page={dsPage} totalPages={totalDsPages} onChange={(p) => setDsPage(p)} />
        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;

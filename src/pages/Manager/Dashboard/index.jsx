// Dashboard/index.jsx
// Trang tổng quan dành cho Manager — hiển thị toàn cảnh hệ thống annotation.
//
// Layout từ trên xuống:
//   1. Header          — tên dashboard + ngày + bảng chú thích màu
//   2. KPI Cards       — 7 chỉ số tổng quan (datasets, projects, tasks, approved, review, rework, completion)
//   3. Task Pipeline   — phân bổ tasks theo từng stage (Raw → Annotating → Submitted → Approved / Rework)
//   4. Quality + Alerts + Quick Actions  — 3 cột: chất lượng, cảnh báo, điều hướng nhanh
//   5. Project Overview — bảng danh sách project, sắp xếp theo rủi ro
//   6. Dataset Health  — bảng trạng thái từng dataset, có phân trang
//   7. Team Performance — hiệu suất annotator vs reviewer
//
// Tất cả data lấy từ useDashboard() — component này chỉ render.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard, ProgressBar, StatusPill, SectionHeader, AlertItem, QuickActionCard, PipelineStage } from './DashboardComponents';
import { useDashboard } from './hooks/useDashboard';

// Bảng màu toàn cục của dashboard — tất cả component inline dùng object này
const C = {
  bg:      '#080f1e',
  panel:   '#0d1829',
  border:  '#1a2740',
  text:    '#e2e8f0',
  muted:   '#64748b',
  primary: '#3b82f6',
};

// Style chung cho các card section (nền tối, viền, bo góc, đổ bóng)
const card = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.25)' };

// Số dataset hiển thị mỗi trang trong bảng Dataset Health
const PAGE_SIZE = 5;

// ── Dataset Health Table ──────────────────────────────────────────────────────

// DatasetRow — 1 hàng trong bảng Dataset Health
// Hiển thị: tên dataset, loại, thanh tiến độ approved%, các số approved/submitted/annotating/rejected, trạng thái
// Có cảnh báo ⚠️ nếu tỷ lệ reject > 30%
const DatasetRow = ({ ds, index, offset }) => {
  const pct = ds.raw > 0 ? Math.round((ds.approved / ds.raw) * 100) : 0;
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 64px 64px 64px 64px 110px', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>{offset + index + 1}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ds.name}>{ds.name}</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{String(ds.type || 'IMAGE').toUpperCase()} · {ds.raw} items {ds.rejRate > 30 ? '⚠️' : ''}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: '#0a1220', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: ds.stateColor, borderRadius: 999, transition: 'width 0.4s' }} />
        </div>
        <span style={{ color: C.muted, fontSize: 11, flexShrink: 0, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
      </div>
      <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.approved}</span>
      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.submitted}</span>
      <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.pendingAnnotation}</span>
      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{ds.rejected}</span>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <StatusPill label={ds.state} color={ds.stateColor} bg={ds.stateBg} />
      </div>
    </div>
  );
};

// DatasetTableHeader — Header cố định của bảng Dataset Health, căn chỉnh theo grid của DatasetRow
const DatasetTableHeader = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 64px 64px 64px 64px 110px', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: 'rgba(6,13,26,0.6)', borderRadius: '12px 12px 0 0' }}>
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

// Pagination — Điều hướng trang cho bảng Dataset Health
// Ẩn hoàn toàn nếu chỉ có 1 trang (total <= 1)
const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '12px 16px' }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 0}
        style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: page === 0 ? C.muted : C.text, cursor: page === 0 ? 'default' : 'pointer', fontSize: 13 }}>‹</button>
      {Array.from({ length: total }, (_, i) => (
        <button key={i} onClick={() => onChange(i)}
          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${i === page ? C.primary : C.border}`, background: i === page ? 'rgba(59,130,246,0.15)' : 'transparent', color: i === page ? C.primary : C.muted, cursor: 'pointer', fontSize: 13, fontWeight: i === page ? 700 : 400 }}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === total - 1}
        style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: page === total - 1 ? C.muted : C.text, cursor: page === total - 1 ? 'default' : 'pointer', fontSize: 13 }}>›</button>
    </div>
  );
};

// ── Project Row ───────────────────────────────────────────────────────────────

// Màu sắc badge trạng thái project — dùng trong ProjectRow
const statusCfg = {
  'On Track':     { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  'At Risk':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  'Needs Review': { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
  'Overdue':      { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
};

// ProjectRow — 1 hàng trong bảng Project Overview
// Hiển thị: số thứ tự, tên project, thanh tiến độ, deadline (format dd/mm/yyyy), status badge, approved/total
const ProjectRow = ({ p, index }) => {
  const cfg = statusCfg[p.status] || statusCfg['On Track'];
  const barColor = p.progress >= 80 ? '#22c55e' : p.progress >= 40 ? '#3b82f6' : '#f59e0b';
  const deadlineStr = p.deadline
    ? new Date(p.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '28px 1fr 160px 100px 90px 80px', gap: 14, alignItems: 'center', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>{index + 1}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{p.total} tasks · reject {p.rejRate}%</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: '#0a1220', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${p.progress}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 0.4s' }} />
        </div>
        <span style={{ color: barColor, fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{p.progress}%</span>
      </div>
      <span style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>{deadlineStr}</span>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{p.status}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }} title="Approved">{p.approved}</span>
        <span style={{ color: C.muted, fontSize: 12 }}>/</span>
        <span style={{ color: C.muted, fontSize: 12 }}>{p.total}</span>
      </div>
    </div>
  );
};

// ── Team Performance Row ──────────────────────────────────────────────────────

// TeamRow — 1 hàng trong bảng Annotator/Reviewer Performance
// type='annotator': icon ✏️, hiển thị tasks/approved/rejected
// type='reviewer' : icon 👁️, hiển thị reviewed/approved/rejected
// approvalRate được tô màu: xanh ≥80%, vàng 50–79%, đỏ <50%
const TeamRow = ({ member, type }) => {
  const rateColor = member.approvalRate >= 80 ? '#22c55e' : member.approvalRate >= 50 ? '#f59e0b' : '#ef4444';
  const mainVal   = type === 'annotator' ? member.tasks    : member.reviewed;
  const mainLabel = type === 'annotator' ? 'tasks'         : 'reviewed';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: type === 'annotator' ? 'rgba(59,130,246,0.15)' : 'rgba(167,139,250,0.15)', border: `1px solid ${type === 'annotator' ? '#3b82f640' : '#a78bfa40'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
        {type === 'annotator' ? '✏️' : '👁️'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
          {mainVal} {mainLabel}
          {type === 'annotator' && ` · ${member.approved} done · ${member.rejected} redo`}
          {type === 'reviewer'  && ` · ${member.approved} approved · ${member.rejected} rejected`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: rateColor, fontWeight: 800, fontSize: 14 }}>{member.approvalRate}%</div>
        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>pass rate</div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

// ManagerDashboard — Component gốc của trang, render toàn bộ các section.
// dsPage: trang hiện tại của bảng Dataset Health (phân trang phía client)
// activeProjects: lọc bỏ archived, lấy tối đa 8 dự án đang hoạt động cho bảng Project Overview
const ManagerDashboard = () => {
  const { loading, stats } = useDashboard();
  const navigate           = useNavigate();
  const [dsPage, setDsPage] = useState(0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  const activeProjects = stats.projectStats.filter((p) => p.taskStatus !== 'archived').slice(0, 8);

  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '24px 22px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ ...card, padding: '20px 28px', background: 'linear-gradient(135deg, #0d1f3c 0%, #080f1e 60%, #0a1628 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>
              Manager Dashboard
              <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 500, color: C.muted, letterSpacing: 0 }}>LabelFlow</span>
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              Theo dõi dataset · annotation · review · hiệu suất nhóm
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.muted, fontSize: 12 }}>{dateStr}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[
                { dot: '#22c55e', label: 'Approved' },
                { dot: '#3b82f6', label: 'Annotating' },
                { dot: '#f59e0b', label: 'Reviewing' },
                { dot: '#ef4444', label: 'Rework' },
              ].map((x) => (
                <span key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.dot, display: 'inline-block' }} />{x.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 1: KPI Cards ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
          <StatCard title="Datasets"      value={stats.totalDatasets}        hint="Bộ dữ liệu"         accent="#3b82f6" icon="🗂️" />
          <StatCard title="Projects"      value={stats.totalProjects}        hint="Dự án đang quản lý" accent="#8b5cf6" icon="📁" />
          <StatCard title="Total Tasks"   value={stats.totalTasks}           hint="Toàn bộ tasks"       accent="#06b6d4" icon="📋" />
          <StatCard title="Approved"      value={stats.totalApproved}        hint="Đã duyệt xong"      accent="#22c55e" icon="✅" />
          <StatCard title="Chờ review"    value={stats.totalSubmitted}       hint="Annotator đã nộp"   accent="#f59e0b" icon="⏳" />
          <StatCard title="Cần làm lại"   value={stats.totalRejected}        hint="Reviewer reject"    accent="#ef4444" icon="🔄" />
          <StatCard title="Completion"    value={`${stats.completionRate}%`} hint="Approved / raw items" accent="#10b981" icon="🎯" />
        </div>

        {/* ── Section 2: Pipeline ─────────────────────────────────────────────── */}
        <div style={{ ...card, padding: '20px 24px' }}>
          <SectionHeader
            title="Task Pipeline"
            subtitle="Phân bổ tasks theo từng giai đoạn trong quy trình"
          />
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            <PipelineStage label="Raw Items"  value={stats.pipeline.raw}        color="#64748b" />
            <PipelineStage label="Annotating" value={stats.pipeline.annotating} color="#3b82f6" />
            <PipelineStage label="Submitted"  value={stats.pipeline.submitted}  color="#a78bfa" />
            <PipelineStage label="Approved"   value={stats.pipeline.approved}   color="#22c55e" />
            <PipelineStage label="Rework"     value={stats.pipeline.rework}     color="#ef4444" isLast />
          </div>
          {stats.totalTasks > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
                {[
                  { v: stats.pipeline.annotating, c: '#3b82f6' },
                  { v: stats.pipeline.submitted,  c: '#a78bfa' },
                  { v: stats.pipeline.approved,   c: '#22c55e' },
                  { v: stats.pipeline.rework,     c: '#ef4444' },
                ].map((x, i) => {
                  const pct = stats.totalTasks > 0 ? (x.v / stats.totalTasks) * 100 : 0;
                  return pct > 0 ? <div key={i} style={{ width: `${pct}%`, background: x.c, minWidth: 3 }} /> : null;
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Annotating', v: stats.pipeline.annotating, c: '#3b82f6' },
                  { label: 'Submitted',  v: stats.pipeline.submitted,  c: '#a78bfa' },
                  { label: 'Approved',   v: stats.pipeline.approved,   c: '#22c55e' },
                  { label: 'Rework',     v: stats.pipeline.rework,     c: '#ef4444' },
                ].map((x) => (
                  <span key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.muted }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
                    {x.label}: <b style={{ color: x.c }}>{x.v}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Quality + Section 7: Alerts + Section 8: Quick Actions ─ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>

          {/* Quality Metrics */}
          <div style={{ ...card, padding: '20px 24px' }}>
            <SectionHeader title="Quality Metrics" subtitle="Tỷ lệ chất lượng annotation" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Approval Rate</span>
                  <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 15 }}>{stats.approvalRate}%</span>
                </div>
                <ProgressBar value={stats.approvalRate} max={100} color="#22c55e" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Completion Rate</span>
                  <span style={{ color: C.primary, fontWeight: 800, fontSize: 15 }}>{stats.completionRate}%</span>
                </div>
                <ProgressBar value={stats.completionRate} max={100} color={C.primary} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Rejection Rate</span>
                  <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 15 }}>
                    {stats.totalTasks > 0 ? Math.round((stats.totalRejected / stats.totalTasks) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar value={stats.totalRejected} max={Math.max(stats.totalTasks, 1)} color="#ef4444" />
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(6,13,26,0.6)', borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Tổng quan</div>
                {[
                  { label: 'Total annotated', value: stats.totalTasks,    color: C.text    },
                  { label: 'Pending review',  value: stats.totalSubmitted, color: '#f59e0b' },
                  { label: 'Need rework',     value: stats.totalRejected, color: '#ef4444' },
                ].map((x) => (
                  <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: C.muted, fontSize: 12 }}>{x.label}</span>
                    <span style={{ color: x.color, fontWeight: 700, fontSize: 12 }}>{x.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div style={{ ...card, padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <SectionHeader
              title="Alerts & Warnings"
              subtitle={`${stats.alerts.length} cảnh báo hiện tại`}
            />
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }}>
              {stats.alerts.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '40px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                  Không có cảnh báo nào
                </div>
              ) : (
                stats.alerts.map((a, i) => <AlertItem key={i} type={a.type} msg={a.msg} sev={a.sev} />)
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ ...card, padding: '20px 24px' }}>
            <SectionHeader title="Quick Actions" subtitle="Thao tác nhanh" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <QuickActionCard icon="➕" label="Tạo Project mới"   desc="Khởi tạo dự án annotation"  color="#3b82f6" onClick={() => navigate('/manager/projects/create')} />
              <QuickActionCard icon="🗄️" label="Thêm Dataset"      desc="Upload bộ dữ liệu mới"      color="#8b5cf6" onClick={() => navigate('/manager/datasets')} />
              <QuickActionCard icon="👥" label="Quản lý Projects"  desc="Xem và phân công tasks"      color="#06b6d4" onClick={() => navigate('/manager/projects')} />
              <QuickActionCard icon="🏷️" label="Quản lý Labels"    desc="Thiết lập nhãn & taxonomy"  color="#10b981" onClick={() => navigate('/manager/labels')} />
            </div>
          </div>
        </div>

        {/* ── Section 5: Project Overview ─────────────────────────────────────── */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Project Overview</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Trạng thái các dự án đang hoạt động · sắp xếp theo độ rủi ro</div>
            </div>
            <button onClick={() => navigate('/manager/projects')} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 12, transition: 'color 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = '#3b82f6'; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
              Xem tất cả →
            </button>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 160px 100px 90px 80px', gap: 14, padding: '10px 18px', borderBottom: `1px solid ${C.border}`, background: 'rgba(6,13,26,0.5)' }}>
            <span style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>#</span>
            <span style={{ color: C.muted, fontSize: 11 }}>Project</span>
            <span style={{ color: C.muted, fontSize: 11 }}>Progress</span>
            <span style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>Deadline</span>
            <span style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>Status</span>
            <span style={{ color: C.muted, fontSize: 11, textAlign: 'right' }}>Done</span>
          </div>

          {activeProjects.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>Chưa có project nào
            </div>
          ) : (
            activeProjects.map((p, i) => <ProjectRow key={p.id} p={p} index={i} />)
          )}
        </div>

        {/* ── Section 4: Dataset Health Table ────────────────────────────────── */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Dataset Health</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Trạng thái từng bộ dữ liệu</div>
            </div>
            <span style={{ color: C.muted, fontSize: 12 }}>
              {dsPage * PAGE_SIZE + 1}–{Math.min((dsPage + 1) * PAGE_SIZE, stats.datasetHealth.length)} / {stats.datasetHealth.length} datasets
            </span>
          </div>
          <DatasetTableHeader />
          {pagedDs.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🗂️</div>Chưa có dataset nào
            </div>
          ) : (
            pagedDs.map((ds, i) => <DatasetRow key={ds.id} ds={ds} index={i} offset={dsPage * PAGE_SIZE} />)
          )}
          <Pagination page={dsPage} total={totalDsPages} onChange={setDsPage} />
        </div>

        {/* ── Section 6: Team Performance ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Annotators */}
          <div style={{ ...card, padding: '20px 24px' }}>
            <SectionHeader
              title="Annotator Performance"
              subtitle={`${stats.annotatorPerf.length} annotators đang hoạt động`}
            />
            {stats.annotatorPerf.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '30px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✏️</div>Chưa có dữ liệu annotator
              </div>
            ) : (
              <div>
                {stats.annotatorPerf.map((a, i) => <TeamRow key={i} member={a} type="annotator" />)}
              </div>
            )}
          </div>

          {/* Reviewers */}
          <div style={{ ...card, padding: '20px 24px' }}>
            <SectionHeader
              title="Reviewer Performance"
              subtitle={`${stats.reviewerPerf.length} reviewers đang hoạt động`}
            />
            {stats.reviewerPerf.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '30px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👁️</div>Chưa có dữ liệu reviewer
              </div>
            ) : (
              <div>
                {stats.reviewerPerf.map((r, i) => <TeamRow key={i} member={r} type="reviewer" />)}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;

import React from 'react';
import { StatCard, ProgressBar, StatusPill } from './DashboardComponents';
import { useDashboard } from './hooks/useDashboard';

const cardStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
};

const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#f8fafc',
  marginBottom: 16,
};

const ManagerDashboard = () => {
  const { loading, stats } = useDashboard();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: 24 }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b1733', color: '#fff', padding: 24 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Title ── */}
        <div style={{ ...cardStyle, padding: 24, marginBottom: 20, background: 'linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>Manager Dashboard</div>
          <div style={{ color: '#94a3b8', fontSize: 15 }}>
            Theo dõi toàn bộ trạng thái dataset, review, approved results và hiệu suất gán nhãn.
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard title="Datasets"        value={stats.totalDatasets}  hint="Tổng số bộ dữ liệu"  accent="#3b82f6" />
          <StatCard title="Projects"        value={stats.totalProjects}  hint="Tổng số project"      accent="#8b5cf6" />
          <StatCard title="Approved Items"  value={stats.totalApproved}  hint="Dữ liệu đã duyệt"    accent="#22c55e" />
          <StatCard title="Pending Review"  value={stats.totalSubmitted} hint="Đang chờ reviewer"    accent="#f59e0b" />
          <StatCard title="Rework / Rejected" value={stats.totalRejected} hint="Cần làm lại"         accent="#ef4444" />
          <StatCard title="Completion Rate" value={`${stats.completionRate}%`} hint="Approved / raw items" accent="#06b6d4" />
        </div>

        {/* ── Pipeline + Quality ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={sectionTitleStyle}>Pipeline hệ thống</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              {[
                { label: 'Raw',        value: stats.pipeline.raw,        color: '#64748b' },
                { label: 'Annotating', value: stats.pipeline.annotating, color: '#3b82f6' },
                { label: 'Reviewing',  value: stats.pipeline.reviewing,  color: '#f59e0b' },
                { label: 'Approved',   value: stats.pipeline.approved,   color: '#22c55e' },
                { label: 'Rework',     value: stats.pipeline.rework,     color: '#ef4444' },
              ].map((x) => (
                <div key={x.label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 16 }}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>{x.label}</div>
                  <div style={{ color: x.color, fontSize: 30, fontWeight: 800 }}>{x.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={sectionTitleStyle}>Chất lượng review</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Approval rate</div>
              <ProgressBar value={stats.approvalRate} max={100} color="#22c55e" />
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Completion rate</div>
              <ProgressBar value={stats.completionRate} max={100} color="#3b82f6" />
            </div>
          </div>
        </div>

        {/* ── Dataset health ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ ...sectionTitleStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Dataset health</span>
              <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>{stats.datasetHealth.length} datasets</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.datasetHealth.map((ds) => (
                <div key={ds.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 4 }}>{ds.name}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>{String(ds.type || 'image').toUpperCase()} • {ds.raw} items</div>
                    </div>
                    <StatusPill label={ds.state} color={ds.stateColor} bg={ds.stateBg} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <ProgressBar value={ds.approved} max={ds.raw || 1} color={ds.stateColor} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <div><div style={{ color: '#64748b', fontSize: 12 }}>Approved</div><div style={{ color: '#22c55e', fontWeight: 800 }}>{ds.approved}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: 12 }}>Reviewing</div><div style={{ color: '#f59e0b', fontWeight: 800 }}>{ds.submitted}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: 12 }}>Annotating</div><div style={{ color: '#3b82f6', fontWeight: 800 }}>{ds.pendingAnnotation}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: 12 }}>Rework</div><div style={{ color: '#ef4444', fontWeight: 800 }}>{ds.rejected}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManagerDashboard;

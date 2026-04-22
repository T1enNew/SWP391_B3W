import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { StatCard, ProgressBar, StatusPill } from './DashboardComponents';

const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token') || '';

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
  const [loading, setLoading]     = useState(true);
  const [datasets, setDatasets]   = useState([]);
  const [projects, setProjects]   = useState([]);
  const [statusList, setStatusList] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Only call endpoints that exist in Swagger
        const [datasetsRes, projectsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/datasets`, { headers }),
          axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers }),
        ]);

        const dsList =
          datasetsRes.status === 'fulfilled'
            ? Array.isArray(datasetsRes.value.data)
              ? datasetsRes.value.data
              : datasetsRes.value.data?.data || []
            : [];

        const pjList =
          projectsRes.status === 'fulfilled'
            ? Array.isArray(projectsRes.value.data)
              ? projectsRes.value.data
              : projectsRes.value.data?.data || projectsRes.value.data?.projects || []
            : [];

        setDatasets(dsList);
        setProjects(pjList);

        // Fetch task stats for each project (uses /api/tasks/project/:id which exists)
        const taskResults = await Promise.allSettled(
          pjList.map((p) => {
            const pid = p._id || p.id;
            return axios.get(`${API_URL}/api/tasks/project/${pid}`, { headers });
          })
        );

        // Build synthetic statusList from tasks
        const syntheticStatuses = dsList.map((ds) => {
          const dsId = ds._id || ds.id;
          const linkedProjects = pjList.filter((p) => {
            const did = p.dataset?.id || p.dataset?._id || p.dataset_id || p.datasetId;
            return did === dsId;
          });

          let totalRaw = ds.total_items || ds.totalItems || 0;
          const counts = { approved: 0, submitted: 0, rejected: 0, pendingAnnotation: 0 };

          linkedProjects.forEach((p) => {
            const pidx = pjList.indexOf(p);
            const taskRes = taskResults[pidx];
            if (taskRes?.status !== 'fulfilled') return;
            const tasks = Array.isArray(taskRes.value.data)
              ? taskRes.value.data
              : taskRes.value.data?.data || taskRes.value.data?.tasks || [];
            tasks.forEach((t) => {
              if (t.status === 'approved')  counts.approved++;
              else if (t.status === 'submitted') counts.submitted++;
              else if (t.status === 'rejected')  counts.rejected++;
              else counts.pendingAnnotation++;
            });
            if (!totalRaw) totalRaw = tasks.length;
          });

          return {
            datasetId: dsId,
            datasetName: ds.name || 'Unnamed dataset',
            datasetType: ds.type || 'image',
            totalRawItems: totalRaw,
            counts,
            votes: {},
            finalItems: [],
            annotators: [],
          };
        });

        setStatusList(syntheticStatuses);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
        setDatasets([]);
        setProjects([]);
        setStatusList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const stats = useMemo(() => {
    const totalDatasets  = datasets.length;
    const totalProjects  = projects.length;
    let totalRawItems    = 0;
    let totalApproved    = 0;
    let totalPending     = 0;
    let totalRejected    = 0;
    let totalSubmitted   = 0;
    let approveVotes     = 0;
    let rejectVotes      = 0;

    const labelMap     = {};
    const annotatorMap = {};

    statusList.forEach((s) => {
      totalRawItems  += s.totalRawItems || 0;
      totalApproved  += s.counts?.approved || 0;
      totalPending   += s.counts?.pendingAnnotation || 0;
      totalRejected  += s.counts?.rejected || 0;
      totalSubmitted += s.counts?.submitted || 0;
      approveVotes   += s.votes?.approveVotes || 0;
      rejectVotes    += s.votes?.rejectVotes  || 0;

      (s.finalItems || []).forEach((item) => {
        const buckets = [
          ...(Array.isArray(item?.labels?.objects)  ? item.labels.objects  : []),
          ...(Array.isArray(item?.labels?.spans)    ? item.labels.spans    : []),
          ...(Array.isArray(item?.labels?.segments) ? item.labels.segments : []),
        ];
        buckets.forEach((x) => {
          const key = (typeof x === 'string' && x) || x?.label || x?.text || x?.name || 'unknown';
          labelMap[key] = (labelMap[key] || 0) + 1;
        });
      });

      (s.annotators || []).forEach((a) => {
        const key = a.annotatorId || a.annotatorName || 'unknown';
        if (!annotatorMap[key]) {
          annotatorMap[key] = { name: a.annotatorName || 'Unknown', total: 0, approved: 0, rejected: 0, pending: 0 };
        }
        annotatorMap[key].total    += a.total    || 0;
        annotatorMap[key].approved += a.approved || 0;
        annotatorMap[key].rejected += a.rejected || 0;
        annotatorMap[key].pending  += a.pending  || 0;
      });
    });

    const reviewed        = approveVotes + rejectVotes;
    const approvalRate    = reviewed > 0 ? Math.round((approveVotes / reviewed) * 100) : 0;
    const completionRate  = totalRawItems > 0 ? Math.round((totalApproved / totalRawItems) * 100) : 0;

    const topLabels = Object.entries(labelMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const topAnnotators = Object.values(annotatorMap)
      .map((a) => ({
        ...a,
        passRate: a.approved + a.rejected > 0 ? Math.round((a.approved / (a.approved + a.rejected)) * 100) : 0,
      }))
      .sort((a, b) => b.approved - a.approved)
      .slice(0, 5);

    const datasetHealth = statusList.map((s) => {
      const raw               = s.totalRawItems || 0;
      const approved          = s.counts?.approved          || 0;
      const pendingAnnotation = s.counts?.pendingAnnotation || 0;
      const submitted         = s.counts?.submitted         || 0;
      const rejected          = s.counts?.rejected          || 0;
      const progress          = raw > 0 ? Math.round((approved / raw) * 100) : 0;

      let state = 'Not started', stateColor = '#94a3b8', stateBg = 'rgba(148,163,184,0.12)';
      if (approved > 0 && progress >= 100) {
        state = 'Ready';     stateColor = '#22c55e'; stateBg = 'rgba(34,197,94,0.12)';
      } else if (submitted > 0) {
        state = 'Reviewing'; stateColor = '#f59e0b'; stateBg = 'rgba(245,158,11,0.12)';
      } else if (pendingAnnotation > 0 || rejected > 0) {
        state = 'Annotating';stateColor = '#3b82f6'; stateBg = 'rgba(59,130,246,0.12)';
      }

      return { id: s.datasetId, name: s.datasetName, type: s.datasetType, raw, approved, submitted, pendingAnnotation, rejected, progress, state, stateColor, stateBg };
    });

    return {
      totalDatasets, totalProjects, totalRawItems, totalApproved, totalPending,
      totalRejected, totalSubmitted, approvalRate, completionRate,
      topLabels, topAnnotators, datasetHealth,
      pipeline: {
        raw: totalRawItems,
        annotating: totalPending + totalRejected,
        reviewing: totalSubmitted,
        approved: totalApproved,
        rework: totalRejected,
      },
    };
  }, [datasets, projects, statusList]);

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

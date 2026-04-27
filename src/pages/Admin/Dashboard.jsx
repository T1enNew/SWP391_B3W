import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getAuthHeaders } from '../../utils/auth';
import { getArray } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { getDisplayStatus, computeTaskStats, STATUS_CFG } from '../Manager/Projects/projectStatusUtils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, FolderOpen, Database, CheckCircle2,
  PenLine, Eye, Settings, FileText, ChevronRight,
  Activity, ShieldCheck, AlertTriangle, Clock,
  TrendingUp, Target, Award, Layers, RefreshCw,
} from 'lucide-react';

/* ════════════════════════════════════════════════
   Constants
════════════════════════════════════════════════ */
const STAGE_CFG = [
  { key: 'assigned',    label: 'Assigned',    color: '#64748b', bg: 'bg-slate-500' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6', bg: 'bg-blue-500' },
  { key: 'submitted',   label: 'Submitted',   color: '#f59e0b', bg: 'bg-amber-500' },
  { key: 'approved',    label: 'Approved',    color: '#10b981', bg: 'bg-emerald-500' },
  { key: 'rejected',    label: 'Rejected',    color: '#f43f5e', bg: 'bg-rose-500' },
];

/* Map STATUS_CFG color → tailwind badge classes for dark theme */
const statusBadgeCls = (color) => {
  const map = {
    '#22c55e': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    '#94a3b8': 'text-slate-400 bg-slate-400/10 border-slate-400/25',
    '#3b82f6': 'text-blue-400 bg-blue-400/10 border-blue-400/25',
    '#f59e0b': 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    '#a78bfa': 'text-violet-400 bg-violet-400/10 border-violet-400/25',
    '#c084fc': 'text-purple-400 bg-purple-400/10 border-purple-400/25',
    '#f97316': 'text-orange-400 bg-orange-400/10 border-orange-400/25',
    '#ef4444': 'text-rose-400 bg-rose-400/10 border-rose-400/25',
  };
  return map[color] || 'text-slate-400 bg-slate-400/10 border-slate-400/25';
};

/* Filter groups for Project Health */
const PH_FILTERS = [
  { key: 'all',      label: 'Tất cả' },
  { key: 'active',   label: 'Active' },
  { key: 'overdue',  label: 'Quá hạn' },
  { key: 'review',   label: 'Đang review' },
  { key: 'done',     label: 'Hoàn thành' },
  { key: 'draft',    label: 'Draft' },
];

/* ════════════════════════════════════════════════
   Data helpers
════════════════════════════════════════════════ */
const parseStages = (tasks) => {
  const s = { assigned: 0, in_progress: 0, submitted: 0, approved: 0, rejected: 0 };
  tasks.forEach((t) => {
    const st = (t.status || '').toLowerCase();
    if      (st === 'approved')                              s.approved++;
    else if (st === 'rejected')                              s.rejected++;
    else if (st === 'submitted' || st === 'in_review')       s.submitted++;
    else if (st === 'in_progress' || st === 'started' || st === 'annotating') s.in_progress++;
    else                                                     s.assigned++;
  });
  return s;
};

/* ════════════════════════════════════════════════
   Reusable UI atoms
════════════════════════════════════════════════ */
const Card = ({ className = '', children }) => (
  <div className={`bg-slate-800/80 border border-slate-700 rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, color, title }) => (
  <div className="flex items-center gap-2 mb-5">
    <Icon size={14} className={color} />
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
  </div>
);

const KpiCard = ({ label, value, sub, icon: Icon, strip, iconBg }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
    <div className={`absolute top-0 inset-x-0 h-0.5 ${strip}`} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">{label}</p>
        <p className="text-4xl font-extrabold text-slate-50 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

const RingProgress = ({ pct, size = 80, stroke = 8, color = '#10b981' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
};

const MiniBar = ({ pct, color = 'bg-blue-500' }) => (
  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden w-full">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.7s ease' }} />
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-2xl">
      {label && <p className="text-slate-400 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: <span className="text-slate-100">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const QuickLink = ({ label, desc, icon: Icon, path, iconBg }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-700 bg-slate-700/20 hover:bg-slate-700/50 hover:border-slate-600 transition-all text-left group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={17} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
};

/* ════════════════════════════════════════════════
   Main Dashboard
════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const [users, setUsers]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [allTasks, setAllTasks]       = useState([]);
  const [datasets, setDatasets]       = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [lastFetch, setLastFetch]     = useState(null);
  const [phPage, setPhPage]     = useState(1);
  const [phFilter, setPhFilter] = useState('all');
  const PH_PAGE_SIZE = 4;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [uRes, pRes, dRes, rStatsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/users`, { params: { page: 1, limit: 200 }, headers }),
        axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers }),
        axios.get(`${API_URL}/api/datasets`, { headers }),
        axios.get(`${API_URL}/api/reviews/stats`, { headers }),
      ]);

      const u = uRes.status === 'fulfilled' ? getArray(uRes.value.data) : [];
      const p = pRes.status === 'fulfilled' ? getArray(pRes.value.data) : [];
      const d = dRes.status === 'fulfilled' ? getArray(dRes.value.data) : [];
      const rStats = rStatsRes.status === 'fulfilled' ? rStatsRes.value.data : null;
      setUsers(u); setProjects(p); setDatasets(d);
      setReviewStats(rStats);

      /* Fetch tasks for every project */
      const tResults = await Promise.allSettled(
        p.map((proj) =>
          axios.get(`${API_URL}/api/tasks/project/${proj._id || proj.id}`, { headers })
        )
      );
      const tasks = [];
      tResults.forEach((res, i) => {
        if (res.status !== 'fulfilled') return;
        getArray(res.value.data).forEach((t) =>
          tasks.push({ ...t, _pid: p[i]._id || p[i].id, _pname: p[i].name })
        );
      });
      setAllTasks(tasks);
      setLastFetch(new Date());
    } catch (e) {
      console.error('Dashboard error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  /* ── Derived stats ── */
  const S = useMemo(() => {
    const stages  = parseStages(allTasks);
    const total   = allTasks.length;

    /* Use task-derived counts — reviewStats only used for error categories */
    const approvedCount  = stages.approved;
    const rejectedCount  = stages.rejected;
    const submittedCount = stages.submitted;

    const reviewed = approvedCount + rejectedCount;
    const activeP  = projects.filter((p) =>
      ['active', 'in_progress', 'open'].includes((p.status || '').toLowerCase())
    );

    /* Annotator map — task.annotator is a UserProfile object per API spec */
    const aMap = {};
    allTasks.forEach((t) => {
      const annotatorObj = t.annotator;
      if (!annotatorObj) return;
      const uid  = annotatorObj.id || annotatorObj._id;
      const name = annotatorObj.full_name || annotatorObj.username || `#${uid}`;
      if (!uid) return;
      if (!aMap[uid]) {
        aMap[uid] = { name, total: 0, approved: 0, rejected: 0, submitted: 0 };
      }
      const s = (t.status || '').toLowerCase();
      aMap[uid].total++;
      if (s === 'approved')                              aMap[uid].approved++;
      else if (s === 'rejected')                         aMap[uid].rejected++;
      else if (s === 'submitted' || s === 'resubmitted') aMap[uid].submitted++;
    });
    const topAnnotators = Object.values(aMap)
      .map((a) => ({
        ...a,
        acc: (a.approved + a.rejected) > 0
          ? Math.round((a.approved / (a.approved + a.rejected)) * 100) : 0,
      }))
      .sort((a, b) => b.approved - a.approved)
      .slice(0, 5);

    /* Project health — dùng getDisplayStatus + computeTaskStats như Manager */
    const OVERDUE_KEYS = ['annotator_overdue', 'reviewer_overdue', 'rework_overdue', 'overdue'];
    const REVIEW_KEYS  = ['reviewer_pending', 'in_review', 'waiting_rework'];

    const projectHealth = projects
      .map((p) => {
        const pid      = p._id || p.id;
        const pTasks   = allTasks.filter((t) => t._pid === pid);
        const taskStats = computeTaskStats(pTasks);
        const dispStatus = getDisplayStatus(p, taskStats);
        const cfg      = STATUS_CFG[dispStatus] || STATUS_CFG.draft;

        const approved = taskStats?.approved || 0;
        const total    = taskStats?.total    || 0;
        const progress = total > 0 ? Math.round((approved / total) * 100) : 0;

        const deadline = p.deadline || null;
        let daysLeft   = null;
        if (deadline) daysLeft = Math.ceil((new Date(deadline) - Date.now()) / 86400000);

        return {
          id: pid,
          name: p.name || 'Untitled',
          dispStatus,
          cfg,
          progress,
          totalTasks: total,
          approvedTasks: approved,
          daysLeft,
          deadlineDate: deadline
            ? new Date(deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : null,
        };
      })
      .sort((a, b) => {
        /* Overdue → review → active → draft → completed → archived */
        const order = (s) => {
          if (OVERDUE_KEYS.includes(s))   return 0;
          if (REVIEW_KEYS.includes(s))    return 1;
          if (s === 'active')             return 2;
          if (s === 'draft')              return 3;
          if (s === 'completed')          return 4;
          return 5;
        };
        return order(a.dispStatus) - order(b.dispStatus);
      });

    /* Workflow chart data */
    const stagesDisplay = stages;
    const workflowData = STAGE_CFG.map((cfg) => ({ stage: cfg.label, count: stages[cfg.key] || 0, fill: cfg.color }));

    /* Quality pie */
    const qualityPie = [
      { name: 'Approved', value: approvedCount, color: '#10b981' },
      { name: 'Rejected', value: rejectedCount, color: '#f43f5e' },
      { name: 'Pending',  value: submittedCount + stages.in_progress + stages.assigned, color: '#334155' },
    ].filter((d) => d.value > 0);

    /* Annotator bar chart */
    const annotatorChart = topAnnotators.map((a) => ({
      name: a.name.split(' ').pop(),
      full: a.name,
      Hoàn_thành: a.approved,
      Từ_chối: a.rejected,
    }));

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.is_active).length,
      managers: users.filter((u) => u.role === 'manager').length,
      annotators: users.filter((u) => u.role === 'annotator').length,
      reviewers: users.filter((u) => u.role === 'reviewer').length,
      totalProjects: projects.length,
      activeProjects: activeP.length,
      totalTasks: total,
      completionRate: total > 0 ? Math.round((approvedCount / total) * 100) : 0,
      approvalRate:   reviewed > 0 ? Math.round((approvedCount / reviewed) * 100) : 0,
      rejectionRate:  reviewed > 0 ? Math.round((rejectedCount / reviewed) * 100) : 0,
      totalDatasets: datasets.length,
      approvedCount, rejectedCount, submittedCount,
      errorCategories: reviewStats?.error_category_counts || reviewStats?.errorCategoryCounts || {},
      stages, stagesDisplay, workflowData, qualityPie, topAnnotators, annotatorChart, projectHealth,
    };
  }, [users, projects, allTasks, datasets, reviewStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 gap-3">
        <CircularProgress size={32} />
        <p className="text-xs text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  const dateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-900 p-6 space-y-5">

      {/* ══ HEADER ══ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={12} className="text-blue-400" />
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">{dateStr}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-50 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">LabelFlow · Giám sát toàn bộ hệ thống gán nhãn</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all"
          >
            <RefreshCw size={12} />
            {lastFetch ? lastFetch.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-semibold">Administrator</span>
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Tổng người dùng"
          value={S.totalUsers}
          sub={`${S.annotators} annotators · ${S.reviewers} reviewers`}
          icon={Users}
          strip="bg-gradient-to-r from-blue-500 to-cyan-400"
          iconBg="bg-gradient-to-br from-blue-600 to-blue-500"
        />
        <KpiCard
          label="Dự án đang chạy"
          value={S.activeProjects}
          sub={`/ ${S.totalProjects} tổng dự án`}
          icon={FolderOpen}
          strip="bg-gradient-to-r from-violet-500 to-purple-400"
          iconBg="bg-gradient-to-br from-violet-600 to-violet-500"
        />
        <KpiCard
          label="Tổng nhiệm vụ"
          value={S.totalTasks}
          sub={`${S.stages.approved} đã approved`}
          icon={Layers}
          strip="bg-gradient-to-r from-amber-500 to-orange-400"
          iconBg="bg-gradient-to-br from-amber-600 to-amber-500"
        />
        <KpiCard
          label="Tỷ lệ hoàn thành"
          value={`${S.completionRate}%`}
          sub={`${S.approvalRate}% approval rate`}
          icon={Target}
          strip="bg-gradient-to-r from-emerald-500 to-teal-400"
          iconBg="bg-gradient-to-br from-emerald-600 to-emerald-500"
        />
      </div>

      {/* ══ WORKFLOW + QUALITY ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Task Workflow */}
        <Card className="lg:col-span-2">
          <SectionTitle icon={Activity} color="text-blue-400" title="Task Workflow — Phân phối giai đoạn" />

          {/* Funnel strip */}
          <div className="flex items-end gap-1 mb-5 h-10">
            {STAGE_CFG.map((cfg) => {
              const cnt = S.stagesDisplay?.[cfg.key] ?? S.stages[cfg.key] ?? 0;
              const pct = S.totalTasks > 0 ? (cnt / S.totalTasks) * 100 : 0;
              return (
                <div
                  key={cfg.key}
                  className="relative group flex-1 rounded-md cursor-default transition-opacity hover:opacity-90"
                  style={{ height: `${Math.max(pct, 4)}%`, minHeight: 8, backgroundColor: cfg.color }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10">
                    {cfg.label}: {cnt}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={S.workflowData} barCategoryGap="30%">
              <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tasks">
                {S.workflowData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {STAGE_CFG.map((cfg) => (
              <div key={cfg.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
                <span className="text-slate-500">({S.stages[cfg.key] || 0})</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quality Metrics */}
        <Card>
          <SectionTitle icon={CheckCircle2} color="text-emerald-400" title="Quality Metrics" />

          {/* Approval ring */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              <RingProgress pct={S.approvalRate} size={80} stroke={7} color="#10b981" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-extrabold text-slate-100">{S.approvalRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Approval Rate</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400">✓ {S.approvedCount} approved</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-rose-400">✕ {S.rejectedCount} rejected</span>
              </div>
            </div>
          </div>

          {/* Pie chart */}
          {S.qualityPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={S.qualityPie} dataKey="value"
                  cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                  paddingAngle={3}
                >
                  {S.qualityPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-xs text-slate-600">Chưa có dữ liệu</div>
          )}

          {/* Stats */}
          <div className="space-y-3 mt-2">
            {[
              { label: 'Rejection Rate',  value: `${S.rejectionRate}%`,    color: 'text-rose-400' },
              { label: 'In Review',       value: S.submittedCount,          color: 'text-amber-400' },
              { label: 'In Progress',     value: S.stages.in_progress,      color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-slate-700/60 last:border-0">
                <span className="text-xs text-slate-400">{label}</span>
                <span className={`text-xs font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Top Error Categories from /api/reviews/stats */}
          {Object.keys(S.errorCategories || {}).length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-700">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Top Error Categories</p>
              <div className="space-y-1.5">
                {Object.entries(S.errorCategories)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 truncate">{cat}</span>
                      <span className="text-rose-400 font-bold ml-2">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ══ ANNOTATOR PERFORMANCE + PROJECT HEALTH ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Annotator Performance */}
        <Card className="lg:col-span-3">
          <SectionTitle icon={PenLine} color="text-violet-400" title="Annotator Performance" />

          {/* Bar chart */}
          {S.annotatorChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={S.annotatorChart} barCategoryGap="25%">
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="Hoàn_thành" name="Hoàn thành" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Từ_chối"   name="Bị từ chối"  fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-xs text-slate-600">Chưa có dữ liệu task</div>
          )}

          {/* Table */}
          <div className="mt-3">
            <div className="grid grid-cols-4 gap-2 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
              <span className="col-span-2">Annotator</span>
              <span className="text-right">Done</span>
              <span className="text-right">Accuracy</span>
            </div>
            {S.topAnnotators.length > 0 ? S.topAnnotators.map((a, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 px-2 py-2.5 rounded-lg hover:bg-slate-700/30 transition-colors items-center">
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-violet-400">{i + 1}</span>
                  </div>
                  <span className="text-xs text-slate-200 truncate">{a.name}</span>
                </div>
                <span className="text-xs font-bold text-emerald-400 text-right">{a.approved}</span>
                <div className="text-right">
                  <span className={`text-xs font-bold ${a.acc >= 80 ? 'text-emerald-400' : a.acc >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {a.acc}%
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-xs text-slate-600 px-2 py-3">Không có dữ liệu</p>
            )}
          </div>
        </Card>

        {/* Project Health */}
        <Card className="lg:col-span-2">
          {(() => {
            /* Filter logic */
            const OVERDUE_KEYS = ['annotator_overdue', 'reviewer_overdue', 'rework_overdue', 'overdue'];
            const REVIEW_KEYS  = ['reviewer_pending', 'in_review', 'waiting_rework'];
            const filtered = S.projectHealth.filter((p) => {
              if (phFilter === 'all')     return true;
              if (phFilter === 'overdue') return OVERDUE_KEYS.includes(p.dispStatus);
              if (phFilter === 'review')  return REVIEW_KEYS.includes(p.dispStatus);
              if (phFilter === 'active')  return p.dispStatus === 'active';
              if (phFilter === 'done')    return p.dispStatus === 'completed';
              if (phFilter === 'draft')   return p.dispStatus === 'draft';
              return true;
            });
            const totalPh    = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalPh / PH_PAGE_SIZE));
            const safePage   = Math.min(phPage, totalPages);
            const pageItems  = filtered.slice((safePage - 1) * PH_PAGE_SIZE, safePage * PH_PAGE_SIZE);

            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-amber-400" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Project Health</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{totalPh}/{S.projectHealth.length} dự án</span>
                </div>

                {/* Filter tabs */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PH_FILTERS.map((f) => {
                    const cnt = f.key === 'all' ? S.projectHealth.length
                      : f.key === 'overdue' ? S.projectHealth.filter((p) => OVERDUE_KEYS.includes(p.dispStatus)).length
                      : f.key === 'review'  ? S.projectHealth.filter((p) => REVIEW_KEYS.includes(p.dispStatus)).length
                      : f.key === 'active'  ? S.projectHealth.filter((p) => p.dispStatus === 'active').length
                      : f.key === 'done'    ? S.projectHealth.filter((p) => p.dispStatus === 'completed').length
                      : S.projectHealth.filter((p) => p.dispStatus === 'draft').length;
                    const active = phFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => { setPhFilter(f.key); setPhPage(1); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          active
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-slate-700/40 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        {f.label}
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${active ? 'bg-white/20' : 'bg-slate-700'}`}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Project list */}
                <div className="space-y-2.5 min-h-[240px]">
                  {pageItems.length > 0 ? pageItems.map((p) => {
                    const cfg = p.cfg;
                    const badgeCls = statusBadgeCls(cfg.color);
                    /* Progress bar color by status */
                    const barColor = OVERDUE_KEYS.includes(p.dispStatus) ? 'bg-rose-500'
                      : REVIEW_KEYS.includes(p.dispStatus) ? 'bg-violet-500'
                      : p.dispStatus === 'completed' ? 'bg-blue-500'
                      : p.dispStatus === 'active' ? 'bg-emerald-500'
                      : 'bg-slate-500';
                    return (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-700/30 border border-slate-700/60 hover:border-slate-600 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
                            {p.deadlineDate && (
                              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock size={9} />
                                {p.daysLeft < 0
                                  ? `Quá hạn ${Math.abs(p.daysLeft)} ngày`
                                  : p.daysLeft === 0
                                  ? 'Hết hạn hôm nay'
                                  : `Còn ${p.daysLeft} ngày · ${p.deadlineDate}`}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${badgeCls}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MiniBar pct={p.progress} color={barColor} />
                          <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">{p.progress}%</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1">{p.approvedTasks}/{p.totalTasks} tasks approved</p>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-slate-600 py-6 text-center">Không có dự án nào</p>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
                    <span className="text-[10px] text-slate-500">Trang {safePage}/{totalPages}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPhPage((v) => Math.max(1, v - 1))}
                        disabled={safePage === 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={14} className="rotate-180" />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setPhPage(pg)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all ${
                            pg === safePage
                              ? 'bg-amber-500 text-white'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                          }`}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        onClick={() => setPhPage((v) => Math.min(totalPages, v + 1))}
                        disabled={safePage === totalPages}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      </div>

      {/* ══ REVIEWER + DATASET INSIGHTS ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Reviewer Performance */}
        <Card>
          <SectionTitle icon={Eye} color="text-cyan-400" title="Reviewer Performance" />
          <div className="space-y-4">
            {[
              { label: 'Tổng Reviewers',    value: S.reviewers,       icon: Users,        color: 'text-cyan-400' },
              { label: 'Tasks In Review',   value: S.submittedCount,   icon: Clock,         color: 'text-amber-400' },
              { label: 'Đã Approved',       value: S.approvedCount,    icon: CheckCircle2,  color: 'text-emerald-400' },
              { label: 'Đã Rejected',       value: S.rejectedCount,    icon: AlertTriangle, color: 'text-rose-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-700/60 last:border-0">
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className={color} />
                  <span className="text-xs text-slate-300">{label}</span>
                </div>
                <span className={`text-sm font-extrabold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-[10px] text-slate-500 mb-1.5">Review Rejection Rate</p>
            <div className="flex items-center gap-2">
              <MiniBar pct={S.rejectionRate} color={S.rejectionRate > 30 ? 'bg-rose-500' : 'bg-amber-500'} />
              <span className="text-xs font-bold text-slate-300 whitespace-nowrap">{S.rejectionRate}%</span>
            </div>
          </div>
        </Card>

        {/* Dataset Insights */}
        <Card>
          <SectionTitle icon={Database} color="text-amber-400" title="Dataset Insights" />
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              <RingProgress pct={Math.min(S.completionRate, 100)} size={72} stroke={6} color="#f59e0b" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-extrabold text-slate-100">{S.completionRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-50 leading-none">{S.totalDatasets}</p>
              <p className="text-xs text-slate-500 mt-1">Tổng datasets</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Tổng datasets',  value: S.totalDatasets,      color: 'text-amber-400' },
              { label: 'Approved tasks', value: S.approvedCount,                           color: 'text-emerald-400' },
              { label: 'Pending tasks',  value: S.stages.assigned + S.stages.in_progress,  color: 'text-blue-400' },
              { label: 'Total tasks',    value: S.totalTasks,          color: 'text-slate-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center text-xs border-b border-slate-700/50 last:border-0 pb-2 last:pb-0">
                <span className="text-slate-400">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Team Summary */}
        <Card>
          <SectionTitle icon={Award} color="text-rose-400" title="Team Summary" />
          <div className="space-y-4">
            {[
              { role: 'Manager',    count: S.managers,   total: S.totalUsers, color: 'bg-blue-500',    dot: 'text-blue-400' },
              { role: 'Annotator',  count: S.annotators, total: S.totalUsers, color: 'bg-violet-500',  dot: 'text-violet-400' },
              { role: 'Reviewer',   count: S.reviewers,  total: S.totalUsers, color: 'bg-amber-500',   dot: 'text-amber-400' },
            ].map(({ role, count, total, color, dot }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-xs font-semibold ${dot}`}>{role}</span>
                    <span className="text-xs text-slate-300 font-bold">{count} <span className="text-slate-600 font-normal">({pct}%)</span></span>
                  </div>
                  <MiniBar pct={pct} color={color} />
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
              <p className="text-2xl font-extrabold text-slate-50">{S.totalUsers}</p>
              <p className="text-[10px] text-slate-500 mt-1">Total Users</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
              <p className="text-2xl font-extrabold text-slate-50">{S.activeUsers}</p>
              <p className="text-[10px] text-slate-500 mt-1">Active Users</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <Card>
        <SectionTitle icon={ChevronRight} color="text-slate-400" title="Truy cập nhanh" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink
            label="Quản lý người dùng"
            desc="Thêm, sửa, phân quyền tài khoản"
            icon={Users}
            path="/admin/users"
            iconBg="bg-gradient-to-br from-blue-600 to-blue-500"
          />
          <QuickLink
            label="Cấu hình hệ thống"
            desc="Cài đặt email, lưu trữ, giới hạn"
            icon={Settings}
            path="/admin/system-settings"
            iconBg="bg-gradient-to-br from-violet-600 to-violet-500"
          />
          <QuickLink
            label="Nhật ký hoạt động"
            desc="Xem lịch sử hành động người dùng"
            icon={FileText}
            path="/admin/activity-logs"
            iconBg="bg-gradient-to-br from-emerald-600 to-emerald-500"
          />
        </div>
      </Card>

    </div>
  );
};

export default AdminDashboard;

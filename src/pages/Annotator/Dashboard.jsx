import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';
import { normalizeProject } from '../../utils/taskAdapter';
import { useAuth } from '../../context/AuthContext';

const getAuthToken = () => sessionStorage.getItem('token');

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const getTaskProjId = (t) =>
  t.projectId?.id || t.project?.id ||
  (typeof t.projectId === 'string' ? t.projectId : null) ||
  (typeof t.project_id === 'string' ? t.project_id : null);

const ProjectStatusBadge = ({ pct, rejected }) => {
  if (rejected > 0)
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-400">↩ Cần làm lại</span>;
  if (pct === 100)
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">✓ Đã nộp hết</span>;
  if (pct > 0)
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold text-blue-400">▶ Đang làm</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2 py-0.5 text-[11px] font-semibold text-gray-400">○ Chưa bắt đầu</span>;
};

const MiniPager = ({ page, totalPages, onChange, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-700/60 bg-gray-900/30">
      <span className="text-[11px] text-gray-500">{start}–{end} / {totalItems}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-xs">‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`h-6 w-6 rounded border text-xs font-medium transition-all ${p === page ? 'border-blue-500/50 bg-blue-600 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-xs">›</button>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, colorClass, bgClass, borderClass }) => (
  <div className={`rounded-2xl border p-5 flex items-center gap-4 ${bgClass} ${borderClass}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-100 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AnnotatorOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.fullName || user?.username || 'Annotator';

  const [tasks, setTasks]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [taskPage, setTaskPage]       = useState(1);
  const [projectPage, setProjectPage] = useState(1);

  const TASK_PAGE_SIZE    = 5;
  const PROJECT_PAGE_SIZE = 5;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const [tasksRes, projRes] = await Promise.all([
        axios.get(`${API_URL}/api/tasks/my-tasks`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/projects`, { headers, params: { limit: 100 } }).catch(() => ({ data: [] })),
      ]);
      setTasks(getArray(tasksRes.data));
      setProjects(getArray(projRes.data).map(normalizeProject));
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setTaskPage(1); }, [tasks]);
  useEffect(() => { setProjectPage(1); }, [projects]);

  // Global stats
  const total      = tasks.length;
  const inProgress = tasks.filter(t => ['in_progress', 'revised'].includes(t.status)).length;
  const submitted  = tasks.filter(t => ['submitted', 'resubmitted'].includes(t.status)).length;
  const approved   = tasks.filter(t => t.status === 'approved').length;
  const rejected   = tasks.filter(t => t.status === 'rejected').length;

  // "Cần xử lý": rejected & revised ưu tiên cao, rồi in_progress
  const actionTasks = useMemo(() => {
    const priority = ['rejected', 'revised', 'in_progress'];
    return tasks
      .filter(t => priority.includes(t.status))
      .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
  }, [tasks]);

  // Projects with per-project stats
  const projectsWithStats = useMemo(() => {
    return projects.map(p => {
      const pid = p.id || p.projectId;
      const pTasks = tasks.filter(t => String(getTaskProjId(t)) === String(pid));
      const pTotal     = pTasks.length;
      const pDone      = pTasks.filter(t => ['submitted','resubmitted','approved','completed'].includes(t.status)).length;
      const pApproved  = pTasks.filter(t => t.status === 'approved').length;
      const pRejected  = pTasks.filter(t => t.status === 'rejected').length;
      const pSubmitted = pTasks.filter(t => ['submitted','resubmitted'].includes(t.status)).length;
      const pPct       = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
      const pOverdue   = p.deadline && new Date(p.deadline) < new Date();
      return { ...p, pTotal, pDone, pApproved, pRejected, pSubmitted, pPct, pOverdue };
    }).filter(p => p.pTotal > 0).sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : 0;
      const db = b.deadline ? new Date(b.deadline).getTime() : 0;
      return db - da;
    });
  }, [projects, tasks]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500 mx-auto" />
        <p className="mt-4 text-gray-400 text-sm">Đang tải...</p>
      </div>
    </div>
  );

  // First actionable task to navigate to
  const firstTask = actionTasks[0];
  const firstTaskProjId = firstTask ? getTaskProjId(firstTask) : null;

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-br from-gray-800/80 to-gray-800/40 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-gray-500 font-medium">{getGreeting()},</p>
              <h1 className="text-2xl font-bold text-gray-100 mt-0.5">{userName}</h1>
              <p className="mt-1 text-sm text-gray-400">
                {rejected > 0
                  ? <span>Bạn có <span className="text-rose-400 font-semibold">{rejected} task bị trả lại</span> — cần làm lại</span>
                  : actionTasks.length > 0
                    ? <span>Bạn có <span className="text-blue-400 font-semibold">{actionTasks.length} task</span> đang cần xử lý</span>
                    : submitted > 0
                      ? <span><span className="text-yellow-400 font-semibold">{submitted} task</span> đang chờ reviewer duyệt</span>
                      : 'Tất cả công việc đã hoàn thành 🎉'}
                {' · '}
                <span className="text-gray-500">{fmtDate(new Date())}</span>
              </p>
            </div>
            <button onClick={fetchData}
              className="flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-800/80 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-700/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Tổng task"
            value={total}
            sub="Tất cả task được giao"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            colorClass="bg-blue-500/15 text-blue-400"
            bgClass="bg-gray-800/80"
            borderClass="border-gray-700/60"
          />
          <StatCard
            label="Cần xử lý"
            value={inProgress + rejected}
            sub="Đang làm + sửa + bị trả lại"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
            colorClass="bg-amber-500/15 text-amber-400"
            bgClass="bg-amber-500/5"
            borderClass="border-amber-700/30"
          />
          <StatCard
            label="Chờ review"
            value={submitted}
            sub="Đã nộp, chờ reviewer"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-yellow-500/15 text-yellow-400"
            bgClass="bg-yellow-500/5"
            borderClass="border-yellow-700/30"
          />
          <StatCard
            label="Đã duyệt"
            value={approved}
            sub="Reviewer đã approve"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-emerald-500/15 text-emerald-400"
            bgClass="bg-emerald-500/5"
            borderClass="border-emerald-700/30"
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Task queue — 3/5 */}
          <div className="lg:col-span-3 rounded-2xl border border-gray-700/60 bg-gray-800/80 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div>
                <h2 className="text-sm font-bold text-gray-200">Task cần xử lý</h2>
                <p className="text-xs text-gray-500 mt-0.5">Bị trả lại, đang sửa và đang làm dở</p>
              </div>
              {actionTasks.length > 0 && (
                <button onClick={() => navigate('/annotator/tasks')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Xem tất cả →
                </button>
              )}
            </div>

            {actionTasks.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="mx-auto w-12 h-12 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400 text-sm font-medium">Không có task nào cần xử lý</p>
                <p className="text-gray-600 text-xs mt-1">
                  {submitted > 0 ? `${submitted} task đang chờ reviewer duyệt` : 'Tất cả đã hoàn thành!'}
                </p>
              </div>
            ) : (() => {
              const totalPages = Math.ceil(actionTasks.length / TASK_PAGE_SIZE);
              const slice = actionTasks.slice((taskPage - 1) * TASK_PAGE_SIZE, taskPage * TASK_PAGE_SIZE);
              return (
                <>
                  <div className="divide-y divide-gray-700/40 flex-1">
                    {slice.map((task, idx) => {
                      const pid      = getTaskProjId(task);
                      const projName = task.projectId?.name || task.project?.name || projects.find(p => String(p.id || p.projectId) === String(pid))?.projectName || 'Project';
                      const filename = task.dataItem?.filename || task.dataItem?.originalName || task.data_item?.filename || task.data_item?.originalName || `Task ${idx + 1}`;
                      const isRejected = task.status === 'rejected';
                      return (
                        <div key={task.id || idx}
                          onClick={() => pid && navigate(`/annotator/projects/${pid}`)}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-700/30 transition-colors cursor-pointer group">
                          <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${isRejected ? 'bg-rose-500/10' : 'bg-blue-500/10'}`}>
                            <svg className={`w-4 h-4 ${isRejected ? 'text-rose-400' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-200 truncate group-hover:text-blue-300 transition-colors">{filename}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{projName}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {task.status === 'rejected'
                              ? <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">↩ Trả lại</span>
                              : task.status === 'revised'
                                ? <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">✎ Đang sửa</span>
                                : <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">▶ Đang làm</span>
                            }
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <MiniPager page={taskPage} totalPages={totalPages} onChange={setTaskPage} totalItems={actionTasks.length} pageSize={TASK_PAGE_SIZE} />
                </>
              );
            })()}
          </div>

          {/* Projects — 2/5 */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-700/60 bg-gray-800/80 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div>
                <h2 className="text-sm font-bold text-gray-200">Projects của tôi</h2>
                <p className="text-xs text-gray-500 mt-0.5">{projects.length} project được giao</p>
              </div>
              <button onClick={() => navigate('/annotator/tasks')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Xem tất cả →
              </button>
            </div>

            {projectsWithStats.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="mx-auto w-12 h-12 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-gray-400 text-sm font-medium">Chưa có project nào</p>
                <p className="text-gray-600 text-xs mt-1">Manager chưa giao project cho bạn</p>
              </div>
            ) : (() => {
              const totalPages = Math.ceil(projectsWithStats.length / PROJECT_PAGE_SIZE);
              const slice = projectsWithStats.slice((projectPage - 1) * PROJECT_PAGE_SIZE, projectPage * PROJECT_PAGE_SIZE);
              return (
                <>
                  <div className="divide-y divide-gray-700/40 flex-1">
                    {slice.map(p => {
                      const pid = p.id || p.projectId;
                      return (
                        <div key={pid}
                          onClick={() => navigate(`/annotator/projects/${pid}`)}
                          className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-700/30 transition-colors cursor-pointer group">
                          <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            p.pRejected > 0 ? 'bg-rose-400' :
                            p.pPct === 100 ? 'bg-emerald-400' :
                            p.pPct > 0 ? 'bg-blue-400' : 'bg-gray-500'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-200 truncate group-hover:text-blue-300 transition-colors">
                              {p.projectName || p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <ProjectStatusBadge pct={p.pPct} rejected={p.pRejected} />
                              <span className="text-[10px] text-gray-500">{p.pDone}/{p.pTotal} task</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full rounded-full bg-gray-700/60 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${p.pPct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                                style={{ width: `${p.pPct}%` }}
                              />
                            </div>
                            {p.deadline && (
                              <p className={`text-[10px] mt-1 ${p.pOverdue ? 'text-rose-400' : 'text-gray-600'}`}>
                                Deadline: {fmtDateTime(p.deadline)}
                                {p.pOverdue && ' (Quá hạn)'}
                              </p>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                  <MiniPager page={projectPage} totalPages={totalPages} onChange={setProjectPage} totalItems={projectsWithStats.length} pageSize={PROJECT_PAGE_SIZE} />
                </>
              );
            })()}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <button onClick={() => navigate('/annotator/tasks')}
            className="group flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4 text-left hover:bg-blue-500/10 hover:border-blue-500/40 transition-all">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 group-hover:text-blue-300 transition-colors">My Tasks</p>
              <p className="text-xs text-gray-500">Danh sách project được giao</p>
            </div>
          </button>

          <button onClick={() => navigate('/annotator/history')}
            className="group flex items-center gap-3 rounded-2xl border border-gray-700/60 bg-gray-800/60 px-5 py-4 text-left hover:bg-gray-800 hover:border-gray-600 transition-all">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-700/60 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 group-hover:text-gray-100 transition-colors">Lịch sử</p>
              <p className="text-xs text-gray-500">Xem lại bài đã nộp</p>
            </div>
          </button>

          {firstTaskProjId && (
            <button onClick={() => navigate(`/annotator/projects/${firstTaskProjId}`)}
              className="group flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-left hover:bg-amber-500/10 hover:border-amber-500/40 transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Tiếp tục làm</p>
                <p className="text-xs text-gray-500">Mở task ưu tiên tiếp theo</p>
              </div>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default AnnotatorOverview;

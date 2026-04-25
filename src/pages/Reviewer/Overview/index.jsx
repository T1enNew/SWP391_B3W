import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getAuthToken, stringToColor } from '../../../utils/reviewerUtils';
import { getArray } from '../../../utils/api';

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getReviewerName = () => {
  try {
    const token = getAuthToken();
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.full_name || payload.fullName || payload.username || payload.name || 'Reviewer';
  } catch {
    return 'Reviewer';
  }
};

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

const ProjectStatusBadge = ({ project }) => {
  const overdue = project.deadline && new Date(project.deadline) < new Date();
  if (project.status === 'completed')
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">✓ Hoàn thành</span>;
  if (project.status === 'waiting_rework')
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">↩ Rework</span>;
  if (project.status === 'in_review')
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold text-blue-400">▶ Đang review</span>;
  if (overdue)
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-400">⚠ Quá hạn</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2 py-0.5 text-[11px] font-semibold text-gray-400">○ Chờ nộp bài</span>;
};

const MiniPager = ({ page, totalPages, onChange, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-700/60 bg-gray-900/30">
      <span className="text-[11px] text-gray-500">{start}–{end} / {totalItems}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-xs"
        >‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-6 w-6 rounded border text-xs font-medium transition-all ${
              p === page
                ? 'border-violet-500/50 bg-violet-600 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >{p}</button>
        ))}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-xs"
        >›</button>
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

const ReviewerOverview = () => {
  const navigate = useNavigate();
  const reviewerName = getReviewerName();

  const [allProjects, setAllProjects]   = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [reviewedTasks, setReviewedTasks] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [queuePage, setQueuePage]       = useState(1);
  const [projectPage, setProjectPage]   = useState(1);

  const QUEUE_PAGE_SIZE   = 5;
  const PROJECT_PAGE_SIZE = 5;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projectsRes, pendingRes, reviewedRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { limit: 100 },
        }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/api/reviews/pending`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { page: 1, limit: 100 },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/reviews/reviewed`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { page: 1, limit: 100 },
        }).catch(() => ({ data: [] })),
      ]);

      const rawProj = projectsRes.data;
      setAllProjects(Array.isArray(rawProj) ? rawProj : Array.isArray(rawProj?.data) ? rawProj.data : getArray(rawProj));

      const rawP = pendingRes.data;
      setPendingTasks(Array.isArray(rawP) ? rawP : Array.isArray(rawP?.reviews) ? rawP.reviews : getArray(rawP));

      const rawR = reviewedRes.data;
      setReviewedTasks(Array.isArray(rawR) ? rawR : Array.isArray(rawR?.reviews) ? rawR.reviews : getArray(rawR));
    } catch (err) {
      if (err.response?.status !== 403) {
        setError(err.response?.data?.message || 'Không tải được dữ liệu');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset về trang 1 khi data thay đổi
  useEffect(() => { setQueuePage(1); }, [pendingTasks]);
  useEffect(() => { setProjectPage(1); }, [allProjects]);

  // Stats
  const approvedCount = reviewedTasks.filter(t => t.status === 'approved').length;
  const rejectedCount = reviewedTasks.filter(t => t.status === 'rejected').length;

  // Pending queue grouped by item
  const queueItems = useMemo(() => {
    const itemMap = {};
    pendingTasks.forEach(task => {
      const di  = task.dataItem || task.data_item || {};
      const key = di.filename || di.original_name || task.id;
      const pid = task.project?.id || task.projectId?.id || (typeof task.projectId === 'string' ? task.projectId : null);
      if (!itemMap[key]) {
        itemMap[key] = {
          itemId:      key,
          itemName:    di.originalName || di.original_name || di.filename || key,
          projectName: task.project?.name || task.projectId?.name || '-',
          projectId:   pid,
          annotators:  [],
          submittedAt: task.submitted_at || task.submittedAt || null,
        };
      }
      const annotName = task.annotator?.full_name || task.annotator?.fullName || task.annotator?.username || '?';
      const annotId   = task.annotator?.id || task.annotatorId?.id || task.annotatorId;
      if (!itemMap[key].annotators.find(a => a.id === annotId)) {
        itemMap[key].annotators.push({ id: annotId, name: annotName });
      }
    });
    return Object.values(itemMap);
  }, [pendingTasks]);

  // Projects with submission counts
  const projectsWithStats = useMemo(() => {
    const statsMap = {};
    pendingTasks.forEach(t => {
      const pid = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
      if (!pid) return;
      statsMap[pid] = (statsMap[pid] || 0) + 1;
    });
    return allProjects.map(p => ({
      ...p,
      pendingCount: statsMap[p.id || p._id] || 0,
    })).sort((a, b) => b.pendingCount - a.pendingCount);
  }, [allProjects, pendingTasks]);

  const handleReview = (item) => {
    if (!item.projectId) return;
    navigate('/reviewer/projects/' + item.projectId);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-br from-gray-800/80 to-gray-800/40 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-gray-500 font-medium">{getGreeting()},</p>
              <h1 className="text-2xl font-bold text-gray-100 mt-0.5">{reviewerName}</h1>
              <p className="mt-1 text-sm text-gray-400">
                {queueItems.length > 0
                  ? <span>Bạn có <span className="text-amber-400 font-semibold">{queueItems.length} item</span> đang chờ review</span>
                  : 'Chưa có item nào cần review lúc này'}
                {' · '}
                <span className="text-gray-500">{fmtDate(new Date())}</span>
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-800/80 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
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
            label="Projects được giao"
            value={allProjects.length}
            sub="Tổng dự án"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
            colorClass="bg-violet-500/15 text-violet-400"
            bgClass="bg-gray-800/80"
            borderClass="border-gray-700/60"
          />
          <StatCard
            label="Cần review ngay"
            value={queueItems.length}
            sub="Bài đã nộp chờ duyệt"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-amber-500/15 text-amber-400"
            bgClass="bg-amber-500/5"
            borderClass="border-amber-700/30"
          />
          <StatCard
            label="Đã Approve"
            value={approvedCount}
            sub="Tổng đã duyệt"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-emerald-500/15 text-emerald-400"
            bgClass="bg-emerald-500/5"
            borderClass="border-emerald-700/30"
          />
          <StatCard
            label="Đã Reject"
            value={rejectedCount}
            sub="Cần annotator sửa lại"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="bg-rose-500/15 text-rose-400"
            bgClass="bg-rose-500/5"
            borderClass="border-rose-700/30"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Pending queue — chiếm 3/5 */}
          <div className="lg:col-span-3 rounded-2xl border border-gray-700/60 bg-gray-800/80 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div>
                <h2 className="text-sm font-bold text-gray-200">Hàng chờ Review</h2>
                <p className="text-xs text-gray-500 mt-0.5">Bài annotator đã nộp, chờ bạn duyệt</p>
              </div>
              {queueItems.length > 0 && (
                <button
                  onClick={() => navigate('/reviewer/tasks')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  Xem tất cả →
                </button>
              )}
            </div>

            {queueItems.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="mx-auto w-12 h-12 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-gray-400 text-sm font-medium">Không có item nào cần review</p>
                <p className="text-gray-600 text-xs mt-1">Khi annotator nộp bài, chúng sẽ xuất hiện ở đây</p>
              </div>
            ) : (() => {
              const queueTotalPages = Math.ceil(queueItems.length / QUEUE_PAGE_SIZE);
              const queueSlice = queueItems.slice((queuePage - 1) * QUEUE_PAGE_SIZE, queuePage * QUEUE_PAGE_SIZE);
              return (
                <>
                  <div className="divide-y divide-gray-700/40 flex-1">
                    {queueSlice.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-700/30 transition-colors cursor-pointer group"
                        onClick={() => handleReview(item)}
                      >
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-700/60 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-200 truncate group-hover:text-violet-300 transition-colors">
                            {item.itemName}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.projectName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex -space-x-1.5">
                            {item.annotators.slice(0, 3).map(a => (
                              <div
                                key={a.id}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-gray-800"
                                style={{ backgroundColor: stringToColor(a.name) }}
                                title={a.name}
                              >
                                {getInitials(a.name)}
                              </div>
                            ))}
                            {item.annotators.length > 3 && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-gray-600 text-gray-300 border-2 border-gray-800">
                                +{item.annotators.length - 3}
                              </div>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <MiniPager
                    page={queuePage}
                    totalPages={queueTotalPages}
                    onChange={setQueuePage}
                    totalItems={queueItems.length}
                    pageSize={QUEUE_PAGE_SIZE}
                  />
                </>
              );
            })()}
          </div>

          {/* Projects — chiếm 2/5 */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-700/60 bg-gray-800/80 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div>
                <h2 className="text-sm font-bold text-gray-200">Projects của tôi</h2>
                <p className="text-xs text-gray-500 mt-0.5">{allProjects.length} project được giao</p>
              </div>
              <button
                onClick={() => navigate('/reviewer/tasks')}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
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
              const projTotalPages = Math.ceil(projectsWithStats.length / PROJECT_PAGE_SIZE);
              const projSlice = projectsWithStats.slice((projectPage - 1) * PROJECT_PAGE_SIZE, projectPage * PROJECT_PAGE_SIZE);
              return (
                <>
                  <div className="divide-y divide-gray-700/40 flex-1">
                    {projSlice.map((p) => {
                      const pid = p.id || p._id;
                      const overdue = p.deadline && new Date(p.deadline) < new Date();
                      return (
                        <div
                          key={pid}
                          className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-700/30 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/reviewer/projects/${pid}`)}
                        >
                          <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                            p.status === 'completed' ? 'bg-emerald-400' :
                            p.status === 'in_review' ? 'bg-blue-400' :
                            p.status === 'waiting_rework' ? 'bg-amber-400' :
                            overdue ? 'bg-rose-400' : 'bg-gray-500'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-200 truncate group-hover:text-violet-300 transition-colors">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <ProjectStatusBadge project={p} />
                              {p.pendingCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                  {p.pendingCount} chờ duyệt
                                </span>
                              )}
                            </div>
                            {p.deadline && (
                              <p className={`text-[10px] mt-1 ${overdue ? 'text-rose-400' : 'text-gray-600'}`}>
                                Deadline: {fmtDateTime(p.deadline)}
                              </p>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                  <MiniPager
                    page={projectPage}
                    totalPages={projTotalPages}
                    onChange={setProjectPage}
                    totalItems={projectsWithStats.length}
                    pageSize={PROJECT_PAGE_SIZE}
                  />
                </>
              );
            })()}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <button
            onClick={() => navigate('/reviewer/tasks')}
            className="group flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 text-left hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 group-hover:text-violet-300 transition-colors">Review Tasks</p>
              <p className="text-xs text-gray-500">Danh sách project cần review</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/reviewer/history')}
            className="group flex items-center gap-3 rounded-2xl border border-gray-700/60 bg-gray-800/60 px-5 py-4 text-left hover:bg-gray-800 hover:border-gray-600 transition-all"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-700/60 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 group-hover:text-gray-100 transition-colors">Lịch sử</p>
              <p className="text-xs text-gray-500">Xem lại các quyết định đã chấm</p>
            </div>
          </button>

          {queueItems.length > 0 && (() => {
            const firstItem = queueItems[0];
            const firstProj = allProjects.find(p => String(p.id || p._id) === String(firstItem.projectId));
            const firstOverdue = firstProj?.deadline && new Date(firstProj.deadline) < new Date();
            return (
              <button
                onClick={() => !firstOverdue && handleReview(firstItem)}
                disabled={!!firstOverdue}
                className={`group flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all ${
                  firstOverdue
                    ? 'border-gray-700/40 bg-gray-800/40 cursor-not-allowed opacity-60'
                    : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${firstOverdue ? 'bg-gray-700 text-gray-500' : 'bg-amber-500/15 text-amber-400'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${firstOverdue ? 'text-gray-500' : 'text-amber-300'}`}>
                    {firstOverdue ? 'Project đã quá hạn' : 'Bắt đầu ngay'}
                  </p>
                  <p className="text-xs text-gray-500">{firstOverdue ? 'Không thể review project quá hạn' : 'Review item đầu tiên trong queue'}</p>
                </div>
              </button>
            );
          })()}
        </div>

      </div>
    </div>
  );
};

export default ReviewerOverview;

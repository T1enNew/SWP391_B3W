import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../../config/api';
import { getArray } from '../../../../utils/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fmtDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const normalizeTask = (t) => {
  const projectId = t?.project_id || t?.projectId?.id || (typeof t?.projectId === 'string' ? t?.projectId : null) || t?.project?.id || null;
  return {
    ...t,
    id: t?.id || t?._id,
    projectId,
    dataItem: t?.data_item || t?.dataItem || null,
    status: t?.status || 'assigned',
  };
};

const normalizeProject = (raw) => {
  const p = raw?.project || raw || {};
  return {
    ...p,
    id: p?.id || p?._id,
    name: p?.name || p?.projectName || 'Untitled Project',
    description: p?.description || '',
    guidelines: p?.guidelines || '',
    deadline: p?.deadline || null,
    datasetName: p?.dataset?.name || p?.datasetName || '',
  };
};

const statusConfig = (status) => {
  switch (status) {
    case 'submitted':
    case 'resubmitted':
      return { label: 'Chờ review', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    case 'approved':
      return { label: 'Đã duyệt', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'rejected':
      return { label: 'Bị trả lại', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    case 'in_progress':
      return { label: 'Đang làm', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    case 'completed':
      return { label: 'Đã xong', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    default:
      return { label: 'Chưa làm', color: 'bg-gray-700/50 text-gray-400 border-gray-600/30' };
  }
};

const ProjectDetail = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const TASKS_PER_PAGE = 5;

  useEffect(() => { loadData(); }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${projectId}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/tasks/my-tasks`, {
          headers: getAuthHeaders(),
          params: { project_id: projectId },
        }),
      ]);
      setProject(normalizeProject(projectRes.data));
      const savedOverrides = JSON.parse(localStorage.getItem(`taskStatus_${projectId}`) || '{}');
      const normalized = getArray(tasksRes.data).map(normalizeTask);
      const BACKEND_PRIORITY = ['submitted', 'resubmitted', 'approved', 'rejected'];
      setTasks(normalized.map((t) => ({
        ...t,
        // Backend terminal states always win; otherwise use localStorage override
        status: BACKEND_PRIORITY.includes(t.status) ? t.status : (savedOverrides[t.id] ?? t.status),
      })));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không tải được chi tiết project');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/tasks/my-tasks`, {
        headers: getAuthHeaders(),
        params: { project_id: projectId },
      });
      const projectTasks = getArray(res.data).map(normalizeTask).filter(
        t => String(t.projectId) === String(projectId)
      );
      if (!projectTasks.length) { alert('Không có task nào trong project này.'); return; }
      const order = ['rejected', 'in_progress', 'assigned', 'submitted', 'resubmitted', 'completed', 'approved'];
      const sorted = [...projectTasks].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
      navigate(`/annotator/workspace/${projectId}?taskId=${sorted[0].id}`);
    } catch {
      alert('Không tải được task.');
    }
  };

  const handleSubmitProject = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      // Submit từng task chưa được submit (in_progress, assigned, completed)
      const toSubmit = tasks.filter(t => !['submitted', 'resubmitted', 'approved'].includes(t.status));
      for (const t of toSubmit) {
        if (t.status === 'assigned' || t.status === 'rejected') {
          await axios.put(`${API_URL}/api/tasks/${t.id}/start`, {}, { headers: getAuthHeaders() });
        }
        await axios.post(`${API_URL}/api/tasks/${t.id}/submit`, {}, { headers: getAuthHeaders() });
      }
      setShowSubmitConfirm(false);
      await loadData(); // Reload để cập nhật status
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Nộp bài thất bại, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500 mx-auto" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-gray-400 mb-4">{error}</p>
        <button onClick={() => navigate('/annotator/tasks')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 transition">
          Quay lại danh sách
        </button>
      </div>
    </div>
  );

  const totalItems     = tasks.length;
  const totalReviewing = tasks.filter(t => ['submitted', 'resubmitted'].includes(t.status)).length;
  const totalRejected  = tasks.filter(t => t.status === 'rejected').length;
  const totalDone      = tasks.filter(t => ['submitted', 'resubmitted', 'approved', 'completed'].includes(t.status)).length;
  const totalApproved  = tasks.filter(t => t.status === 'approved').length;
  const totalLabeled   = tasks.filter(t => ['in_progress', 'submitted', 'resubmitted', 'approved', 'completed'].includes(t.status)).length;
  const overallProgress = totalItems > 0 ? Math.round((totalLabeled / totalItems) * 100) : 0;
  const overdue = project?.deadline && new Date(project.deadline) < new Date();

  const alreadySubmitted = tasks.length > 0 && tasks.every(t => ['submitted', 'resubmitted', 'approved'].includes(t.status));
  const canSubmitProject = totalItems > 0 && !alreadySubmitted && totalLabeled === totalItems;
  const pendingTasks = tasks.filter(t => !['submitted', 'resubmitted', 'approved', 'completed'].includes(t.status));
  const canContinue = pendingTasks.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/annotator/tasks')}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm text-gray-400 border border-gray-700/60 hover:text-gray-200 hover:border-gray-600 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          <span className="text-gray-600 text-sm">/</span>
          <span className="text-sm text-gray-500 truncate">{project?.name}</span>
        </div>

        {/* Project Info Card */}
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-100">{project?.name}</h1>
              {project?.datasetName && (
                <span className="mt-2 inline-block rounded-full bg-gray-700/60 px-2.5 py-0.5 text-xs text-gray-400 border border-gray-600/40">
                  {project.datasetName}
                </span>
              )}
              {project?.description && (
                <p className="mt-2 text-sm text-gray-400">{project.description}</p>
              )}
            </div>

            {project?.deadline && (
              <div className={`rounded-xl px-4 py-3 border text-right shrink-0 ${overdue ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-gray-900/60 border-gray-700/60 text-gray-300'}`}>
                <p className="text-xs font-medium mb-0.5">{overdue ? 'Quá hạn!' : 'Deadline'}</p>
                <p className="text-base font-bold">{fmtDateTime(project.deadline)}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-5">
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tổng số item</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">{totalItems}</p>
            </div>
            <div className="rounded-lg bg-yellow-500/5 p-3 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/70">Đang chờ review</p>
              <p className="mt-0.5 text-2xl font-bold text-yellow-400">{totalReviewing}</p>
            </div>
            <div className="rounded-lg bg-rose-500/5 p-3 border border-rose-500/10">
              <p className="text-xs text-rose-500/70">Bị trả lại</p>
              <p className="mt-0.5 text-2xl font-bold text-rose-400">{totalRejected}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/5 p-3 border border-emerald-500/10">
              <p className="text-xs text-emerald-500/70">Đã nộp / Đã duyệt</p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-400">{totalDone}</p>
            </div>
          </div>

          {/* Progress Bar */}
          {totalItems > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-400 font-medium">Tiến độ tổng thể</span>
                <span className="text-gray-200 font-semibold">
                  {overallProgress}% ({totalDone}/{totalItems} items)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              {totalApproved > 0 && (
                <p className="mt-1.5 text-xs text-emerald-400/80">{totalApproved} task đã được reviewer duyệt</p>
              )}
            </div>
          )}

          {/* Guidelines */}
          {project?.guidelines && (
            <div className="mt-5 border-t border-gray-700/60 pt-4">
              <button
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${showGuidelines ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Hướng dẫn ghi nhãn (Guidelines)
              </button>
              {showGuidelines && (
                <div className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{project.guidelines}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task List */}
        {tasks.length > 0 && (() => {
          const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
          const pagedTasks = tasks.slice((taskPage - 1) * TASKS_PER_PAGE, taskPage * TASKS_PER_PAGE);
          return (
            <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-100">Danh sách task ({tasks.length})</h2>
                {totalPages > 1 && (
                  <span className="text-xs text-gray-500">Trang {taskPage}/{totalPages}</span>
                )}
              </div>
              <div className="space-y-2">
                {pagedTasks.map((task, i) => {
                  const idx = (taskPage - 1) * TASKS_PER_PAGE + i;
                  const cfg = statusConfig(task.status);
                  const filename = task.dataItem?.filename || task.dataItem?.originalName || `Task ${idx + 1}`;
                  return (
                    <div
                      key={task.id || idx}
                      className="flex items-center justify-between rounded-xl bg-gray-900/50 px-4 py-3 border border-gray-700/40 hover:border-gray-600/60 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-gray-600 font-mono w-6 shrink-0">{idx + 1}</span>
                        <p className="text-sm text-gray-300 truncate">{filename}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-700/40">
                  <button
                    onClick={() => setTaskPage(1)}
                    disabled={taskPage === 1}
                    className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >«</button>
                  <button
                    onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                    disabled={taskPage === 1}
                    className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - taskPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-600">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setTaskPage(p)}
                          className={`rounded-lg min-w-[28px] px-2 py-1.5 text-xs font-medium transition-all ${
                            p === taskPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                          }`}
                        >{p}</button>
                      )
                    )}
                  <button
                    onClick={() => setTaskPage((p) => Math.min(totalPages, p + 1))}
                    disabled={taskPage === totalPages}
                    className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >›</button>
                  <button
                    onClick={() => setTaskPage(totalPages)}
                    disabled={taskPage === totalPages}
                    className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >»</button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Submit Project Section */}
        <div className={`rounded-2xl border p-6 ${alreadySubmitted ? 'border-yellow-500/30 bg-yellow-500/5' : canSubmitProject ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-700/60 bg-gray-800/80'}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-gray-100">Nộp toàn bộ project</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {alreadySubmitted
                  ? 'Bạn đã nộp project này. Chờ reviewer chấm bài.'
                  : canSubmitProject
                    ? `Tất cả ${totalItems} task đã gán nhãn xong — sẵn sàng nộp cho reviewer.`
                    : `Cần gán nhãn đủ ${totalItems} task trước khi nộp (hiện tại: ${totalLabeled}/${totalItems}).`
                }
              </p>
            </div>
            {alreadySubmitted ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-2.5">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-yellow-400">Đang chờ review</span>
              </div>
            ) : (
              <button
                onClick={() => { setSubmitError(''); setShowSubmitConfirm(true); }}
                disabled={!canSubmitProject}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all shadow-lg ${
                  canSubmitProject
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Nộp cho Reviewer
              </button>
            )}
          </div>
          {/* Progress mini */}
          {!alreadySubmitted && totalItems > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Tiến độ gán nhãn</span>
                <span>{totalLabeled}/{totalItems} task</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Submit Dialog */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-gray-700/60 pb-4">
                <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-100">Xác nhận nộp bài</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Toàn bộ {totalItems} task sẽ được gửi cho reviewer.</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Sau khi nộp, bạn sẽ không thể chỉnh sửa nữa cho đến khi reviewer trả lại. Bạn có chắc chắn?
              </p>
              {submitError && (
                <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                  <p className="text-sm text-rose-400">{submitError}</p>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button disabled={submitting} onClick={() => setShowSubmitConfirm(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-all disabled:opacity-50">
                  Huỷ
                </button>
                <button disabled={submitting} onClick={handleSubmitProject}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                  {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
                  {submitting ? 'Đang nộp...' : 'Xác nhận nộp'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center pb-4">
          <button
            onClick={handleStart}
            disabled={totalItems === 0}
            className={`inline-flex items-center gap-2 rounded-xl px-8 py-3 text-base font-bold transition-all shadow-lg ${
              totalItems === 0
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                : canContinue
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 shadow-gray-500/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            {totalItems === 0
              ? 'Chưa có task'
              : canContinue
                ? 'Bắt đầu làm việc'
                : 'Xem lại bài đã nộp'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProjectDetail;

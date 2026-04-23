import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';
import { normalizeTask } from '../../../utils/taskAdapter';

const getAuthToken = () => sessionStorage.getItem('token');

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_CFG = {
  approved:    { label: 'Đã duyệt',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  rejected:    { label: 'Bị trả lại',  color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/30' },
  submitted:   { label: 'Chờ review',  color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30' },
  resubmitted: { label: 'Đã nộp lại', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
  completed:   { label: 'Hoàn thành', color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-500/30' },
};

const HISTORY_STATUSES = Object.keys(STATUS_CFG);

const PAGE_SIZE = 10;

const AnnotatorHistory = () => {
  const navigate = useNavigate();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API_URL}/api/tasks/my-tasks`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        const normalized = getArray(res.data)
          .map(normalizeTask)
          .filter(t => HISTORY_STATUSES.includes(t.status))
          .sort((a, b) => {
            const da = new Date(a.updatedAt || a.submittedAt || a.createdAt || 0).getTime();
            const db = new Date(b.updatedAt || b.submittedAt || b.createdAt || 0).getTime();
            return db - da;
          });
        setTasks(normalized);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được lịch sử');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchStatus = filter === 'all' || t.status === filter;
      const q = search.trim().toLowerCase();
      if (!q) return matchStatus;
      const filename = (t.dataItem?.originalName || t.dataItem?.filename || '').toLowerCase();
      const projName = (t.projectId?.name || t.projectId?.projectName || '').toLowerCase();
      return matchStatus && (filename.includes(q) || projName.includes(q));
    });
  }, [tasks, filter, search]);

  const totalPages  = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx    = (currentPage - 1) * PAGE_SIZE;
  const pageItems   = filteredTasks.slice(startIdx, startIdx + PAGE_SIZE);

  const counts = useMemo(() => ({
    all:         tasks.length,
    approved:    tasks.filter(t => t.status === 'approved').length,
    submitted:   tasks.filter(t => t.status === 'submitted').length,
    resubmitted: tasks.filter(t => t.status === 'resubmitted').length,
    rejected:    tasks.filter(t => t.status === 'rejected').length,
    completed:   tasks.filter(t => t.status === 'completed').length,
  }), [tasks]);

  const handleFilter = (f) => { setFilter(f); setPage(1); };
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  const getTaskDate = (t) => t.updatedAt || t.submittedAt || t.createdAt;

  const getProjectId = (t) => {
    const p = t.projectId;
    if (!p) return null;
    if (typeof p === 'string') return p;
    return p.id || p._id || null;
  };

  const handleTaskClick = (task) => {
    const pid = getProjectId(task);
    if (!pid) return;
    if (task.status === 'rejected') {
      navigate(`/annotator/projects/${pid}`);
    } else {
      navigate(`/annotator/projects/${pid}`);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-5xl space-y-5">

        {/* Header */}
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <h1 className="text-2xl font-bold text-gray-100">Lịch sử làm việc</h1>
          <p className="mt-1 text-sm text-gray-400">Các task đã nộp, được duyệt hoặc bị trả lại</p>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="rounded-xl bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tổng</p>
              <p className="text-xl font-bold text-gray-200">{counts.all}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
              <p className="text-xs text-emerald-500/70">Đã duyệt</p>
              <p className="text-xl font-bold text-emerald-400">{counts.approved}</p>
            </div>
            <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-3">
              <p className="text-xs text-yellow-500/70">Chờ review</p>
              <p className="text-xl font-bold text-yellow-400">{counts.submitted + counts.resubmitted}</p>
            </div>
            <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-3">
              <p className="text-xs text-rose-500/70">Bị trả lại</p>
              <p className="text-xl font-bold text-rose-400">{counts.rejected}</p>
            </div>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all',         label: `Tất cả (${counts.all})` },
              { key: 'approved',    label: `Đã duyệt (${counts.approved})` },
              { key: 'submitted',   label: `Chờ review (${counts.submitted})` },
              { key: 'resubmitted', label: `Đã nộp lại (${counts.resubmitted})` },
              { key: 'rejected',    label: `Bị trả lại (${counts.rejected})` },
              { key: 'completed',   label: `Hoàn thành (${counts.completed})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => handleFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Tìm tên file hoặc project..."
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 w-56"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-700/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        {/* Task list */}
        {pageItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-700 bg-gray-800/40 py-16 text-center">
            <svg className="mx-auto w-12 h-12 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 text-sm">Chưa có lịch sử nào{filter !== 'all' ? ' cho trạng thái này' : ''}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageItems.map(task => {
              const st = STATUS_CFG[task.status] || STATUS_CFG.submitted;
              const filename = task.dataItem?.originalName || task.dataItem?.filename || 'Không rõ tên file';
              const projName = task.projectId?.name || task.projectId?.projectName || 'Project';
              const feedback = task.reviewComments || task.rejectionReason || task.review_comments || '';
              const taskDate = getTaskDate(task);

              return (
                <div
                  key={task.id || task._id}
                  onClick={() => handleTaskClick(task)}
                  className="rounded-xl border border-gray-700/60 bg-gray-800/80 p-4 cursor-pointer hover:border-gray-600 hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`mt-0.5 h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${
                      task.status === 'approved' ? 'bg-emerald-500/10' :
                      task.status === 'rejected' ? 'bg-rose-500/10' :
                      'bg-blue-500/10'
                    }`}>
                      {task.status === 'approved' ? (
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : task.status === 'rejected' ? (
                        <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-200 truncate group-hover:text-blue-300 transition-colors">
                            {filename}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{projName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.color} ${st.bg}`}>
                            {st.label}
                          </span>
                          {taskDate && (
                            <span className="text-[11px] text-gray-500">{fmtDate(taskDate)}</span>
                          )}
                        </div>
                      </div>

                      {/* Reviewer feedback */}
                      {feedback && (
                        <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2">
                          <p className="text-[11px] font-semibold text-rose-400 mb-0.5">Phản hồi từ Reviewer:</p>
                          <p className="text-xs text-rose-300 leading-relaxed">{feedback}</p>
                        </div>
                      )}

                      {/* Action hint */}
                      {task.status === 'rejected' && (
                        <p className="mt-1.5 text-[11px] text-rose-400/70">Nhấn để vào project và sửa lại →</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-500">
              {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredTasks.length)} / {filteredTasks.length} task
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">‹</button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 5)          p = i + 1;
                else if (currentPage <= 3)    p = i + 1;
                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                else p = currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg border text-xs font-medium transition-all ${
                      p === currentPage
                        ? 'border-blue-500/50 bg-blue-600 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'
                    }`}>{p}</button>
                );
              })}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">›</button>
              <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">»</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AnnotatorHistory;

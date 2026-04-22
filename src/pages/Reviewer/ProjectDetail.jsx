import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';

const getAuthToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');

const fmtDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getSubtopicStatus = (sub) => {
  const { total = 0, approved = 0, rejected = 0, revised = 0, pending = 0 } = sub;
  const done = approved + rejected + revised;
  if (total === 0) return { label: 'Chua co item', color: 'text-gray-500', icon: '○' };
  if (done === total) {
    if (rejected === total) return { label: 'Da reject het', color: 'text-rose-400', icon: '✗' };
    return { label: 'Hoan tat review', color: 'text-emerald-400', icon: '✓' };
  }
  if (revised > 0) return { label: 'Dang review lai', color: 'text-violet-400', icon: '▶' };
  if (rejected > 0 && pending === 0) return { label: 'Cho annotator sua', color: 'text-amber-400', icon: '↩' };
  if (pending > 0) return { label: 'Dang cho review', color: 'text-yellow-400', icon: '⏳' };
  return { label: 'Dang review', color: 'text-blue-400', icon: '▶' };
};

const SubtopicCard = ({ sub, onStart }) => {
  const { name, guideline, total = 0, pending = 0, approved = 0, rejected = 0 } = sub;
  const reviewed = approved + rejected;
  const status = getSubtopicStatus(sub);
  const pct = total ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="group relative rounded-xl border border-gray-700/60 bg-gray-800/60 p-4 transition-all duration-200 hover:border-violet-500/40 hover:bg-gray-800">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-100 group-hover:text-violet-300 transition-colors">
            {name || 'Subtopic'}
          </h3>
          {guideline && <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{guideline}</p>}
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
          <span>{status.icon}</span>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-gray-900/60 p-2 text-center">
          <p className="text-lg font-bold text-gray-200">{total}</p>
          <p className="text-xs text-gray-500">Tong item</p>
        </div>
        <div className="rounded-lg bg-yellow-500/5 p-2 text-center border border-yellow-500/10">
          <p className="text-lg font-bold text-yellow-400">{pending}</p>
          <p className="text-xs text-yellow-500/70">Can review</p>
        </div>
        <div className="rounded-lg bg-gray-900/40 p-2 text-center">
          <p className="text-lg font-bold text-gray-400">{Math.max(0, total - pending - reviewed)}</p>
          <p className="text-xs text-gray-600">Chua nop</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-emerald-500/5 p-2 text-center border border-emerald-500/10">
          <p className="text-sm font-bold text-emerald-400">{approved}</p>
          <p className="text-xs text-emerald-500/70">Approved</p>
        </div>
        <div className="rounded-lg bg-rose-500/5 p-2 text-center border border-rose-500/10">
          <p className="text-sm font-bold text-rose-400">{rejected}</p>
          <p className="text-xs text-rose-500/70">Rejected</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Tien do review</span>
          <span className="font-medium text-gray-300">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-700/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {pending > 0 && (
        <button
          onClick={() => onStart(sub)}
          className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all duration-200"
        >
          Vao review
        </button>
      )}
      {pending === 0 && reviewed > 0 && (
        <button
          onClick={() => onStart(sub)}
          className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200"
        >
          Xem lai
        </button>
      )}
    </div>
  );
};

const ReviewerProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [subtopicGroups, setSubtopicGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, reviewed: 0 });
  const [toast, setToast] = useState(null);
  const [modalType, setModalType] = useState(null); // 'approve' | 'reject' | null
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      // 1. Lấy thông tin project
      const projRes = await axios.get(`${API_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const projData = projRes.data?.project || projRes.data;
      setProject(projData);

      // 2. Lấy dataset của project → lấy subtopicIds
      const datasetId =
        projData?.dataset?.id ||
        projData?.dataset_id ||
        projRes.data?.dataset?.id ||
        projRes.data?.dataset_id ||
        null;

      let subtopicIdsMap = {}; // { [subId]: { id, name, guideline } }

      if (datasetId) {
        try {
          const dsRes = await axios.get(`${API_URL}/api/datasets/${datasetId}`, {
            headers: { Authorization: `Bearer ${getAuthToken()}` },
          });
          const ds = dsRes.data || {};
          const ids = Array.isArray(ds.subtopicIds)
            ? ds.subtopicIds
            : Array.isArray(ds.subtopic_ids)
              ? ds.subtopic_ids
              : [];
          // Lấy chi tiết từng subtopic
          const subResList = await Promise.all(
            ids.map((subId) =>
              axios
                .get(`${API_URL}/api/subtopics/${subId}`, {
                  headers: { Authorization: `Bearer ${getAuthToken()}` },
                })
                .catch(() => ({ data: null }))
            )
          );
          subResList.forEach((r) => {
            if (!r.data) return;
            const s = r.data;
            const sid = s.id || s._id;
            if (sid) {
              subtopicIdsMap[sid] = {
                id: sid,
                name: s.name || s.title || `Subtopic ${sid}`,
                guideline: s.guideline || '',
              };
            }
          });
        } catch {
          // ignore
        }
      }

      // 3. Lấy tasks từ /api/tasks/my-tasks (annotator tasks đã submit)
      let taskList = [];
      try {
        const taskRes = await axios.get(`${API_URL}/api/tasks/my-tasks`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { project_id: projectId, limit: 1000 },
        });
        taskList = Array.isArray(taskRes.data)
          ? taskRes.data
          : taskRes.data?.data || taskRes.data?.tasks || [];
      } catch {
        taskList = [];
      }

      // 4. Lọc tasks thuộc project này
      const projectTasks = taskList.filter((t) => {
        const pid = t.project_id || t.projectId || t.project?.id;
        return String(pid || '') === String(projectId);
      });

      // 5. Tính stats tổng
      const computedStats = projectTasks.reduce(
        (acc, t) => {
          const status = t.status || '';
          if (['assigned', 'in_progress', 'submitted', 'resubmitted', 'pending_review', 'partially_reviewed'].includes(status)) {
            acc.pending += 1;
          }
          if (status === 'approved') acc.approved += 1;
          if (status === 'rejected') acc.rejected += 1;
          return acc;
        },
        { total: projectTasks.length, pending: 0, approved: 0, rejected: 0, reviewed: 0 }
      );
      computedStats.reviewed = computedStats.approved + computedStats.rejected;
      setStats(computedStats);

      // 6. Group tasks theo subtopic — ưu tiên: dataset subtopic > task subtopic > task subtopicId
      const subMap = {};
      projectTasks.forEach((t) => {
        // Ưu tiên lấy subtopic từ nhiều nguồn
        let sid = t.subtopic_id || t.subtopicId || null;
        let subName = subtopicIdsMap[sid]?.name || '';
        // Nếu không có trong subtopicIdsMap, thử từ task object
        if (!sid || !subName) {
          const altSid = t.subtopic?.id || t.subtopicId || null;
          if (altSid) { sid = altSid; subName = subName || t.subtopic?.name || t.subtopicName || ''; }
        }
        // Nếu vẫn không có name, dùng tên từ dataset subtopics (duyệt lại)
        if (!subName && subtopicIdsMap[sid]) subName = subtopicIdsMap[sid].name;
        // Nếu hoàn toàn không có subtopic nào, gom vào '__ungrouped__'
        if (!sid) sid = '__ungrouped__';

        if (!subMap[sid]) {
          subMap[sid] = {
            id: sid,
            name: subName || (sid === '__ungrouped__' ? 'Khong phan loai' : `Subtopic ${sid}`),
            guideline: subtopicIdsMap[sid]?.guideline || t.subtopic?.guideline || '',
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
          };
        }
        subMap[sid].total += 1;
        const st = t.status || '';
        if (['assigned', 'in_progress', 'submitted', 'resubmitted', 'pending_review', 'partially_reviewed'].includes(st)) {
          subMap[sid].pending += 1;
        }
        if (st === 'approved') subMap[sid].approved += 1;
        if (st === 'rejected') subMap[sid].rejected += 1;
      });

      const groups = Object.values(subMap);
      setSubtopicGroups(groups);

      // Nếu không có subtopic từ API, vẫn hiển thị "Chua co item"
      if (groups.length === 0 && datasetId) {
        setError('Chua co item nao trong project nay.');
      }
    } catch (err) {
      console.error('fetchData error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Khong tai duoc thong tin project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartReview = (sub) => {
    if (!sub.id || sub.id === '__ungrouped__') {
      // Neu tasks khong co subtopic, navigate khong filter subtopic (xem het)
      navigate(`/reviewer/workspace/${projectId}`);
    } else {
      navigate(`/reviewer/workspace/${projectId}?subtopicId=${sub.id}`);
    }
  };

  const handleStartAllReview = () => {
    navigate(`/reviewer/workspace/${projectId}?projectId=${projectId}`);
  };

  const submitProjectAction = async () => {
    setModalError('');
    if (modalType === 'reject' && !reviewComment.trim()) {
      setToast({ type: 'error', message: 'Vui lòng điền lý do Reject dự án.' });
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalType === 'approve') {
        await axios.post(
          `${API_URL}/api/projects/${projectId}/approve`,
          { comment: reviewComment },
          { headers: { Authorization: `Bearer ${getAuthToken()}` } }
        );
        setToast({ type: 'success', message: 'Đã hoàn tất (Approve) dự án.' });
      } else if (modalType === 'reject') {
        await axios.post(
          `${API_URL}/api/projects/${projectId}/reject`,
          { comment: reviewComment },
          { headers: { Authorization: `Bearer ${getAuthToken()}` } }
        );
        setToast({ type: 'success', message: 'Đã yêu cầu làm lại (Reject) dự án.' });
      }
      setModalType(null);
      setReviewComment('');
      fetchData(); // Tham chiếu để cập nhật lại UI
    } catch (err) {
      const backendError = err.response?.data?.error || err.message;
      if (err.response?.status === 400 && modalType === 'approve') {
        setModalError(err.response?.data?.message || 'Tỷ lệ Approve chưa đạt ngưỡng cho phép.');
      } else if (err.response?.status === 500) {
        setModalError(`Lỗi hệ thống (500): ${backendError}`);
      } else {
        setToast({
          type: 'error',
          message: err.response?.data?.message || `Có lỗi xảy ra: ${backendError}`
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Dang tai thong tin project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="mx-auto w-12 h-12 text-rose-500/60 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/reviewer/tasks')}
            className="rounded-lg bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 transition"
          >
            Quay lai danh sach project
          </button>
        </div>
      </div>
    );
  }

  const overdue = project?.deadline && new Date(project.deadline) < new Date();
  const guideline = project?.guidelines || project?.guideline || project?.projectId?.guidelines || '';
  const reviewed = stats.approved + stats.rejected;
  const progressPct = stats.total ? Math.round((reviewed / stats.total) * 100) : 0;
  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reviewer/tasks')}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm text-gray-400 border border-gray-700/60 hover:text-gray-200 hover:border-gray-600 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lai
          </button>
          <span className="text-gray-600 text-sm">/</span>
          <span className="text-sm text-gray-500 truncate">{project?.name}</span>
        </div>

        {/* Project Header */}
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100 mb-1">
                {project?.name}
                {project?.status === 'completed' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Da hoan thanh
                  </span>
                )}
                {project?.status === 'waiting_rework' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-500 border border-yellow-500/20">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Lam lai (Rework)
                  </span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                {project?.dataset?.name && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    {project.dataset.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              {/* Deadline */}
              {project?.deadline && (
                <div className={`rounded-xl px-4 py-3 border w-full lg:w-auto text-right ${overdue ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-gray-900/60 border-gray-700/60 text-gray-300'}`}>
                  <p className="text-xs font-medium mb-0.5">{overdue ? 'Qua han!' : 'Deadline'}</p>
                  <p className="text-lg font-bold">{fmtDateTime(project.deadline)}</p>
                </div>
              )}

              {/* Action Buttons for Project Finalization */}
              {stats.total > 0 && stats.pending === 0 && !['completed', 'waiting_rework'].includes(project?.status) && (
                <div className="flex flex-col items-end gap-1.5 mt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setModalType('reject'); setReviewComment(''); setModalError(''); }}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                    <button
                      onClick={() => { setModalType('approve'); setReviewComment(''); setModalError(''); }}
                      disabled={approvalRate < 70}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${approvalRate < 70
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                  </div>
                  {approvalRate < 70 && (
                    <p className="text-xs text-rose-400/90 pr-1 max-w-[280px]">
                      Tỷ lệ chấm ({approvalRate}%) chưa đủ 70%. Bắt buộc Reject.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-5">
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tong item</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-yellow-500/5 p-3 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/70">Can review</p>
              <p className="mt-0.5 text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/5 p-3 border border-emerald-500/10">
              <p className="text-xs text-emerald-500/70">Approved</p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-400">{stats.approved}</p>
            </div>
            <div className="rounded-lg bg-rose-500/5 p-3 border border-rose-500/10">
              <p className="text-xs text-rose-500/70">Rejected</p>
              <p className="mt-0.5 text-2xl font-bold text-rose-400">{stats.rejected}</p>
            </div>
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Da review</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">{reviewed}</p>
            </div>
          </div>

          {/* Overall progress */}
          {stats.total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-400 font-medium">Tien do review tong the</span>
                <span className="text-gray-200 font-semibold">
                  {progressPct}% ({reviewed}/{stats.total} items)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${reviewed === stats.total ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Guidelines */}
          {guideline && (
            <div className="mt-4 border-t border-gray-700/60 pt-4">
              <button
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${showGuidelines ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Huong dan ghi nhan (Guidelines)
              </button>
              {showGuidelines && (
                <div className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{guideline}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Review Queue - Subtopics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-100">
              {subtopicGroups.length > 0
                ? `Subtopics (${subtopicGroups.length})`
                : 'Review Queue'}
            </h2>
            {stats.pending > 0 && (
              <button
                onClick={handleStartAllReview}
                className="rounded-lg bg-violet-600 hover:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Vao review ({stats.pending} item)
              </button>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-violet-500 mx-auto mb-3" />
              <p className="text-gray-500">Dang tai subtopics...</p>
            </div>
          ) : subtopicGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subtopicGroups.map((sub) => (
                <SubtopicCard
                  key={sub.id}
                  sub={sub}
                  onStart={handleStartReview}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-12 text-center">
              <svg className="mx-auto w-10 h-10 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m2 0h5" />
              </svg>
              <p className="text-gray-500">
                {stats.pending > 0
                  ? 'Dang tai subtopics...'
                  : error || 'Chua co item nao can review.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 shadow-xl max-w-sm ${toast.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
          <div className="flex items-start gap-2">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">&times;</button>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-gray-700/60 pb-4">
              <div className={`rounded-full p-2.5 ${modalType === 'approve' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {modalType === 'approve' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100">
                  {modalType === 'approve' ? 'Đóng và Chấp Thuận Project' : 'Từ chối (Reject) Project'}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {modalType === 'approve'
                    ? 'Xác nhận toàn bộ kết quả đã được review. Dự án sẽ chuyển sang trạng thái "Completed".'
                    : 'Dự án sẽ chuyển về trạng thái "Waiting Rework".'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-300 mb-1.5 flex justify-between">
                Lý do / Bình luận
                {modalType === 'reject' && <span className="text-rose-400">* Bắt buộc</span>}
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => {
                  setReviewComment(e.target.value);
                  if (modalError) setModalError('');
                }}
                placeholder={modalType === 'approve' ? 'Nhập nhận xét (tùy chọn)...' : 'Ví dụ: Dữ liệu chưa đủ chuẩn, còn sai cấu trúc nhiều...'}
                className={`w-full resize-y rounded-xl border bg-gray-900/50 p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all min-h-[100px] ${modalType === 'approve'
                  ? 'border-gray-700 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                  : 'border-gray-700 focus:border-rose-500/50 focus:ring-rose-500/20'
                  }`}
              />
            </div>

            {modalError && (
              <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 flex items-start gap-2">
                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-rose-400">{modalError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => { setModalType(null); setModalError(''); }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                disabled={isSubmitting || (modalType === 'reject' && !reviewComment.trim())}
                onClick={submitProjectAction}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${modalType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                  }`}
              >
                {isSubmitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {modalType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerProjectDetail;

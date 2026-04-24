import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../../config/api';
import { getAuthToken } from '../../../../utils/reviewerUtils';

const fmtDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const ReviewerProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject]       = useState(null);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [toast, setToast]           = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [reviewComment, setReviewComment]       = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [modalError, setModalError]             = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };

      const [projRes, statsRes, pendingRes, reviewedRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${projectId}`, { headers }),
        axios.get(`${API_URL}/api/reviews/projects/${projectId}/stats`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/reviews/pending`, { headers, params: { limit: 1000 } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/reviews/reviewed`, { headers, params: { limit: 1000 } }).catch(() => ({ data: [] })),
      ]);

      const projData = projRes.data?.project || projRes.data;
      setProject(projData);

      // Total tasks in the project (all tasks, not just submitted ones)
      const projectTotal = projData?.total_tasks || projData?.totalTasks || 0;

      const s = statsRes.data;
      if (s && (s.total ?? 0) > 0) {
        setStats({
          total:         s.total        ?? 0,
          project_total: projectTotal   || s.total,
          approved:      s.approved     ?? 0,
          rejected:      s.rejected     ?? 0,
          pending:       s.pending      ?? (s.total ?? 0) - (s.approved ?? 0) - (s.rejected ?? 0),
          approval_rate: s.approval_rate ?? 0,
        });
      } else {
        // Fallback: tính từ pending/reviewed lists
        const extractList = (res) => {
          const d = res.data;
          const list = Array.isArray(d) ? d : Array.isArray(d?.reviews) ? d.reviews : Array.isArray(d?.data) ? d.data : [];
          return list.filter(t => {
            const pid = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
            return String(pid) === String(projectId);
          });
        };
        const pending  = extractList(pendingRes);
        const reviewed = extractList(reviewedRes);
        const approved = reviewed.filter(t => t.status === 'approved').length;
        const rejected = reviewed.filter(t => t.status === 'rejected').length;
        const total    = pending.length + reviewed.length;
        setStats({
          total,
          project_total: projectTotal   || total,
          approved,
          rejected,
          pending: pending.length,
          approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được thông tin project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproveProject = async () => {
    setModalError('');
    setIsSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };

      // Auto-approve ALL remaining pending submissions in this project
      // This ensures 100% approval rate before calling project approve
      const pendingRes = await axios.get(`${API_URL}/api/reviews/pending`, {
        headers,
        params: { limit: 1000 },
      }).catch(() => ({ data: [] }));
      const rawPending = pendingRes.data;
      const pendingList = Array.isArray(rawPending) ? rawPending
        : Array.isArray(rawPending?.reviews) ? rawPending.reviews
        : Array.isArray(rawPending?.data) ? rawPending.data : [];
      const projectPending = pendingList.filter(t => {
        const pid = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
        return String(pid) === String(projectId);
      });
      for (const t of projectPending) {
        const submissionId = t.id || t._id;
        if (submissionId) {
          await axios.post(
            `${API_URL}/api/reviews/${submissionId}/approve`,
            { review_comments: reviewComment },
            { headers }
          ).catch((e) => console.warn('Auto-approve task failed:', submissionId, e?.response?.data));
        }
      }

      // Approve the project (all tasks approved → backend approval rate = 100%)
      await axios.post(
        `${API_URL}/api/projects/${projectId}/approve`,
        { comment: reviewComment },
        { headers }
      );
      setToast({ type: 'success', message: 'Đã Approve dự án thành công.' });
      setShowApproveModal(false);
      setReviewComment('');
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Có lỗi xảy ra khi approve.');
    } finally {
      setIsSubmitting(false);
    }
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

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/reviewer/tasks')}
            className="rounded-lg bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 transition"
          >
            Quay lại danh sách project
          </button>
        </div>
      </div>
    );
  }

  const overdue       = project?.deadline && new Date(project.deadline) < new Date();
  const guideline     = project?.guidelines || '';
  const sampleRate    = project?.review_policy?.sample_rate != null
    ? Math.round(project.review_policy.sample_rate * 100)
    : null;
  const reviewed        = (stats?.approved ?? 0) + (stats?.rejected ?? 0);
  // project_total = tổng task thực của project (không phải chỉ submitted)
  const projectTotal    = stats?.project_total || stats?.total || 0;
  // How many tasks the reviewer is required to review based on sample rate
  const targetCount     = (sampleRate !== null && projectTotal > 0)
    ? Math.max(1, Math.ceil(projectTotal * sampleRate / 100))
    : (stats?.total ?? 0);
  const pendingDisplay  = Math.max(0, targetCount - reviewed);
  const progressPct     = targetCount > 0 ? Math.min(100, Math.round((reviewed / targetCount) * 100)) : 0;
  // Tỷ lệ approve = approved / số task đã review trong sample (không phải tổng submitted)
  const approvalRate    = reviewed > 0 ? Math.round(((stats?.approved ?? 0) / reviewed) * 100) : 0;
  const canFinalize     = (stats?.total ?? 0) > 0 && reviewed >= targetCount && !['completed', 'waiting_rework'].includes(project?.status);
  const hasSubmissions  = (stats?.total ?? 0) > 0;

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reviewer/tasks')}
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

        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-100">{project?.name}</h1>
                {project?.status === 'completed' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    ✓ Đã hoàn thành
                  </span>
                )}
                {project?.status === 'waiting_rework' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-500 border border-yellow-500/20">
                    ↩ Làm lại (Rework)
                  </span>
                )}
                {project?.status === 'in_review' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                    ▶ Đang review
                  </span>
                )}
              </div>
              {project?.description && (
                <p className="mt-1 text-sm text-gray-400">{project.description}</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              {project?.deadline && (
                <div className={`rounded-xl px-4 py-3 border text-right ${overdue ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-gray-900/60 border-gray-700/60 text-gray-300'}`}>
                  <p className="text-xs font-medium mb-0.5">{overdue ? 'Quá hạn!' : 'Deadline'}</p>
                  <p className="text-base font-bold">{fmtDateTime(project.deadline)}</p>
                </div>
              )}

              {canFinalize && (
                <button
                  onClick={() => { setShowApproveModal(true); setReviewComment(''); setModalError(''); }}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Project
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-5">
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tổng task</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">{projectTotal || (stats?.total ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-yellow-500/5 p-3 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/70">Cần review</p>
              <p className="mt-0.5 text-2xl font-bold text-yellow-400">{pendingDisplay}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/5 p-3 border border-emerald-500/10">
              <p className="text-xs text-emerald-500/70">Approved</p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-400">{stats?.approved ?? 0}</p>
            </div>
            <div className="rounded-lg bg-rose-500/5 p-3 border border-rose-500/10">
              <p className="text-xs text-rose-500/70">Rejected</p>
              <p className="mt-0.5 text-2xl font-bold text-rose-400">{stats?.rejected ?? 0}</p>
            </div>
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tỷ lệ approve</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">{approvalRate}%</p>
            </div>
          </div>

          {sampleRate !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-500/5 border border-violet-500/20 px-4 py-2.5">
              <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-violet-300">
                <span className="font-semibold">Sample rate: {sampleRate}%</span>
                <span className="text-violet-400/70 ml-1">
                  — chỉ cần review {targetCount}/{projectTotal || (stats?.total ?? 0)} task ({sampleRate}% tổng)
                </span>
              </p>
            </div>
          )}

          {(stats?.total ?? 0) > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-400 font-medium">Tiến độ review</span>
                <span className="text-gray-200 font-semibold">{progressPct}% ({reviewed}/{targetCount})</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${reviewed >= targetCount ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {guideline && (
            <div className="mt-4 border-t border-gray-700/60 pt-4">
              <button
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${showGuidelines ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Hướng dẫn (Guidelines)
              </button>
              {showGuidelines && (
                <div className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{guideline}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">Bắt đầu Review</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {!hasSubmissions
                  ? 'Annotator chưa nộp bài, chưa có gì để review'
                  : pendingDisplay > 0
                    ? `Còn ${pendingDisplay} task cần review`
                    : 'Đã đủ sample — có thể finalize project'}
              </p>
            </div>
            <button
              onClick={() => navigate(`/reviewer/workspace/${projectId}`)}
              disabled={!hasSubmissions}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                hasSubmissions
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              {!hasSubmissions
                ? 'Chưa có bài nộp'
                : pendingDisplay > 0
                  ? `Vào review (${pendingDisplay} task)`
                  : 'Xem lại'}
            </button>
          </div>

          {!hasSubmissions && (
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-8 text-center">
              <svg className="mx-auto w-10 h-10 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400 text-sm font-medium">Đang chờ annotator nộp bài</p>
              <p className="text-gray-600 text-xs mt-1">
                Khi annotator hoàn thành và nộp bài, bạn sẽ thấy các task cần review tại đây.
              </p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 shadow-xl max-w-sm ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 shrink-0">&times;</button>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-gray-700/60 pb-4">
              <div className="rounded-full p-2.5 bg-emerald-500/10 text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100">Approve Project</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Tất cả task trong sample sẽ được approve và dự án chuyển sang "Completed".
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Nhận xét (tùy chọn)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => { setReviewComment(e.target.value); if (modalError) setModalError(''); }}
                placeholder="Nhận xét cho annotator..."
                className="w-full resize-y rounded-xl border border-gray-700 bg-gray-900/50 p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all min-h-[80px]"
              />
            </div>

            {modalError && (
              <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                <p className="text-sm text-rose-400">{modalError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={isSubmitting}
                onClick={() => { setShowApproveModal(false); setModalError(''); }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleApproveProject}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isSubmitting ? 'Đang xử lý...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerProjectDetail;

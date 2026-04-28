import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../../../config/api";
import { getAuthToken } from "../../../../utils/reviewerUtils";

// Format ngày giờ theo định dạng DD/MM/YYYY HH:MM tiếng Việt
const fmtDateTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReviewerProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [toast, setToast] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [reviewComment, setReviewComment]       = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [modalError, setModalError]             = useState('');
  const [overrideSampleRate, setOverrideSampleRate] = useState(null);

  // Gọi API lấy thông tin project và tổng hợp stats review (approved/rejected/pending)
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };

      const [projRes, statsRes, pendingRes, reviewedRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${projectId}`, { headers }),
        axios.get(`${API_URL}/api/reviews/projects/${projectId}/stats`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/reviews/pending`, {
          headers,
          params: {
            limit: 1000,
            project_id: projectId,
            ...(overrideSampleRate !== null ? { override_sample_rate: overrideSampleRate } : {})
          }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/reviews/reviewed`, { headers, params: { limit: 1000, project_id: projectId } }).catch(() => ({ data: [] })),
      ]);

      const projData = projRes.data?.project || projRes.data;
      setProject(projData);

      // Total tasks in the project (all tasks, not just submitted ones)
      const projectTotal = projData?.total_tasks || projData?.totalTasks || 0;

      const s = statsRes.data;
      const sTotal = (s?.total ?? 0) + (s?.pending ?? 0) + (s?.approved ?? 0) + (s?.rejected ?? 0);
      if (s && sTotal > 0) {
        const computedTotal = (s.total ?? 0) || ((s.pending ?? 0) + (s.approved ?? 0) + (s.rejected ?? 0));
        setStats({
          total: computedTotal,
          project_total: projectTotal || computedTotal,
          approved: s.approved ?? 0,
          rejected: s.rejected ?? 0,
          pending: s.pending ?? computedTotal - (s.approved ?? 0) - (s.rejected ?? 0),
          approval_rate: s.approval_rate ?? 0,
        });
      } else {
        // Fallback: tính từ pending/reviewed lists
        const extractList = (res) => {
          const d = res.data;
          const list = Array.isArray(d)
            ? d
            : Array.isArray(d?.reviews)
              ? d.reviews
              : Array.isArray(d?.data)
                ? d.data
                : [];
          return list.filter((t) => {
            const pid =
              t.project?.id ||
              t.projectId?.id ||
              (typeof t.projectId === "string" ? t.projectId : null);
            return String(pid) === String(projectId);
          });
        };
        const pending = extractList(pendingRes);
        const reviewed = extractList(reviewedRes);
        const approved = reviewed.filter((t) => t.status === "approved").length;
        const rejected = reviewed.filter((t) => t.status === "rejected").length;
        const total = pending.length + reviewed.length;
        setStats({
          total,
          project_total: projectTotal || total,
          approved,
          rejected,
          pending: pending.length,
          approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Không tải được thông tin project",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, overrideSampleRate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Approve toàn bộ project: tự động approve tất cả tasks pending còn lại, sau đó gọi API approve project
  const handleApproveProject = async () => {
    setModalError("");
    setIsSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };

      // Auto-approve toàn bộ task pending còn lại trong project.
      // Lý do: reviewer chỉ review một phần (sample), phần còn lại cần được approve tự động
      // trước khi gọi project approve — nếu không backend sẽ báo còn task chưa xử lý.
      const pendingRes = await axios.get(`${API_URL}/api/reviews/pending`, {
        headers,
        params: { limit: 1000 },
      }).catch(() => ({ data: [] }));
      const rawPending = pendingRes.data;
      const pendingList = Array.isArray(rawPending)
        ? rawPending
        : Array.isArray(rawPending?.reviews)
          ? rawPending.reviews
          : Array.isArray(rawPending?.data)
            ? rawPending.data
            : [];
      const projectPending = pendingList.filter((t) => {
        const pid =
          t.project?.id ||
          t.projectId?.id ||
          (typeof t.projectId === "string" ? t.projectId : null);
        return String(pid) === String(projectId);
      });
      for (const t of projectPending) {
        const submissionId = t.id || t._id;
        if (submissionId) {
          await axios
            .post(
              `${API_URL}/api/reviews/${submissionId}/approve`,
              { review_comments: reviewComment },
              { headers },
            )
            .catch((e) =>
              console.warn(
                "Auto-approve task failed:",
                submissionId,
                e?.response?.data,
              ),
            );
        }
      }

      // Sau khi auto-approve xong → gọi project approve để chuyển status → "completed"
      await axios.post(
        `${API_URL}/api/projects/${projectId}/approve`,
        { comment: reviewComment },
        { headers },
      );
      setToast({ type: "success", message: "Đã Approve dự án thành công." });
      setShowApproveModal(false);
      setReviewComment("");
      fetchData();
    } catch (err) {
      setModalError(
        err.response?.data?.message || "Có lỗi xảy ra khi approve.",
      );
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
            onClick={() => navigate("/reviewer/tasks")}
            className="rounded-lg bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 transition"
          >
            Quay lại danh sách project
          </button>
        </div>
      </div>
    );
  }

  const deadlinePassed = !!project?.deadline && new Date(project.deadline) < new Date();
  const overdue       = deadlinePassed && project?.status !== 'completed';
  const guideline     = project?.guidelines || '';

  const sampleRate    = project?.review_policy?.sample_rate != null
    ? Math.round(project.review_policy.sample_rate * 100)
    : null;

  const projectTotal    = stats?.project_total || stats?.total || 0;

  const targetCount     = (sampleRate !== null && projectTotal > 0)
    ? Math.max(1, Math.ceil(projectTotal * sampleRate / 100))
    : (stats?.total ?? 0);

  const reviewedRaw     = (stats?.approved ?? 0) + (stats?.rejected ?? 0);

  const reviewed        = sampleRate !== null ? Math.min(reviewedRaw, targetCount) : reviewedRaw;

  const pendingDisplay  = Math.max(0, targetCount - reviewed);

  const progressPct     = targetCount > 0 ? Math.min(100, Math.round((reviewed / targetCount) * 100)) : 0;

  const approvalRate    = reviewedRaw > 0 ? Math.round(((stats?.approved ?? 0) / reviewedRaw) * 100) : 0;

  const canFinalize     = (stats?.total ?? 0) > 0 && reviewed >= targetCount && !['completed', 'waiting_rework'].includes(project?.status);

  const hasSubmissions  = (stats?.total ?? 0) > 0;

  const reviewerAtFault = deadlinePassed && pendingDisplay > 0;

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/reviewer/tasks")}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm text-gray-400 border border-gray-700/60 hover:text-gray-200 hover:border-gray-600 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại
          </button>
          <span className="text-gray-600 text-sm">/</span>
          <span className="text-sm text-gray-500 truncate">
            {project?.name}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-100">
                  {project?.name}
                </h1>
                {(() => {
                  const isReallyCompleted = project?.status === 'completed'
                    && reviewed >= targetCount
                    && targetCount > 0;

                  if (isReallyCompleted)
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                        ✓ Đã hoàn thành
                      </span>
                    );
                  if (project?.status === "waiting_rework")
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-500 border border-yellow-500/20">
                        ↩ Làm lại (Rework)
                      </span>
                    );
                  if (
                    project?.status === "in_review" ||
                    project?.status === "completed"
                  )
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                        ▶ Đang review
                      </span>
                    );
                  return null;
                })()}
              </div>
              {project?.description && (
                <p className="mt-1 text-sm text-gray-400">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              {project?.deadline && (
                <div
                  className={`rounded-xl px-4 py-3 border text-right ${overdue ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-gray-900/60 border-gray-700/60 text-gray-300"}`}
                >
                  <p className="text-xs font-medium mb-0.5">
                    {overdue ? "Quá hạn!" : "Deadline"}
                  </p>
                  <p className="text-base font-bold">
                    {fmtDateTime(project.deadline)}
                  </p>
                </div>
              )}

              {canFinalize && (
                <button
                  onClick={() => {
                    setShowApproveModal(true);
                    setReviewComment("");
                    setModalError("");
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approve Project
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-5">
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tổng task</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">
                {projectTotal || (stats?.total ?? 0)}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-500/5 p-3 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/70">Cần review</p>
              <p className="mt-0.5 text-2xl font-bold text-yellow-400">
                {pendingDisplay}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/5 p-3 border border-emerald-500/10">
              <p className="text-xs text-emerald-500/70">Approved</p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-400">
                {stats?.approved ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-rose-500/5 p-3 border border-rose-500/10">
              <p className="text-xs text-rose-500/70">Rejected</p>
              <p className="mt-0.5 text-2xl font-bold text-rose-400">
                {stats?.rejected ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500">Tỷ lệ approve</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-200">
                {approvalRate}%
              </p>
            </div>
          </div>


          {sampleRate !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-500/5 border border-violet-500/20 px-4 py-3">
              <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-violet-300">
                <span className="font-semibold">Cấu hình mặc định: {sampleRate}%</span>
                <span className="text-violet-400/70 ml-1">
                  — {targetCount}/{projectTotal || (stats?.total ?? 0)} task
                </span>
              </p>
            </div>
          )}

          {(stats?.total ?? 0) > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-400 font-medium">
                  Tiến độ review
                </span>
                <span className="text-gray-200 font-semibold">
                  {progressPct}% ({reviewed}/{targetCount})
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${reviewed >= targetCount ? "bg-emerald-500" : "bg-gradient-to-r from-violet-600 to-fuchsia-500"}`}
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
                <svg
                  className={`w-4 h-4 transition-transform ${showGuidelines ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Hướng dẫn (Guidelines)
              </button>
              {showGuidelines && (
                <div className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {guideline}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">
                Bắt đầu Review
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {reviewerAtFault
                  ? `Project quá hạn — còn ${pendingDisplay} task chưa được review`
                  : overdue
                    ? "Project đã quá hạn, không thể tiếp tục review"
                    : !hasSubmissions
                      ? "Annotator chưa nộp bài, chưa có gì để review"
                      : pendingDisplay > 0
                        ? `Còn ${pendingDisplay} task cần review`
                        : "Đã đủ sample — có thể finalize project"}
              </p>
            </div>
            <button
              onClick={() => navigate(`/reviewer/workspace/${projectId}${overrideSampleRate !== null ? `?override_sample_rate=${overrideSampleRate}` : ''}`)}
              disabled={!hasSubmissions || overdue}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                hasSubmissions && !overdue
                  ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20"
                  : "bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              {overdue
                ? "Project đã quá hạn"
                : !hasSubmissions
                  ? "Chưa có bài nộp"
                  : pendingDisplay > 0
                    ? `Vào review (${pendingDisplay} task)`
                    : "Xem lại"}
            </button>
          </div>

          {/* Quá hạn do reviewer chưa chấm */}
          {reviewerAtFault && (
            <div className="rounded-xl border border-rose-700/40 bg-rose-500/5 p-5 flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-rose-400">Reviewer chưa hoàn thành review trước deadline</p>
                <p className="text-xs text-rose-400/70 mt-1">
                  Annotator đã nộp bài đầy đủ nhưng còn <span className="font-semibold">{pendingDisplay} task</span> chưa được review. Project quá hạn do reviewer chưa chấm kịp.
                </p>
              </div>
            </div>
          )}

          {/* Annotator chưa nộp bài */}
          {!reviewerAtFault && !overdue && !hasSubmissions && (
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
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 shadow-xl max-w-sm ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="opacity-60 hover:opacity-100 shrink-0"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-gray-700/60 pb-4">
              <div className="rounded-full p-2.5 bg-emerald-500/10 text-emerald-400">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100">
                  Approve Project
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Tất cả task trong sample sẽ được approve và dự án chuyển sang
                  "Completed".
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Nhận xét (tùy chọn)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => {
                  setReviewComment(e.target.value);
                  if (modalError) setModalError("");
                }}
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
                onClick={() => {
                  setShowApproveModal(false);
                  setModalError("");
                }}
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
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isSubmitting ? "Đang xử lý..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerProjectDetail;

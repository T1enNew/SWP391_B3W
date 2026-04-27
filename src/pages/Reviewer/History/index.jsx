import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getAuthToken, stringToColor } from '../../../utils/reviewerUtils';

// Format ngày giờ ngắn gọn (DD/MM HH:MM) để hiển thị trong bảng
const fmtShortDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Format ngày giờ đầy đủ (DD/MM/YYYY HH:MM) dùng cho tooltip
const fmtFullDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Xác định loại file (IMAGE/AUDIO/VIDEO/TEXT/FILE) từ phần mở rộng của tên file
const getFileType = (filename) => {
  if (!filename) return 'FILE';
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    jpg: 'IMAGE', jpeg: 'IMAGE', png: 'IMAGE', gif: 'IMAGE', bmp: 'IMAGE', webp: 'IMAGE', svg: 'IMAGE',
    mp3: 'AUDIO', wav: 'AUDIO', ogg: 'AUDIO',
    mp4: 'VIDEO', mov: 'VIDEO', avi: 'VIDEO',
    txt: 'TEXT', csv: 'TEXT', json: 'TEXT',
  };
  return map[ext] || 'FILE';
};

// Lấy 2 chữ viết tắt từ tên annotator để hiển thị avatar
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const PAGE_SIZE = 10;

// Component card thống kê có thể click để lọc theo trạng thái (Tất cả / Đã duyệt / Từ chối)
const StatCard = ({ label, value, sub, accent, onClick, active }) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[140px] rounded-2xl border p-4 text-left transition-all cursor-pointer group ${
      active
        ? `border-[${accent}]/60 ring-1 ring-[${accent}]/40 bg-[${accent}]/10`
        : 'border-gray-700/60 bg-gray-800/60 hover:border-gray-600'
    }`}
    style={active ? { borderColor: accent + '60', boxShadow: `0 0 0 1px ${accent}30`, background: accent + '12' } : {}}
  >
    <p className="text-3xl font-extrabold leading-none" style={{ color: accent }}>{value}</p>
    <p className="mt-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    {sub && <p className="mt-0.5 text-[11px] text-gray-500">{sub}</p>}
  </button>
);

// Component dropdown lọc dùng chung (trạng thái / project / thứ tự sắp xếp)
const FilterSelect = ({ value, onChange, children }) => (
  <select
    value={value} onChange={e => onChange(e.target.value)}
    className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500/60 transition-colors"
  >
    {children}
  </select>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ReviewerHistory = () => {
  const [reviewedTasks, setReviewedTasks] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [search, setSearch]               = useState('');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [projectFilter, setProjectFilter]   = useState('all');
  const [sortOrder, setSortOrder]           = useState('newest');
  const [page, setPage]                     = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/reviews/reviewed`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { page: 1, limit: 200 },
        });
        const raw = res.data;
        const list = Array.isArray(raw) ? raw
          : Array.isArray(raw?.reviews) ? raw.reviews
          : Array.isArray(raw?.data) ? raw.data
          : [];
        setReviewedTasks(list);
      } catch (err) {
        setError(err.response?.data?.message || 'Không tải được dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Trích xuất danh sách projects duy nhất từ tasks đã review, dùng cho dropdown lọc theo project
  const projects = useMemo(() => {
    const map = {};
    reviewedTasks.forEach(t => {
      const pid  = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
      const name = t.project?.name || t.projectId?.name || 'Unknown';
      if (pid) map[pid] = name;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [reviewedTasks]);

  const total         = reviewedTasks.length;
  const approvedCount = reviewedTasks.filter(t => t.status === 'approved').length;
  const rejectedCount = reviewedTasks.filter(t => t.status === 'rejected').length;
  const approvalRate  = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  // Lọc và sắp xếp danh sách tasks theo search, trạng thái, project và thứ tự thời gian
  const filtered = useMemo(() => {
    let result = [...reviewedTasks];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const di        = t.dataItem || t.data_item || {};
        const itemName  = (di.filename || di.originalName || di.original_name || '').toLowerCase();
        const annotName = (t.annotator?.full_name || t.annotator?.fullName || t.annotator?.username || '').toLowerCase();
        const projName  = (t.project?.name || t.projectId?.name || '').toLowerCase();
        return itemName.includes(q) || annotName.includes(q) || projName.includes(q);
      });
    }
    if (decisionFilter !== 'all') result = result.filter(t => t.status === decisionFilter);
    if (projectFilter !== 'all') {
      result = result.filter(t => {
        const pid = t.project?.id || t.projectId?.id || t.projectId;
        return String(pid) === String(projectFilter);
      });
    }
    result.sort((a, b) => {
      const dateA = new Date(a.reviewed_at || a.reviewedAt || a.submitted_at || 0);
      const dateB = new Date(b.reviewed_at || b.reviewedAt || b.submitted_at || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [reviewedTasks, search, decisionFilter, projectFilter, sortOrder]);

  const totalItems  = filtered.length;
  const totalPages  = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx    = (currentPage - 1) * PAGE_SIZE;
  const paginated   = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  const hasFilter   = search || decisionFilter !== 'all' || projectFilter !== 'all';

  // Chuyển trang và cuộn lên đầu danh sách
  const handlePageChange = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  // Xóa tất cả bộ lọc và reset về trang 1
  const clearFilters     = () => { setSearch(''); setDecisionFilter('all'); setProjectFilter('all'); setPage(1); };

  // Điều hướng đến workspace để reviewer xem lại chi tiết bài đã review
  const handleViewDetail = (task) => {
    const pid = task.project?.id || task.projectId?.id || task.projectId;
    window.location.href = '/reviewer/workspace/' + pid + '?taskId=' + task.id;
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#080f1e]">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-gray-700 border-t-violet-500" />
        <p className="text-sm text-gray-500">Đang tải lịch sử...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080f1e] text-gray-200">
      <div className="mx-auto w-full max-w-7xl space-y-5 p-6">

        {/* ── Header ── */}
        <div className="rounded-2xl border border-[#1e2d47] bg-[#0d1829] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-100">Lịch sử chấm bài</h1>
                <p className="text-sm text-gray-500">Tổng hợp toàn bộ quyết định review đã thực hiện</p>
              </div>
            </div>
            {/* Approval rate badge */}
            {total > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2">
                <div className="text-right">
                  <p className="text-xl font-extrabold text-violet-400">{approvalRate}%</p>
                  <p className="text-[11px] text-gray-500">Tỷ lệ approve</p>
                </div>
                <svg className="h-7 w-7 text-violet-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-700/40 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        {/* ── Stat cards ── */}
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Tất cả"
            value={total}
            sub={projects.length > 0 ? `Từ ${projects.length} project` : undefined}
            accent="#6366f1"
            active={decisionFilter === 'all' && projectFilter === 'all'}
            onClick={() => { setDecisionFilter('all'); setProjectFilter('all'); setPage(1); }}
          />
          <StatCard
            label="Đã duyệt"
            value={approvedCount}
            sub={total > 0 ? `${Math.round(approvedCount / total * 100)}% tổng số` : '—'}
            accent="#22c55e"
            active={decisionFilter === 'approved'}
            onClick={() => { setDecisionFilter('approved'); setPage(1); }}
          />
          <StatCard
            label="Từ chối"
            value={rejectedCount}
            sub={total > 0 ? `${Math.round(rejectedCount / total * 100)}% tổng số` : '—'}
            accent="#ef4444"
            active={decisionFilter === 'rejected'}
            onClick={() => { setDecisionFilter('rejected'); setPage(1); }}
          />
        </div>

        {/* ── Filter bar ── */}
        <div className="rounded-2xl border border-[#1e2d47] bg-[#0d1829] p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" placeholder="Tìm theo tên ảnh, annotator, project..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-[#1e2d47] bg-[#080f1e] py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-600 focus:border-violet-500/50 focus:outline-none transition-colors"
              />
            </div>

            <FilterSelect value={decisionFilter} onChange={v => { setDecisionFilter(v); setPage(1); }}>
              <option value="all">Tất cả trạng thái</option>
              <option value="approved">✓ Đã duyệt</option>
              <option value="rejected">✗ Từ chối</option>
            </FilterSelect>

            <FilterSelect value={projectFilter} onChange={v => { setProjectFilter(v); setPage(1); }}>
              <option value="all">Tất cả project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FilterSelect>

            <FilterSelect value={sortOrder} onChange={setSortOrder}>
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </FilterSelect>

            {hasFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl border border-gray-700 px-3 py-2 text-xs text-gray-400 transition-all hover:border-gray-500 hover:text-gray-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Xóa lọc
              </button>
            )}

            {totalItems > 0 && (
              <span className="ml-auto text-xs text-gray-500">{totalItems} kết quả</span>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-2xl border border-[#1e2d47] bg-[#0d1829]">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800 text-gray-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500">
                {hasFilter ? 'Không có kết quả phù hợp' : 'Chưa có lịch sử chấm bài'}
              </p>
              {hasFilter && (
                <button onClick={clearFilters} className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2d47] bg-[#080f1e]/60">
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Tệp / Loại</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Project</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Annotator</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Quyết định</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Phản hồi</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Thời gian</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d47]/60">
                  {paginated.map((t) => {
                    const di         = t.dataItem || t.data_item || {};
                    const itemName   = di.filename || di.originalName || di.original_name || t.id || 'Unknown';
                    const itemType   = getFileType(itemName);
                    const annotName  = t.annotator?.full_name || t.annotator?.fullName || t.annotator?.username || 'Unknown';
                    const projName   = t.project?.name || t.projectId?.name || '-';
                    const isApproved = t.status === 'approved';
                    const feedback   = t.review_comments || t.reviewComments;
                    const reviewTime = t.reviewed_at || t.reviewedAt || t.submitted_at;

                    return (
                      <tr key={t.id} className="transition-colors hover:bg-white/[0.025] group">
                        {/* Item */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                              itemType === 'IMAGE' ? 'bg-blue-500/15 text-blue-400' :
                              itemType === 'VIDEO' ? 'bg-purple-500/15 text-purple-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {itemType === 'IMAGE' ? (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[160px] truncate font-semibold text-gray-200 text-sm" title={itemName}>{itemName}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mt-0.5">{itemType}</p>
                            </div>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="px-5 py-3.5">
                          <span className="max-w-[140px] truncate block text-sm text-gray-300" title={projName}>{projName}</span>
                        </td>

                        {/* Annotator */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: stringToColor(annotName) }}
                              title={annotName}
                            >
                              {getInitials(annotName)}
                            </div>
                            <span className="max-w-[110px] truncate text-sm text-gray-300" title={annotName}>{annotName}</span>
                          </div>
                        </td>

                        {/* Decision */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                            isApproved
                              ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/12 text-rose-400 border-rose-500/30'
                          }`}>
                            {isApproved ? (
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </td>

                        {/* Feedback */}
                        <td className="px-5 py-3.5 max-w-[180px]">
                          {feedback ? (
                            <span className="text-xs text-gray-400 line-clamp-1" title={feedback}>
                              {feedback.length > 45 ? feedback.slice(0, 45) + '…' : feedback}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-700">—</span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-xs text-gray-400">{fmtShortDate(reviewTime)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5" title={fmtFullDate(reviewTime)}>
                            {new Date(reviewTime).toLocaleDateString('vi-VN', { weekday: 'short' })}
                          </p>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleViewDetail(t)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/8 px-3.5 py-1.5 text-xs font-semibold text-violet-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-violet-500/18 hover:border-violet-400/50"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Xem lại
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalItems > 0 && (
          <div className="flex flex-col items-center gap-3 pb-2">
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => handlePageChange(1)} disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xs text-gray-400 transition-all hover:border-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed">
                  «
                </button>
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xs text-gray-400 transition-all hover:border-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed">
                  ‹
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1
                    : currentPage <= 3 ? i + 1
                    : currentPage >= totalPages - 2 ? totalPages - 4 + i
                    : currentPage - 2 + i;
                  return (
                    <button key={p} onClick={() => handlePageChange(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-semibold transition-all ${
                        p === currentPage
                          ? 'border-violet-500/60 bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-white'
                      }`}>
                      {p}
                    </button>
                  );
                })}

                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xs text-gray-400 transition-all hover:border-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed">
                  ›
                </button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xs text-gray-400 transition-all hover:border-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed">
                  »
                </button>
              </div>
            )}
            <p className="text-xs text-gray-600">
              Hiển thị {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalItems)} / {totalItems} bản ghi
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReviewerHistory;

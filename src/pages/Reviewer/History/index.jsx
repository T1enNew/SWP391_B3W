import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getAuthToken, stringToColor } from '../../../utils/reviewerUtils';

const fmtShortDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getFileType = (filename) => {
  if (!filename) return '';
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image', webp: 'image', svg: 'image',
    mp3: 'audio', wav: 'audio', ogg: 'audio',
    mp4: 'video', mov: 'video', avi: 'video',
    txt: 'text', csv: 'text', json: 'text',
  };
  return map[ext] || 'file';
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const PAGE_SIZE = 10;

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
        setError(err.response?.data?.message || 'Khong tai duoc du lieu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
        return pid === projectFilter;
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

  const handlePageChange = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleViewDetail = (task) => {
    const pid = task.project?.id || task.projectId?.id || task.projectId;
    window.location.href = '/reviewer/workspace/' + pid + '?taskId=' + task.id;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-7xl space-y-5">

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h1 className="text-xl font-bold text-gray-100">Lich su cham bai</h1>
          <p className="mt-1 text-sm text-gray-400">Xem lai cac quyet dinh da cham</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-700/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tat ca', value: total, filter: 'all', active: decisionFilter === 'all' && projectFilter === 'all', cls: 'border-gray-700 bg-gray-800', valCls: 'text-gray-100' },
            { label: 'Approved', value: approvedCount, filter: 'approved', active: decisionFilter === 'approved', cls: 'border-emerald-700/30 bg-emerald-500/5', valCls: 'text-emerald-400' },
            { label: 'Rejected', value: rejectedCount, filter: 'rejected', active: decisionFilter === 'rejected', cls: 'border-rose-700/30 bg-rose-500/5', valCls: 'text-rose-400' },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => { setDecisionFilter(card.filter); setProjectFilter('all'); setPage(1); }}
              className={`rounded-xl border p-4 text-center cursor-pointer transition-all ${card.active ? 'ring-2 ring-violet-500/50' : ''} ${card.cls}`}
            >
              <p className={`text-2xl font-bold ${card.valCls}`}>{card.value}</p>
              <p className="mt-1 text-xs text-gray-400">{card.label}</p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" placeholder="Tim item, annotator, project..."
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            <select
              value={decisionFilter} onChange={(e) => { setDecisionFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="all">Tat ca trang thai</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="all">Tat ca project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select
              value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="newest">Moi nhat</option>
              <option value="oldest">Cu nhat</option>
            </select>

            {(search || decisionFilter !== 'all' || projectFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setDecisionFilter('all'); setProjectFilter('all'); setPage(1); }}
                className="rounded-lg border border-gray-600 px-3 py-2 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all"
              >
                Xoa loc
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 text-sm">Khong co lich su cham bai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Annotator</th>
                    <th className="px-4 py-3 text-left">Quyet dinh</th>
                    <th className="px-4 py-3 text-left">Feedback</th>
                    <th className="px-4 py-3 text-left">Thoi gian</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t, idx) => {
                    const di        = t.dataItem || t.data_item || {};
                    const itemName  = di.filename || di.originalName || di.original_name || t.id || 'Unknown';
                    const itemType  = getFileType(itemName);
                    const annotName = t.annotator?.full_name || t.annotator?.fullName || t.annotator?.username || 'Unknown';
                    const projName  = t.project?.name || t.projectId?.name || '-';
                    const isApproved = t.status === 'approved';
                    const feedback  = t.review_comments || t.reviewComments;
                    const reviewTime = t.reviewed_at || t.reviewedAt || t.submitted_at;

                    return (
                      <tr key={t.id} className={`border-t border-gray-700/50 transition-colors hover:bg-gray-800/40 ${idx % 2 === 0 ? 'bg-gray-800/20' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-200 text-sm max-w-[180px] truncate" title={itemName}>{itemName}</p>
                          {itemType && <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{itemType}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-300 text-sm">{projName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: stringToColor(annotName) }}
                              title={annotName}
                            >
                              {getInitials(annotName)}
                            </div>
                            <span className="text-gray-300 text-sm truncate max-w-[120px]" title={annotName}>{annotName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isApproved
                              ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            }
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          {feedback
                            ? <span className="text-gray-400 text-xs line-clamp-1" title={feedback}>{feedback.length > 40 ? feedback.slice(0, 40) + '...' : feedback}</span>
                            : <span className="text-gray-600 text-xs">-</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-400 text-xs">{fmtShortDate(reviewTime)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleViewDetail(t)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/20 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Xem lai
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

        {totalItems > 0 && (
          <>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button onClick={() => handlePageChange(1)} disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-all">&laquo;</button>
                <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-all">&lsaquo;</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                  return (
                    <button key={p} onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 rounded-lg border text-xs font-medium transition-all ${p === currentPage ? 'border-violet-500/50 bg-violet-600 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-all">&rsaquo;</button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-all">&raquo;</button>
              </div>
            )}
            <p className="text-center text-xs text-gray-500">
              Hien thi {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalItems)} / {totalItems} ban ghi
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewerHistory;

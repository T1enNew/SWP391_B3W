import React, { useState } from 'react';
import { SUBMISSION_STATUS, FEEDBACK_CATEGORIES } from '../../../constants/reviewer';

const ReviewPanel = ({
  item,
  activeSubmission,
  submissions,
  visibleAnnotators,
  onAnnotatorToggle,
  onAnnotatorSelect,
  feedback,
  setFeedback,
  errorCategory,
  setErrorCategory,
  onApprove,
  onReject,
  onNextAnnotator,
  saving,
  isReadOnly,
}) => {
  const [rightTab, setRightTab] = useState('review');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllOverlay, setShowAllOverlay] = useState(true);

  // Lọc danh sách submissions theo từ khóa tìm kiếm tên annotator
  const filteredSubs = submissions.filter(
    sub => !searchQuery.trim() || (sub.annotatorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Bật/tắt hiển thị overlay tất cả annotators cùng lúc trên ảnh
  const handleToggleAll = () => {
    const next = !showAllOverlay;
    setShowAllOverlay(next);
    if (next) {
      submissions.forEach(s => { if (!visibleAnnotators.includes(s.annotatorId)) onAnnotatorToggle(s.annotatorId); });
    } else {
      [...visibleAnnotators].forEach(id => onAnnotatorToggle(id));
    }
  };

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 border-l border-gray-700">
        <p className="text-gray-500 text-xs">Chon item</p>
      </div>
    );
  }

  const TABS = [
    { key: 'review', label: 'Review' },
    { key: 'info',   label: 'Thong tin' },
    { key: 'guide',  label: 'Huong dan' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      <div className="flex border-b border-gray-700 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRightTab(tab.key)}
            className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-all border-b-2 ${
              rightTab === tab.key
                ? 'text-violet-400 border-violet-500 bg-violet-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {rightTab === 'review' && (
          <div className="flex flex-col h-full">
            <div className="p-2 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">
                  Annotator ({submissions.length})
                </h4>
                <button
                  onClick={handleToggleAll}
                  className={`ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all border ${
                    showAllOverlay
                      ? 'bg-violet-600/20 border-violet-500/40 text-violet-400'
                      : 'bg-gray-800 border-gray-700 text-gray-500'
                  }`}
                >
                  {showAllOverlay ? '☑' : '☐'} All overlay
                </button>
              </div>

              <div className="relative mb-2">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search annotator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded border border-gray-700 bg-gray-800 text-[11px] text-gray-300 pl-7 pr-2 py-1 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-0.5 max-h-[28vh] overflow-y-auto">
                {filteredSubs.map((sub) => {
                  const sc = SUBMISSION_STATUS[sub.status] || SUBMISSION_STATUS.pending;
                  const isActive  = sub.annotatorId === activeSubmission?.annotatorId;
                  const isVisible = visibleAnnotators.includes(sub.annotatorId);
                  return (
                    <div
                      key={sub.submissionId}
                      onClick={() => onAnnotatorSelect(sub)}
                      className={`group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer transition-all border ${
                        isActive ? 'bg-violet-600/15 border-violet-500/50' : 'border-transparent hover:bg-gray-800/60'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color || '#3b82f6' }} />
                      <span className={`text-[11px] font-medium truncate flex-1 ${isActive ? 'text-violet-300' : 'text-gray-300 group-hover:text-gray-100'}`}>
                        {sub.annotatorName || 'Annotator'}
                      </span>
                      <span className={`shrink-0 rounded-full px-1 py-0.5 text-[9px] font-semibold ${sc.color} text-white`}>
                        {sc.label}
                      </span>
                      <label onClick={(e) => e.stopPropagation()} className="shrink-0 cursor-pointer" title="Hien thi overlay">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => onAnnotatorToggle(sub.annotatorId)}
                          className="w-3 h-3 rounded accent-violet-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <p className="text-[11px] text-gray-500 text-center py-2">Khong tim thay</p>
                )}
              </div>
            </div>

            {activeSubmission ? (
              <div className="p-2 space-y-2 flex-shrink-0">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/60 border border-gray-700/50">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeSubmission.color || '#3b82f6' }} />
                  <span className="text-[11px] font-bold text-gray-200 flex-1 truncate">{activeSubmission.annotatorName}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${SUBMISSION_STATUS[activeSubmission.status]?.color || 'bg-gray-600'} text-white`}>
                    {SUBMISSION_STATUS[activeSubmission.status]?.label || activeSubmission.status}
                  </span>
                </div>

                {activeSubmission.feedback && (
                  <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2">
                    <p className="text-[9px] font-bold text-rose-400 mb-0.5">Feedback cu:</p>
                    <p className="text-[10px] text-rose-300 italic leading-snug">"{activeSubmission.feedback}"</p>
                  </div>
                )}

                {!isReadOnly && activeSubmission.status !== 'approved' && activeSubmission.status !== 'rejected' && (
                  <>
                    <select
                      value={errorCategory}
                      onChange={(e) => setErrorCategory(e.target.value)}
                      className="w-full rounded border border-gray-700 bg-gray-800 text-[11px] text-gray-300 px-2 py-1.5 focus:outline-none focus:border-violet-500/50"
                    >
                      <option value="">-- Loai loi (neu reject) --</option>
                      {FEEDBACK_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>

                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Nhap feedback..."
                      rows={2}
                      className="w-full rounded border border-gray-700 bg-gray-800 text-[11px] text-gray-200 px-2 py-1.5 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
                    />

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onApprove(activeSubmission)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(activeSubmission)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1 rounded bg-rose-600 hover:bg-rose-700 text-white px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>

                    {submissions.filter(s => s.status === 'pending').length > 1 && (
                      <button
                        onClick={onNextAnnotator}
                        disabled={saving}
                        className="w-full rounded border border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-300 px-2 py-1 text-[10px] font-medium transition-all disabled:opacity-50"
                      >
                        Chuyen annotator tiep
                      </button>
                    )}
                  </>
                )}

                {activeSubmission.status === 'approved' && (
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                    <p className="text-[11px] text-emerald-400 font-semibold">Da approved</p>
                  </div>
                )}
                {activeSubmission.status === 'rejected' && (
                  <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-center">
                    <p className="text-[11px] text-rose-400 font-semibold">Da rejected</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-[11px] text-gray-500">Chon annotator de review</p>
              </div>
            )}
          </div>
        )}

        {rightTab === 'info' && (
          <div className="p-2 space-y-2">
            {item.projectName && (
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Project</p>
                <p className="text-[11px] text-gray-200">{item.projectName}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">File</p>
              <p className="text-[11px] text-gray-300 break-all">{item.filename || 'Unknown'}</p>
            </div>
          </div>
        )}

        {rightTab === 'guide' && (
          <div className="p-2">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Guideline</p>
            {item.guideline ? (
              <p className="text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed">{item.guideline}</p>
            ) : (
              <p className="text-[11px] text-gray-500 italic">Khong co guideline.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPanel;

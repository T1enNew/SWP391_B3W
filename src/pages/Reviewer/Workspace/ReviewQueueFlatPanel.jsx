import React from 'react';
import { ITEM_STATUS } from '../../../constants/reviewer';

const ReviewQueueFlatPanel = ({ items, currentItemId, onSelect, onQuickApprove, onQuickReject }) => (
  <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
    <div className="p-3 border-b border-gray-700 shrink-0">
      <h3 className="text-sm font-bold text-gray-200">Review Queue</h3>
      <p className="text-xs text-gray-500 mt-0.5">
        {items.length} item &mdash;{' '}
        {items.filter(i => i.status === 'pending_review' || i.status === 'partially_reviewed').length} cần review
      </p>
    </div>
    <div className="flex-1 overflow-y-auto">
      {items.map((item) => {
        const cfg = ITEM_STATUS[item.status] || ITEM_STATUS.pending_review;
        const isActive = item.itemId === currentItemId;
        return (
          <div
            key={item.itemId}
            onClick={() => onSelect(item)}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 ${
              isActive
                ? 'bg-violet-600/15 border-violet-500'
                : 'border-transparent hover:bg-gray-800/60 hover:border-gray-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${
                item.status === 'waiting_rework' ? 'animate-pulse' : ''
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium truncate ${isActive ? 'text-violet-300' : 'text-gray-300'}`}>
                {item.filename || item.itemId?.slice(-8) || 'Item'}
              </p>
              <p className="text-[10px] text-gray-500">{item.submissions?.length || 0} subs</p>
            </div>
            <div className="flex items-center gap-1">
              {(item.submissions || []).slice(0, 4).map((sub) => {
                const isApproved = sub.status === 'approved';
                const isRejected = sub.status === 'rejected';
                return (
                  <div key={sub.submissionId} className="flex items-center gap-0.5">
                    <button
                      title="Reject"
                      onClick={e => { e.stopPropagation(); onQuickReject?.(item, sub); }}
                      disabled={isRejected || isApproved}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold transition-all border ${
                        isRejected
                          ? 'bg-red-600/30 border-red-500/60 text-red-400 cursor-default'
                          : isApproved
                          ? 'bg-gray-800/40 border-gray-700/40 text-gray-600 cursor-default'
                          : 'bg-red-600/10 border-red-500/40 text-red-400 hover:bg-red-600/30 hover:border-red-500 cursor-pointer'
                      }`}
                    >
                      ✕
                    </button>
                    <button
                      title="Approve"
                      onClick={e => { e.stopPropagation(); onQuickApprove?.(item, sub); }}
                      disabled={isApproved || isRejected}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold transition-all border ${
                        isApproved
                          ? 'bg-green-600/30 border-green-500/60 text-green-400 cursor-default'
                          : isRejected
                          ? 'bg-gray-800/40 border-gray-700/40 text-gray-600 cursor-default'
                          : 'bg-green-600/10 border-green-500/40 text-green-400 hover:bg-green-600/30 hover:border-green-500 cursor-pointer'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                );
              })}
              {(item.submissions?.length || 0) > 4 && (
                <span className="text-[9px] text-gray-500 ml-0.5">+{item.submissions.length - 4}</span>
              )}
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-xs">Không có item</div>
      )}
    </div>
  </div>
);

export default ReviewQueueFlatPanel;

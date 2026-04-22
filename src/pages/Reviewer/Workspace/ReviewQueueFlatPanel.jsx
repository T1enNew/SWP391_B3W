import React from 'react';
import { ITEM_STATUS } from '../../../constants/reviewer';

const ReviewQueueFlatPanel = ({ items, currentItemId, onSelect }) => (
  <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
    <div className="p-3 border-b border-gray-700 shrink-0">
      <h3 className="text-sm font-bold text-gray-200">Review Queue</h3>
      <p className="text-xs text-gray-500 mt-0.5">
        {items.length} item &mdash;{' '}
        {items.filter(i => i.status === 'pending_review' || i.status === 'partially_reviewed').length} can review
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
            <div className="flex -space-x-1">
              {(item.submissions || []).slice(0, 4).map((sub) => (
                <span
                  key={sub.submissionId}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 text-white border border-gray-900"
                  style={{ backgroundColor: sub.color || '#3b82f6' }}
                >
                  {(sub.annotatorName || '?')[0].toUpperCase()}
                </span>
              ))}
              {(item.submissions?.length || 0) > 4 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-gray-700 text-gray-400 border border-gray-900">
                  +{item.submissions.length - 4}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-xs">Khong co item</div>
      )}
    </div>
  </div>
);

export default ReviewQueueFlatPanel;

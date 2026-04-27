import React from 'react';

/**
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.totalPages
 * @param {function} props.onChange
 * @param {number} props.totalItems
 * @param {number} props.pageSize
 * @param {string} [props.accentColor] - Tailwind active-page color classes, e.g. 'border-blue-500/50 bg-blue-600'
 */
const MiniPager = ({ page, totalPages, onChange, totalItems, pageSize, accentColor = 'border-blue-500/50 bg-blue-600' }) => {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-700/60 bg-gray-900/30">
      <span className="text-[11px] text-gray-500">{start}–{end} / {totalItems}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-xs"
        >‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-6 w-6 rounded border text-xs font-medium transition-all ${
              p === page
                ? `${accentColor} text-white`
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >{p}</button>
        ))}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-xs"
        >›</button>
      </div>
    </div>
  );
};

export default MiniPager;

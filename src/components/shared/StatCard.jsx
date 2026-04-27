import React from 'react';

const StatCard = ({ icon, label, value, sub, colorClass, bgClass, borderClass }) => (
  <div className={`rounded-2xl border p-5 flex items-center gap-4 ${bgClass} ${borderClass}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-100 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default StatCard;

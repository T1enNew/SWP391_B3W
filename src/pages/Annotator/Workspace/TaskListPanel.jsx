import React from 'react';
import { TASK_STATUS } from './constants';
import { getTaskKind } from './utils';

const TaskListPanel = ({ tasks, currentTaskId, onSelect, projectName }) => {
  const statusCounts = tasks.reduce((acc, t) => {
    const s = t.status || 'assigned';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const getStatusConfig = (status) => TASK_STATUS[status] || TASK_STATUS.assigned;

  const priorityOrder = ['rejected', 'revised', 'in_progress', 'assigned', 'completed', 'submitted', 'resubmitted', 'approved'];
  const sortedTasks = [...tasks].sort((a, b) => {
    const aP = priorityOrder.indexOf(a.status);
    const bP = priorityOrder.indexOf(b.status);
    if (aP !== bP) return aP - bP;
    return 0;
  });

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700 shrink-0">
        <h3 className="text-sm font-bold text-gray-200 mb-1">Danh sach Item</h3>
        <p className="text-xs text-gray-500 truncate">{projectName}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(statusCounts).map(([status, count]) => {
            const cfg = getStatusConfig(status);
            return (
              <span key={status} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color} ${cfg.textColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                {count} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedTasks.map((task, idx) => {
          const cfg = getStatusConfig(task.status);
          const isActive = task.id === currentTaskId;
          const filename = task.dataItem?.originalName || task.dataItem?.filename || `Item ${idx + 1}`;
          const kind = getTaskKind(task);
          return (
            <div
              key={task.id}
              onClick={() => onSelect(task.id)}
              className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-2 ${
                isActive ? 'bg-blue-600/15 border-blue-500' : 'border-transparent hover:bg-gray-800/60 hover:border-gray-600'
              }`}
            >
              {task.status === 'completed' ? (
                <span className="w-5 h-5 rounded-full shrink-0 bg-emerald-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotColor} ${task.status === 'rejected' ? 'animate-pulse' : ''}`} />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-300' : 'text-gray-300 group-hover:text-gray-100'}`}>{filename}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {kind === 'image' && 'Hinh anh'}
                  {kind === 'audio' && 'Audio'}
                  {kind === 'text' && 'Van ban'}
                  {kind === 'other' && 'File'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color} ${cfg.textColor}`}>{cfg.label}</span>
            </div>
          );
        })}
        {sortedTasks.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">Khong co item nao trong project nay</div>
        )}
      </div>
    </div>
  );
};

export default TaskListPanel;

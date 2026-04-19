import React, { useEffect, useState } from 'react';
import { api, extractList } from '../../lib/apiClient';
import { page, SectionTitle, EmptyState, StatusBadge } from '../_fixedShared';

export default function ReviewerHistory() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get('/api/reviews/reviewed?limit=200').then(({ data }) => setTasks(extractList(data))).catch(() => setTasks([])); }, []);
  return <div className={page}><SectionTitle title="Review History" subtitle="Các task bạn đã review." /><div className="space-y-3">{tasks.map((task) => <div key={task.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{task.data_item?.filename || task.id}</div><div className="mt-1 text-xs text-slate-400">{task.project?.name}</div></div><StatusBadge value={task.status} /></div></div>)}{tasks.length === 0 ? <EmptyState text="Bạn chưa review task nào." /> : null}</div></div>;
}

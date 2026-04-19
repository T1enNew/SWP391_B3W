import React, { useEffect, useState } from 'react';
import { api, extractList } from '../../lib/apiClient';
import { page, SectionTitle, EmptyState, StatusBadge } from '../_fixedShared';

export default function AnnotatorHistory() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get('/api/tasks/my-tasks?limit=200').then(({ data }) => setTasks(extractList(data).filter((t) => ['submitted', 'resubmitted', 'approved', 'rejected'].includes(t.status)))).catch(() => setTasks([])); }, []);
  return <div className={page}><SectionTitle title="Annotator History" subtitle="Các task đã submit hoặc đã được review." /><div className="space-y-3">{tasks.map((task) => <div key={task.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{task.data_item?.original_name || task.id}</div><div className="mt-1 text-xs text-slate-400">{task.project?.name}</div></div><StatusBadge value={task.status} /></div></div>)}{tasks.length === 0 ? <EmptyState text="Chưa có lịch sử task." /> : null}</div></div>;
}

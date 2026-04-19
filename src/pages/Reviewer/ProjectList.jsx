import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractList } from '../../lib/apiClient';
import { page, SectionTitle, EmptyState, pill } from '../_fixedShared';

export default function ReviewerProjectList() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get('/api/reviews/pending?limit=200').then(({ data }) => setTasks(extractList(data))).catch(() => setTasks([])); }, []);
  const grouped = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const key = task.project?.id || 'unknown';
      if (!map.has(key)) map.set(key, { project: task.project, tasks: [] });
      map.get(key).tasks.push(task);
    });
    return Array.from(map.values());
  }, [tasks]);
  return <div className={page}><SectionTitle title="Review Queue" subtitle="Các project đang có task chờ bạn review." /><div className="space-y-4">{grouped.map((group) => <button key={group.project?.id || 'unknown'} className="w-full rounded-2xl border border-slate-800 bg-slate-800/70 p-5 text-left hover:border-violet-500" onClick={() => navigate(`/reviewer/projects/${group.project?.id}`)}><div className="flex items-center justify-between"><div><div className="text-lg font-semibold">{group.project?.name || 'Unknown project'}</div><div className="mt-1 text-sm text-slate-400">{group.tasks.length} tasks pending</div></div><span className={pill}>Open</span></div></button>)}{grouped.length === 0 ? <EmptyState text="Không có task chờ review." /> : null}</div></div>;
}

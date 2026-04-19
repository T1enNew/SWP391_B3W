import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, extractList } from '../../lib/apiClient';
import { page, SectionTitle, EmptyState, StatusBadge, buttonSecondary } from '../_fixedShared';

export default function ReviewerProjectDetail() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get(`/api/reviews/pending?project_id=${projectId}&limit=200`).then(({ data }) => setTasks(extractList(data))).catch(() => setTasks([])); }, [projectId]);
  return <div className={page}><SectionTitle title="Project Review Tasks" subtitle="Mở từng task để approve hoặc reject." right={<Link className={buttonSecondary} to="/reviewer/tasks">Back</Link>} /><div className="space-y-3">{tasks.map((task) => <Link key={task.id} className="block rounded-xl border border-slate-700 bg-slate-800/70 p-4 hover:border-violet-500" to={`/reviewer/tasks/${task.id}`}><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{task.data_item?.filename || task.id}</div><div className="mt-1 text-xs text-slate-400">Annotator: {task.annotator?.full_name || task.annotator?.username || '—'}</div></div><StatusBadge value={task.status} /></div></Link>)}{tasks.length === 0 ? <EmptyState text="Project này hiện không có task chờ review." /> : null}</div></div>;
}

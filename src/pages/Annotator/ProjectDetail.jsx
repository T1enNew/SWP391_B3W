import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, extractList } from '../../lib/apiClient';
import { page, SectionTitle, EmptyState, StatusBadge, buttonSecondary } from '../_fixedShared';

export default function AnnotatorProjectDetail() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get(`/api/tasks/my-tasks?project_id=${projectId}&limit=200`).then(({ data }) => setTasks(extractList(data))).catch(() => setTasks([])); }, [projectId]);
  return <div className={page}><SectionTitle title="Project Tasks" subtitle="Mở từng task để annotate và submit." right={<Link className={buttonSecondary} to="/annotator/tasks">Back</Link>} /><div className="space-y-3">{tasks.map((task) => <Link key={task.id} className="block rounded-xl border border-slate-700 bg-slate-800/70 p-4 hover:border-blue-500" to={`/annotator/workspace/${task.id}`}><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{task.data_item?.original_name || task.data_item?.filename || task.id}</div><div className="mt-1 text-xs text-slate-400">{task.project?.name} • {task.data_item?.mime_type || 'file'}</div></div><StatusBadge value={task.status} /></div></Link>)}{tasks.length === 0 ? <EmptyState text="Project này chưa có task cho bạn." /> : null}</div></div>;
}

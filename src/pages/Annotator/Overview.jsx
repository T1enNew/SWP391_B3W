import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extractList } from '../../lib/apiClient';
import { page, card, button, SectionTitle } from '../_fixedShared';

export default function AnnotatorOverview() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get('/api/tasks/my-tasks?limit=200').then(({ data }) => setTasks(extractList(data))).catch(() => setTasks([])); }, []);
  const counts = {
    assigned: tasks.filter((t) => t.status === 'assigned').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    submitted: tasks.filter((t) => t.status === 'submitted' || t.status === 'resubmitted').length,
    approved: tasks.filter((t) => t.status === 'approved').length,
    rejected: tasks.filter((t) => t.status === 'rejected').length,
  };
  return <div className={page}><SectionTitle title="Annotator Dashboard" subtitle="Task của bạn lấy trực tiếp từ /api/tasks/my-tasks." right={<Link className={button} to="/annotator/tasks">Mở danh sách task</Link>} /><div className="grid gap-4 md:grid-cols-5">{Object.entries(counts).map(([k, v]) => <div key={k} className={card}><div className="text-sm text-slate-400">{k}</div><div className="mt-2 text-3xl font-bold">{v}</div></div>)}</div></div>;
}

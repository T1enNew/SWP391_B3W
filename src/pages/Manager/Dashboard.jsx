import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extractList } from '../../lib/apiClient';
import { page, card, button, buttonSecondary, smallButton, SectionTitle } from '../_fixedShared';

export default function ManagerDashboard() {
  const [summary, setSummary] = useState({ topics: 0, subtopics: 0, datasets: 0, projects: 0, pendingReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [topicsRes, datasetsRes, projectsRes] = await Promise.all([
          api.get('/api/topics/taxonomy'),
          api.get('/api/datasets?limit=100'),
          api.get('/api/projects?limit=100'),
        ]);
        const taxonomy = extractList(topicsRes.data);
        const datasets = extractList(datasetsRes.data);
        const projects = extractList(projectsRes.data);
        setSummary({
          topics: taxonomy.length,
          subtopics: taxonomy.reduce((sum, t) => sum + (t.subtopics?.length || 0), 0),
          datasets: datasets.length,
          projects: projects.length,
          pendingReviews: projects.reduce((sum, p) => sum + (p.reviewed_tasks ? Math.max((p.total_tasks || 0) - p.reviewed_tasks, 0) : 0), 0),
        });
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className={page}>
      <SectionTitle title="Manager Dashboard" subtitle="Tóm tắt nhanh taxonomy, datasets và projects theo backend hiện tại." right={<div className="flex gap-2"><Link className={buttonSecondary} to="/manager/topics">Topics</Link><Link className={button} to="/manager/projects/create">Create project</Link></div>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[['Topics',summary.topics],['Subtopics',summary.subtopics],['Datasets',summary.datasets],['Projects',summary.projects],['Pending review',summary.pendingReviews]].map(([label,value]) => (
          <div key={label} className={card}><div className="text-sm text-slate-400">{label}</div><div className="mt-3 text-3xl font-bold">{loading ? '…' : value}</div></div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={card}><h2 className="mb-2 text-lg font-semibold">Flow đang dùng</h2><p className="text-sm text-slate-300">Topic → Subtopic → Label Set → Dataset → Project → Task Assignment/Review.</p></div>
        <div className={card}><h2 className="mb-2 text-lg font-semibold">Manager actions</h2><div className="flex flex-wrap gap-2"><Link className={smallButton} to="/manager/topics">Quản lý taxonomy</Link><Link className={smallButton} to="/manager/datasets">Quản lý datasets</Link><Link className={smallButton} to="/manager/projects">Quản lý projects</Link></div></div>
        <div className={card}><h2 className="mb-2 text-lg font-semibold">Lưu ý</h2><p className="text-sm text-slate-400">Các màn đã được rút gọn để bám đúng endpoint hiện có của BE, tránh crash do mismatch field/route.</p></div>
      </div>
    </div>
  );
}

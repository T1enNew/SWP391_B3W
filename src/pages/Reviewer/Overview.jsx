import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, extractList } from '../../lib/apiClient';
import { page, card, button, SectionTitle } from '../_fixedShared';

export default function ReviewerOverview() {
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    Promise.all([api.get('/api/reviews/pending?limit=200'), api.get('/api/reviews/stats')])
      .then(([pendingRes, statsRes]) => { setPending(extractList(pendingRes.data)); setStats(statsRes.data); })
      .catch(() => { setPending([]); setStats(null); });
  }, []);
  const statusCounts = stats?.status_counts || {};
  return <div className={page}><SectionTitle title="Reviewer Dashboard" subtitle="Pending reviews và thống kê review của bạn." right={<Link className={button} to="/reviewer/tasks">Mở review queue</Link>} /><div className="grid gap-4 md:grid-cols-5">{[['Pending', pending.length], ['Submitted', statusCounts.submitted || 0], ['Resubmitted', statusCounts.resubmitted || 0], ['Approved', statusCounts.approved || 0], ['Rejected', statusCounts.rejected || 0]].map(([label, value]) => <div key={label} className={card}><div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>)}</div></div>;
}

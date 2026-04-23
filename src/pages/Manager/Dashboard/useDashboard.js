import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../config/api';

const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token') || '';

export function useDashboard() {
  const [loading, setLoading]     = useState(true);
  const [datasets, setDatasets]   = useState([]);
  const [projects, setProjects]   = useState([]);
  const [statusList, setStatusList] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [datasetsRes, projectsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/datasets`, { headers }),
          axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers }),
        ]);

        const dsList = datasetsRes.status === 'fulfilled'
          ? (Array.isArray(datasetsRes.value.data) ? datasetsRes.value.data : datasetsRes.value.data?.data || [])
          : [];

        const pjList = projectsRes.status === 'fulfilled'
          ? (Array.isArray(projectsRes.value.data) ? projectsRes.value.data : projectsRes.value.data?.data || projectsRes.value.data?.projects || [])
          : [];

        setDatasets(dsList);
        setProjects(pjList);

        const taskResults = await Promise.allSettled(
          pjList.map(p => axios.get(`${API_URL}/api/tasks/project/${p._id || p.id}`, { headers }))
        );

        const syntheticStatuses = dsList.map(ds => {
          const dsId = ds._id || ds.id;
          const linkedProjects = pjList.filter(p => {
            const did = p.dataset?.id || p.dataset?._id || p.dataset_id || p.datasetId;
            return did === dsId;
          });

          let totalRaw = ds.total_items || ds.totalItems || 0;
          const counts = { approved: 0, submitted: 0, rejected: 0, pendingAnnotation: 0 };

          linkedProjects.forEach(p => {
            const pidx = pjList.indexOf(p);
            const taskRes = taskResults[pidx];
            if (taskRes?.status !== 'fulfilled') return;
            const tasks = Array.isArray(taskRes.value.data)
              ? taskRes.value.data
              : taskRes.value.data?.data || taskRes.value.data?.tasks || [];
            tasks.forEach(t => {
              if (t.status === 'approved')        counts.approved++;
              else if (t.status === 'submitted')  counts.submitted++;
              else if (t.status === 'rejected')   counts.rejected++;
              else                                counts.pendingAnnotation++;
            });
            if (!totalRaw) totalRaw = tasks.length;
          });

          return {
            datasetId: dsId, datasetName: ds.name || 'Unnamed dataset',
            datasetType: ds.type || 'image', totalRawItems: totalRaw,
            counts, votes: {}, finalItems: [], annotators: [],
          };
        });

        setStatusList(syntheticStatuses);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
        setDatasets([]); setProjects([]); setStatusList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const stats = useMemo(() => {
    const totalDatasets  = datasets.length;
    const totalProjects  = projects.length;
    let totalRawItems    = 0, totalApproved   = 0, totalPending    = 0;
    let totalRejected    = 0, totalSubmitted  = 0, approveVotes    = 0, rejectVotes = 0;

    const labelMap = {}, annotatorMap = {};

    statusList.forEach(s => {
      totalRawItems  += s.totalRawItems || 0;
      totalApproved  += s.counts?.approved || 0;
      totalPending   += s.counts?.pendingAnnotation || 0;
      totalRejected  += s.counts?.rejected || 0;
      totalSubmitted += s.counts?.submitted || 0;
      approveVotes   += s.votes?.approveVotes || 0;
      rejectVotes    += s.votes?.rejectVotes  || 0;

      (s.finalItems || []).forEach(item => {
        const buckets = [
          ...(Array.isArray(item?.labels?.objects)  ? item.labels.objects  : []),
          ...(Array.isArray(item?.labels?.spans)    ? item.labels.spans    : []),
          ...(Array.isArray(item?.labels?.segments) ? item.labels.segments : []),
        ];
        buckets.forEach(x => {
          const key = (typeof x === 'string' && x) || x?.label || x?.text || x?.name || 'unknown';
          labelMap[key] = (labelMap[key] || 0) + 1;
        });
      });

      (s.annotators || []).forEach(a => {
        const key = a.annotatorId || a.annotatorName || 'unknown';
        if (!annotatorMap[key])
          annotatorMap[key] = { name: a.annotatorName || 'Unknown', total: 0, approved: 0, rejected: 0, pending: 0 };
        annotatorMap[key].total    += a.total    || 0;
        annotatorMap[key].approved += a.approved || 0;
        annotatorMap[key].rejected += a.rejected || 0;
        annotatorMap[key].pending  += a.pending  || 0;
      });
    });

    const reviewed       = approveVotes + rejectVotes;
    const approvalRate   = reviewed > 0  ? Math.round((approveVotes   / reviewed)       * 100) : 0;
    const completionRate = totalRawItems > 0 ? Math.round((totalApproved / totalRawItems) * 100) : 0;
    const topLabels      = Object.entries(labelMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topAnnotators  = Object.values(annotatorMap)
      .map(a => ({ ...a, passRate: a.approved + a.rejected > 0 ? Math.round((a.approved / (a.approved + a.rejected)) * 100) : 0 }))
      .sort((a, b) => b.approved - a.approved).slice(0, 5);

    const datasetHealth = statusList.map(s => {
      const raw = s.totalRawItems || 0;
      const { approved = 0, submitted = 0, rejected = 0, pendingAnnotation = 0 } = s.counts || {};
      const progress = raw > 0 ? Math.round((approved / raw) * 100) : 0;
      let state = 'Not started', stateColor = '#94a3b8', stateBg = 'rgba(148,163,184,0.12)';
      if (approved > 0 && progress >= 100)  { state = 'Ready';      stateColor = '#22c55e'; stateBg = 'rgba(34,197,94,0.12)'; }
      else if (submitted > 0)               { state = 'Reviewing';  stateColor = '#f59e0b'; stateBg = 'rgba(245,158,11,0.12)'; }
      else if (pendingAnnotation > 0 || rejected > 0) { state = 'Annotating'; stateColor = '#3b82f6'; stateBg = 'rgba(59,130,246,0.12)'; }
      return { id: s.datasetId, name: s.datasetName, type: s.datasetType, raw, approved, submitted, pendingAnnotation, rejected, progress, state, stateColor, stateBg };
    });

    return {
      totalDatasets, totalProjects, totalRawItems, totalApproved, totalPending,
      totalRejected, totalSubmitted, approvalRate, completionRate,
      topLabels, topAnnotators, datasetHealth,
      pipeline: { raw: totalRawItems, annotating: totalPending + totalRejected, reviewing: totalSubmitted, approved: totalApproved, rework: totalRejected },
    };
  }, [datasets, projects, statusList]);

  return { loading, stats };
}

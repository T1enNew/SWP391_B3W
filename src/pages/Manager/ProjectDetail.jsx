import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeProject = (p) => ({
  ...p,
  id: p?.id || p?._id,
  name: p?.name || 'Untitled Project',
  description: p?.description || '',
  guidelines: p?.guidelines || '',
  status: p?.status || 'draft',
  total_tasks: p?.total_tasks || p?.totalTasks || 0,
  dataset: p?.dataset || null,
  members: Array.isArray(p?.members) ? p.members : [],
  deadline: p?.deadline || null,
});

const normalizeTask = (t) => ({
  ...t,
  id: t?.id || t?._id,
  status: t?.status || 'assigned',
  annotatorName: t?.annotator?.full_name || t?.annotator?.fullName || t?.annotator?.username || t?.annotatorId?.fullName || t?.annotatorId?.username || 'Annotator',
  reviewerName: t?.reviewer?.full_name || t?.reviewer?.fullName || t?.reviewer?.username || '',
  itemName: t?.data_item?.original_name || t?.data_item?.filename || t?.dataItem?.originalName || t?.dataItem?.filename || 'Item',
});

const getAssetUrl = (asset) => {
  if (asset?.signed_url) return asset.signed_url;
  if (asset?.storage_url && /^https?:/i.test(asset.storage_url)) return asset.storage_url;
  if (asset?.storage_url) return `${API_URL.replace(/\/+$/, '')}/${String(asset.storage_url).replace(/^\/+/, '')}`;
  if (asset?.filename) return `${API_URL.replace(/\/+$/, '')}/uploads/datasets/${asset.filename}`;
  return '';
};

export default function ManagerProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [datasetDetail, setDatasetDetail] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  const [assetsBySubtopic, setAssetsBySubtopic] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const projectRes = await axios.get(`${API_URL}/api/projects/${id}`, { headers: getAuthHeaders() });
      const fullProject = normalizeProject(projectRes.data?.project || projectRes.data || {});
      setProject(fullProject);

      let loadedTasks = [];
      try {
        const taskRes = await axios.get(`${API_URL}/api/tasks/my-tasks`, { params: { project_id: id, limit: 1000 }, headers: getAuthHeaders() });
        loadedTasks = getArray(taskRes.data?.data || taskRes.data).map(normalizeTask);
      } catch {
        loadedTasks = [];
      }
      setTasks(loadedTasks);

      const datasetId = fullProject?.dataset?.id || fullProject?.dataset_id || null;
      if (datasetId) {
        const dsRes = await axios.get(`${API_URL}/api/datasets/${datasetId}`, { headers: getAuthHeaders() });
        const ds = dsRes.data || {};
        setDatasetDetail(ds);
        const ids = Array.isArray(ds.subtopicIds) ? ds.subtopicIds : Array.isArray(ds.subtopic_ids) ? ds.subtopic_ids : ds.subtopicId ? [ds.subtopicId] : ds.subtopic_id ? [ds.subtopic_id] : [];
        const subRes = await Promise.all(ids.map(subId => axios.get(`${API_URL}/api/subtopics/${subId}`, { headers: getAuthHeaders() }).catch(() => ({ data: null }))));
        const loadedSubs = subRes.map(r => r.data).filter(Boolean);
        setSubtopics(loadedSubs);

        const assetPairs = await Promise.all(ids.map(async (subId) => {
          try {
            const res = await axios.get(`${API_URL}/api/subtopics/${subId}/assets`, { headers: getAuthHeaders() });
            return [String(subId), getArray(res.data)];
          } catch {
            return [String(subId), []];
          }
        }));
        setAssetsBySubtopic(Object.fromEntries(assetPairs));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const groupedByAnnotator = useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      const key = task.annotatorName;
      if (!map.has(key)) map.set(key, { name: key, total: 0, approved: 0, submitted: 0, rejected: 0 });
      const item = map.get(key);
      item.total += 1;
      if (task.status === 'approved') item.approved += 1;
      else if (task.status === 'submitted') item.submitted += 1;
      else if (task.status === 'rejected') item.rejected += 1;
    });
    return Array.from(map.values());
  }, [tasks]);

  const statusColor = { draft: '#64748b', active: '#22c55e', completed: '#3b82f6', archived: '#f59e0b' }[project?.status] || '#94a3b8';

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton sx={{ color: '#e2e8f0' }} onClick={() => navigate('/manager/projects')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" fontWeight={700}>{project?.name || 'Project'}</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}><CardContent><Typography variant="body2">Team members</Typography><Typography variant="h4" fontWeight={700}>{project?.members?.length || groupedByAnnotator.length}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}><CardContent><Typography variant="body2">Tasks</Typography><Typography variant="h4" fontWeight={700}>{tasks.length || project?.total_tasks || 0}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}><CardContent><Typography variant="body2">Dataset</Typography><Typography fontWeight={700}>{project?.dataset?.name || datasetDetail?.name || 'N/A'}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}><CardContent><Typography variant="body2">Status</Typography><Chip label={project?.status || 'draft'} sx={{ mt: 1, bgcolor: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}` }} /></CardContent></Card></Grid>
          </Grid>
          <Typography sx={{ mt: 2, color: '#94a3b8' }}>{project?.description || 'Không có mô tả'}</Typography>
          <Typography sx={{ mt: 1, color: '#cbd5e1' }}>Deadline: {project?.deadline ? new Date(project.deadline).toLocaleString('vi-VN') : 'N/A'}</Typography>
          {project?.guidelines ? <Typography sx={{ mt: 1, color: '#93c5fd' }}>Guidelines: {project.guidelines}</Typography> : null}
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: '#334155', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none' }, '& .Mui-selected': { color: '#3b82f6' }, '& .MuiTabs-indicator': { bgcolor: '#3b82f6' } }}>
          <Tab label="Overview" />
          <Tab label="Items" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}><CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Annotator performance</Typography>
              {groupedByAnnotator.length === 0 ? <Typography sx={{ color: '#94a3b8' }}>Chưa có task</Typography> : groupedByAnnotator.map(row => (
                <Box key={row.name} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#0f172a', border: '1px solid #334155' }}>
                  <Typography fontWeight={700}>{row.name}</Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Total: {row.total} • Approved: {row.approved} • Submitted: {row.submitted} • Rejected: {row.rejected}</Typography>
                </Box>
              ))}
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}><CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Subtopics in dataset</Typography>
              {subtopics.length === 0 ? <Typography sx={{ color: '#94a3b8' }}>Dataset chưa có subtopic</Typography> : subtopics.map(sub => (
                <Box key={sub.id || sub._id} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#0f172a', border: '1px solid #334155' }}>
                  <Typography fontWeight={700}>{sub.name}</Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Assets: {(assetsBySubtopic[String(sub.id || sub._id)] || []).length}</Typography>
                </Box>
              ))}
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {subtopics.map(sub => {
            const subId = String(sub.id || sub._id);
            const assets = assetsBySubtopic[subId] || [];
            return (
              <Grid item xs={12} key={subId}>
                <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{sub.name}</Typography>
                    {assets.length === 0 ? <Typography sx={{ color: '#94a3b8' }}>Không có asset</Typography> : (
                      <Grid container spacing={1.5}>
                        {assets.map(asset => (
                          <Grid item xs={6} sm={4} md={3} lg={2} key={asset.id || asset._id}>
                            <Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}>
                              <Box sx={{ position: 'relative', pt: '75%', bgcolor: '#111827' }}>
                                {getAssetUrl(asset) ? <Box component="img" src={getAssetUrl(asset)} alt={asset.original_name || asset.filename || 'asset'} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                              </Box>
                              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="caption" sx={{ display: 'block', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.original_name || asset.filename || 'asset'}</Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

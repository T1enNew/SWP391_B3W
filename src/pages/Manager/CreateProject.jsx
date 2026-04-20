import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#0f172a',
    color: '#e2e8f0',
    borderRadius: '10px',
    '& fieldset': { borderColor: '#475569' },
    '&:hover fieldset': { borderColor: '#64748b' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
  },
  '& .MuiInputLabel-root': { color: '#94a3b8' },
};

const normalizeId = (v) => typeof v === 'string' ? v : v?.id || v?._id || v?.user_id || v?.dataset_id || null;
const normalizeDataset = (d) => ({ ...d, id: d?.id || d?._id, name: d?.name || 'Dataset', project_id: d?.project_id || null });
const normalizeUser = (u) => ({ ...u, id: u?.id || u?._id || u?.user_id, fullName: u?.fullName || u?.full_name || u?.username || u?.email || 'User', is_active: u?.is_active ?? true });

export default function CreateProject() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [annotatorSearch, setAnnotatorSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', guidelines: '', deadline: '', exportFormat: 'JSON',
    reviewPolicy: { mode: 'full', sampleRate: 1, reviewersPerItem: 1 },
  });
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const loadData = async () => {
    setLoading(true);
    try {
      const [datasetRes, userRes] = await Promise.all([
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/users`, { headers: getAuthHeaders() }),
      ]);
      const ds = getArray(datasetRes.data).map(normalizeDataset).filter(d => !d.project_id);
      const users = getArray(userRes.data).map(normalizeUser);
      setDatasets(ds);
      setAnnotators(users.filter(u => String(u.role).toLowerCase() === 'annotator' && u.is_active));
      setReviewers(users.filter(u => String(u.role).toLowerCase() === 'reviewer' && u.is_active));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredAnnotators = useMemo(() => {
    const q = annotatorSearch.toLowerCase().trim();
    return annotators.filter(u => !q || u.fullName.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [annotators, annotatorSearch]);
  const filteredReviewers = useMemo(() => {
    const q = reviewerSearch.toLowerCase().trim();
    return reviewers.filter(u => !q || u.fullName.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [reviewers, reviewerSearch]);

  const extractDataItemIds = async (datasetId) => {
    const dsRes = await axios.get(`${API_URL}/api/datasets/${datasetId}`, { headers: getAuthHeaders() });
    const dsData = dsRes.data || {};
    let rawItems = dsData.data_items || dsData.items || dsData.assets || dsData.lib_data_item_list || dsData.data || [];
    if (!Array.isArray(rawItems) && Array.isArray(dsData)) rawItems = dsData;
    let ids = (Array.isArray(rawItems) ? rawItems : []).map(it => typeof it === 'string' ? it : it?.id || it?._id || it?.dataItemId || it?.assetId || null).filter(Boolean);
    if (!ids.length) {
      const subIds = Array.isArray(dsData.subtopicIds) ? dsData.subtopicIds : Array.isArray(dsData.subtopic_ids) ? dsData.subtopic_ids : dsData.subtopicId ? [dsData.subtopicId] : dsData.subtopic_id ? [dsData.subtopic_id] : [];
      for (const subId of subIds) {
        try {
          const assetRes = await axios.get(`${API_URL}/api/subtopics/${subId}/assets`, { headers: getAuthHeaders() });
          const assets = getArray(assetRes.data);
          ids.push(...assets.map(a => a?.id || a?._id || a?.assetId || a?.dataItemId || null).filter(Boolean));
        } catch {}
      }
    }
    return [...new Set(ids)];
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return showToast('Nhập tên project', 'warning');
    if (!formData.guidelines.trim()) return showToast('Nhập guidelines', 'warning');
    if (!selectedDatasetId) return showToast('Chọn dataset', 'warning');
    if (!selectedAnnotators.length) return showToast('Chọn annotator', 'warning');
    if (!selectedReviewers.length) return showToast('Chọn reviewer', 'warning');

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        guidelines: formData.guidelines.trim(),
        deadline: formData.deadline || undefined,
        export_format: formData.exportFormat || 'JSON',
        review_policy: {
          mode: formData.reviewPolicy.mode || 'full',
          sample_rate: Number(formData.reviewPolicy.sampleRate || 1),
          reviewers_per_item: Number(formData.reviewPolicy.reviewersPerItem || 1),
        },
        dataset_id: selectedDatasetId,
        annotator_ids: selectedAnnotators,
        reviewer_ids: selectedReviewers,
      };
      const res = await axios.post(`${API_URL}/api/projects`, payload, { headers: getAuthHeaders() });
      const normalizeId = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.id) return val.id;
  return null;
};

const handleCreateProject = async () => {
  try {
    const payload = {
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      guidelines: formData.guidelines?.trim() || '',
      deadline: formData.deadline
        ? new Date(formData.deadline).toISOString()
        : undefined,
      export_format: formData.exportFormat || 'JSON',
      review_policy: {
        mode: formData.reviewPolicy?.mode || 'full',
        sample_rate: Number(formData.reviewPolicy?.sampleRate || 1),
        reviewers_per_item: Number(
          formData.reviewPolicy?.reviewersPerItem || 1
        ),
      },
      dataset_id: normalizeId(selectedDataset),
      annotator_ids: selectedAnnotators.map(normalizeId).filter(Boolean),
      reviewer_ids: selectedReviewers.map(normalizeId).filter(Boolean),
    };

    console.log('PROJECT PAYLOAD =', payload);

    const res = await axios.post(
      `${API_URL}/api/projects`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
      }
    );

    alert('Tạo project thành công');
  } catch (err) {
    console.error(err.response?.data || err.message);
    alert('Tạo project thất bại');
  }
};
      const project = res.data?.project || res.data;
      const projectId = project?.id || project?._id;
      if (!projectId) throw new Error('Server không trả về id project');

      const itemIds = await extractDataItemIds(selectedDatasetId);
      if (itemIds.length) {
        for (const annotatorId of selectedAnnotators) {
          await axios.post(`${API_URL}/api/tasks/assign`, {
            project_id: projectId,
            dataset_id: selectedDatasetId,
            annotator_id: annotatorId,
            reviewer_ids: selectedReviewers,
            data_item_ids: itemIds,
          }, { headers: getAuthHeaders() });
        }
      }

      showToast('Tạo project thành công', 'success');
      navigate(`/manager/projects/${projectId}`);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Tạo project thất bại');
      showToast(e?.response?.data?.message || e.message || 'Tạo project thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton sx={{ color: '#e2e8f0' }} onClick={() => navigate('/manager/projects')}><ArrowBackIcon /></IconButton>
          <Typography variant="h4" fontWeight={700}>Create Project</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={loadData}>Refresh</Button>
          <Button startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />} variant="contained" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Project'}</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField fullWidth label="Project name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} sx={inputSx} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth type="datetime-local" label="Deadline" InputLabelProps={{ shrink: true }} value={formData.deadline} onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))} sx={inputSx} /></Grid>
                <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} sx={inputSx} /></Grid>
                <Grid item xs={12}><TextField fullWidth multiline minRows={4} label="Guidelines" value={formData.guidelines} onChange={(e) => setFormData(prev => ({ ...prev, guidelines: e.target.value }))} sx={inputSx} /></Grid>
                <Grid item xs={12} md={4}><Select fullWidth value={formData.exportFormat} onChange={(e) => setFormData(prev => ({ ...prev, exportFormat: e.target.value }))} sx={inputSx}><MenuItem value="JSON">JSON</MenuItem><MenuItem value="COCO">COCO</MenuItem><MenuItem value="YOLO">YOLO</MenuItem><MenuItem value="CSV">CSV</MenuItem></Select></Grid>
                <Grid item xs={12} md={4}><Select fullWidth value={formData.reviewPolicy.mode} onChange={(e) => setFormData(prev => ({ ...prev, reviewPolicy: { ...prev.reviewPolicy, mode: e.target.value } }))} sx={inputSx}><MenuItem value="full">Full</MenuItem><MenuItem value="sample">Sample</MenuItem></Select></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Sample rate" value={formData.reviewPolicy.sampleRate} onChange={(e) => setFormData(prev => ({ ...prev, reviewPolicy: { ...prev.reviewPolicy, sampleRate: e.target.value } }))} sx={inputSx} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Reviewers/item" value={formData.reviewPolicy.reviewersPerItem} onChange={(e) => setFormData(prev => ({ ...prev, reviewPolicy: { ...prev.reviewPolicy, reviewersPerItem: e.target.value } }))} sx={inputSx} /></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Choose dataset</Typography>
              <Select fullWidth value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)} sx={inputSx} displayEmpty>
                <MenuItem value="">Select dataset</MenuItem>
                {datasets.map(ds => <MenuItem key={ds.id} value={ds.id}>{ds.name}</MenuItem>)}
              </Select>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Annotators</Typography>
              <TextField fullWidth placeholder="Search annotator..." value={annotatorSearch} onChange={(e) => setAnnotatorSearch(e.target.value)} sx={{ ...inputSx, mb: 2 }} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} /> }} />
              <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {filteredAnnotators.map(user => {
                  const checked = selectedAnnotators.includes(user.id);
                  return <Card key={user.id} sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}><CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography fontWeight={600}>{user.fullName}</Typography><Typography variant="body2" sx={{ color: '#94a3b8' }}>{user.email}</Typography></Box><Checkbox checked={checked} onChange={() => setSelectedAnnotators(prev => checked ? prev.filter(id => id !== user.id) : [...prev, user.id])} /></CardContent></Card>;
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155' }}>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Reviewers</Typography>
              <TextField fullWidth placeholder="Search reviewer..." value={reviewerSearch} onChange={(e) => setReviewerSearch(e.target.value)} sx={{ ...inputSx, mb: 2 }} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} /> }} />
              <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {filteredReviewers.map(user => {
                  const checked = selectedReviewers.includes(user.id);
                  return <Card key={user.id} sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}><CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography fontWeight={600}>{user.fullName}</Typography><Typography variant="body2" sx={{ color: '#94a3b8' }}>{user.email}</Typography></Box><Checkbox checked={checked} onChange={() => setSelectedReviewers(prev => checked ? prev.filter(id => id !== user.id) : [...prev, user.id])} /></CardContent></Card>;
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

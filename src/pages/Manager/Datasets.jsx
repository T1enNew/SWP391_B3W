import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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

const normalizeTopic = (t) => ({ id: t?.id || t?._id, name: t?.name || t?.title || 'Topic' });
const normalizeSubtopic = (s) => ({ id: s?.id || s?._id || s?.subtopicId, name: s?.name || s?.title || 'Subtopic', topic_id: s?.topic_id || s?.topicId || s?.topic?.id || null });
const normalizeDataset = (d) => ({
  ...d,
  id: d?.id || d?._id,
  name: d?.name || 'Untitled Dataset',
  description: d?.description || '',
  subtopicIds: Array.isArray(d?.subtopicIds) ? d.subtopicIds : Array.isArray(d?.subtopic_ids) ? d.subtopic_ids : d?.subtopicId ? [d.subtopicId] : d?.subtopic_id ? [d.subtopic_id] : [],
});

export default function Datasets() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [dialog, setDialog] = useState({ open: false, edit: null, name: '', description: '' });
  const [detail, setDetail] = useState({ open: false, dataset: null, subtopics: [] });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const loadTopics = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/topics`, { headers: getAuthHeaders() });
      setTopics(getArray(res.data).map(normalizeTopic));
    } catch {}
  };

  const loadSubtopics = async (topicId = '') => {
    try {
      const res = await axios.get(`${API_URL}/api/subtopics`, { params: topicId ? { topic_id: topicId } : {}, headers: getAuthHeaders() });
      setSubtopics(getArray(res.data).map(normalizeSubtopic));
    } catch { setSubtopics([]); }
  };

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() });
      setDatasets(getArray(res.data).map(normalizeDataset));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được dataset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTopics(); loadSubtopics(); loadDatasets(); }, []);
  useEffect(() => { loadSubtopics(selectedTopicId); setSelectedSubtopicIds([]); }, [selectedTopicId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasets.filter(ds => {
      const okSearch = !q || ds.name.toLowerCase().includes(q) || ds.description.toLowerCase().includes(q);
      const okSubs = selectedSubtopicIds.length === 0 || selectedSubtopicIds.some(id => ds.subtopicIds.map(String).includes(String(id)));
      return okSearch && okSubs;
    });
  }, [datasets, search, selectedSubtopicIds]);

const saveDataset = async () => {
  try {
    const payload = {
      name: dialog.name.trim(),
      description: dialog.description.trim(),
      type: "image", // 🔥 bắt buộc
      topic_id: selectedTopicId, // 🔥 bắt buộc
      subtopic_ids: selectedSubtopicIds,
    };

    // validate
    if (!payload.name) return showToast('Nhập tên dataset', 'warning');
    if (!payload.topic_id) return showToast('Chọn topic', 'warning');
    if (!payload.subtopic_ids.length) return showToast('Chọn ít nhất một subtopic', 'warning');

    if (dialog.edit?.id) {
      await axios.put(
        `${API_URL}/api/datasets/${dialog.edit.id}`,
        payload,
        { headers: getAuthHeaders() }
      );
    } else {
      await axios.post(
        `${API_URL}/api/datasets`,
        payload,
        { headers: getAuthHeaders() }
      );
    }

    setDialog({ open: false, edit: null, name: '', description: '' });
    setSelectedTopicId('');
    setSelectedSubtopicIds([]);
    await loadDatasets();

    showToast('Lưu dataset thành công');
  } catch (e) {
    console.log(e.response?.data); // 🔥 debug cực quan trọng
    showToast(
      e?.response?.data?.message || e.message || 'Lưu dataset thất bại',
      'error'
    );
  }
};

  const deleteDataset = async (dataset) => {
    if (!window.confirm(`Xóa dataset "${dataset.name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/datasets/${dataset.id}`, { headers: getAuthHeaders() });
      await loadDatasets();
      showToast('Xóa dataset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa dataset thất bại', 'error');
    }
  };

  const openEdit = async (dataset) => {
    const subIds = dataset.subtopicIds.map(String);
    setDialog({ open: true, edit: dataset, name: dataset.name, description: dataset.description || '' });
    setSelectedSubtopicIds(subIds);
    const matchedSub = subtopics.find(s => subIds.includes(String(s.id)));
    if (matchedSub?.topic_id) {
      setSelectedTopicId(matchedSub.topic_id);
      await loadSubtopics(matchedSub.topic_id);
    }
  };

  const openDetail = async (dataset) => {
    try {
      const res = await axios.get(`${API_URL}/api/datasets/${dataset.id}`, { headers: getAuthHeaders() });
      const full = normalizeDataset(res.data || {});
      const ids = full.subtopicIds.map(String);
      const allSubs = [...subtopics];
      const missingIds = ids.filter(id => !allSubs.some(s => String(s.id) === id));
      let missing = [];
      if (missingIds.length) {
        const reqs = await Promise.all(missingIds.map(id => axios.get(`${API_URL}/api/subtopics/${id}`, { headers: getAuthHeaders() }).catch(() => ({ data: null }))));
        missing = reqs.map(r => r.data).filter(Boolean).map(normalizeSubtopic);
      }
      setDetail({ open: true, dataset: full, subtopics: [...allSubs, ...missing].filter(s => ids.includes(String(s.id))) });
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Không tải được chi tiết dataset', 'error');
    }
  };
const handleCreate = async () => {
  if (!form.name.trim()) {
    alert('Nhap ten dataset');
    return;
  }

  if (!selectedTopicId) {
    alert('Chon topic');
    return;
  }

  if (!selectedSubtopicIds.length) {
    alert('Chon it nhat 1 subtopic');
    return;
  }

  setCreating(true);
  setError(null);

  try {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || '',
      type: form.type || 'image',
      topic_id: selectedTopicId,
      subtopic_ids: selectedSubtopicIds,
    };

    console.log('DATASET PAYLOAD =', payload);

    const cr = await axios.post(`${API_URL}/api/datasets`, payload, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      },
    });

    const created = cr.data;

    setForm({
      name: '',
      description: '',
      type: 'image',
      subtopicId: '',
    });
    setSelectedTopicId('');
    setSelectedSubtopicId('');
    setSelectedSubtopicIds([]);
    setSubtopicData({});
    setCreateOpen(false);

    await fetchDatasets();

    if (created?.id) {
      setToast({
        open: true,
        message: `Dataset "${created.name}" da duoc tao thanh cong!`,
        severity: 'success',
      });
    }
  } catch (err) {
    console.error('CREATE DATASET ERROR =', err.response?.data || err.message);
    setError(
      'Loi tao dataset: ' +
        (err.response?.data?.message || err.message || 'Unknown error')
    );
  } finally {
    setCreating(false);
  }
};
  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h4" fontWeight={700}>Datasets</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setDialog({ open: true, edit: null, name: '', description: '' }); setSelectedTopicId(''); setSelectedSubtopicIds([]); }}>New Dataset</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField fullWidth placeholder="Search dataset..." value={search} onChange={(e) => setSearch(e.target.value)} sx={inputSx} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} /> }} /></Grid>
          <Grid item xs={12} md={4}>
            <Select fullWidth value={selectedTopicId} displayEmpty onChange={(e) => setSelectedTopicId(e.target.value)} sx={inputSx}>
              <MenuItem value="">All topics</MenuItem>
              {topics.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </Grid>
          <Grid item xs={12} md={4}>
            <Select fullWidth multiple value={selectedSubtopicIds} onChange={(e) => setSelectedSubtopicIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)} sx={inputSx} displayEmpty renderValue={(selected) => selected.length ? `${selected.length} subtopics` : 'All subtopics'}>
              {subtopics.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
            </Select>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {filtered.map(ds => (
          <Grid item xs={12} md={6} lg={4} key={ds.id}>
            <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{ds.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>{ds.description || 'Không có mô tả'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => openDetail(ds)}><VisibilityIcon sx={{ fontSize: 18, color: '#93c5fd' }} /></IconButton>
                    <IconButton size="small" onClick={() => openEdit(ds)}><EditIcon sx={{ fontSize: 18, color: '#60a5fa' }} /></IconButton>
                    <IconButton size="small" onClick={() => deleteDataset(ds)}><DeleteIcon sx={{ fontSize: 18, color: '#f87171' }} /></IconButton>
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap">
                  {ds.subtopicIds.length === 0 ? <Chip size="small" label="No subtopic" /> : ds.subtopicIds.map(id => {
                    const sub = subtopics.find(s => String(s.id) === String(id));
                    return <Chip key={id} size="small" label={sub?.name || String(id)} sx={{ bgcolor: 'rgba(59,130,246,0.18)', color: '#bfdbfe' }} />;
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, edit: null, name: '', description: '' })} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.edit ? 'Edit Dataset' : 'New Dataset'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Dataset name" value={dialog.name} onChange={(e) => setDialog(prev => ({ ...prev, name: e.target.value }))} sx={inputSx} />
            <TextField label="Description" multiline minRows={3} value={dialog.description} onChange={(e) => setDialog(prev => ({ ...prev, description: e.target.value }))} sx={inputSx} />
            <Select value={selectedTopicId} displayEmpty onChange={(e) => setSelectedTopicId(e.target.value)} sx={inputSx}>
              <MenuItem value="">Select topic</MenuItem>
              {topics.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
            <Select multiple value={selectedSubtopicIds} onChange={(e) => setSelectedSubtopicIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)} sx={inputSx} renderValue={(selected) => selected.map(id => subtopics.find(s => String(s.id) === String(id))?.name || id).join(', ')}>
              {subtopics.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, edit: null, name: '', description: '' })}>Cancel</Button>
          <Button onClick={saveDataset} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detail.open} onClose={() => setDetail({ open: false, dataset: null, subtopics: [] })} fullWidth maxWidth="sm">
        <DialogTitle>Dataset detail</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography fontWeight={700}>{detail.dataset?.name}</Typography>
            <Typography sx={{ color: '#94a3b8' }}>{detail.dataset?.description || 'Không có mô tả'}</Typography>
            <Typography fontWeight={700}>Subtopics</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {detail.subtopics.map(s => <Chip key={s.id} label={s.name} />)}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail({ open: false, dataset: null, subtopics: [] })}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

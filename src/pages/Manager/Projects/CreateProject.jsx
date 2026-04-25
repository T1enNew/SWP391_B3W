import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  Grid, IconButton, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon,
  Person as PersonIcon, Group as GroupIcon,
  FolderOpen as FolderIcon, Label as LabelIcon,
} from '@mui/icons-material';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';
import { getLabels } from '../../../services/LabelService';
import CreateProjectSection from './CreateProjectSection';
import CreateProjectUserList from './CreateProjectUserList';
import CreateProjectDatasetPicker from './CreateProjectDatasetPicker';
import CreateProjectLabelPicker from './CreateProjectLabelPicker';

const BG = '#080f1e', PANEL = '#0f1a2e', BORDER = '#1e2d47';
const PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';

const getAuthHeaders = () => {
  const t = sessionStorage.getItem('token') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const coerceId    = o => o?._id || o?.id || '';
const normalizeUser = u => ({
  ...u, id: coerceId(u) || u?.user_id,
  fullName: u?.full_name || u?.fullName || u?.username || u?.email || 'User',
});
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
};

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState({ open: false, msg: '', sev: 'success' });

  const [datasets, setDatasets]         = useState([]);
  const [annotators, setAnnotators]     = useState([]);
  const [reviewers, setReviewers]       = useState([]);
  const [masterLabels, setMasterLabels] = useState([]);

  const [form, setForm] = useState({ name: '', description: '', guidelines: '', deadline: '', sampleRate: 100 });
  const [selectedDatasetId, setSelectedDatasetId]     = useState('');
  const [selectedLabelsetIds, setSelectedLabelsetIds] = useState([]);
  const [selectedAnnotators, setSelectedAnnotators]   = useState([]);
  const [selectedReviewer, setSelectedReviewer]       = useState('');
  const [annoSearch, setAnnoSearch] = useState('');
  const [revSearch, setRevSearch]   = useState('');

  const showToast = (msg, sev = 'success') => setToast({ open: true, msg, sev });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dsRes, userRes, labelsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/users`,    { headers: getAuthHeaders() }),
          getLabels(),
        ]);
        if (dsRes.status === 'fulfilled')
          setDatasets(getArray(dsRes.value.data));
        if (userRes.status === 'fulfilled') {
          const users = getArray(userRes.value.data).map(normalizeUser);
          setAnnotators(users.filter(u => u.role === 'annotator' && u.is_active !== false));
          setReviewers(users.filter(u => u.role === 'reviewer'   && u.is_active !== false));
        }
        if (labelsRes.status === 'fulfilled') {
          const data = labelsRes.value;
          setMasterLabels(Array.isArray(data) ? data : (data?.labels || data?.data || []));
        }
      } catch (e) {
        setError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu');
      } finally { setLoading(false); }
    })();
  }, []);

  const filteredAnnotators = useMemo(() => {
    const q = annoSearch.toLowerCase();
    return annotators.filter(u => !q || u.fullName.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [annotators, annoSearch]);

  const filteredReviewers = useMemo(() => {
    const q = revSearch.toLowerCase();
    return reviewers.filter(u => !q || u.fullName.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [reviewers, revSearch]);

  const toggleAnnotator = id => setSelectedAnnotators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleReviewer  = id => setSelectedReviewer(prev => prev === id ? '' : id);
  const toggleLabel     = id => setSelectedLabelsetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.deadline || !selectedDatasetId) {
      showToast('Vui lòng điền đủ tên project, deadline và chọn 1 dataset', 'warning'); return;
    }
    if (!selectedAnnotators.length || !selectedReviewer) {
      showToast('Vui lòng chọn ít nhất 1 Annotator và 1 Reviewer', 'warning'); return;
    }
    if (form.sampleRate < 1 || form.sampleRate > 100) {
      showToast('Sample Rate phải nằm trong khoảng từ 1% đến 100%', 'warning'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(), description: form.description.trim(),
        guidelines: form.guidelines.trim() || 'No guidelines',
        deadline: new Date(form.deadline).toISOString(),
        export_format: 'JSON',
        review_policy: { mode: form.sampleRate < 100 ? 'sample' : 'full', sample_rate: form.sampleRate / 100, reviewers_per_item: 1 },
        dataset_id: selectedDatasetId,
        annotator_ids: selectedAnnotators,
        reviewer_id: selectedReviewer,
        label_ids: selectedLabelsetIds,
      };
      const res = await axios.post(`${API_URL}/api/projects`, payload, { headers: getAuthHeaders() });
      const project = res.data?.project || res.data;
      const projectId = coerceId(project);
      if (!projectId) throw new Error('Server không trả về project ID');

      // Gán tasks cho annotators (chia đều items trong dataset)
      try {
        const assignPayload = {
          project_id: projectId,
          dataset_id: selectedDatasetId,
          annotator_ids: selectedAnnotators,
          ...(selectedReviewer ? { reviewer_id: selectedReviewer } : {}),
        };
        await axios.post(`${API_URL}/api/tasks/assign`, assignPayload, { headers: getAuthHeaders() });
        showToast('Tạo project và phân công task thành công!');
      } catch (assignErr) {
        const assignMsg = assignErr?.response?.data?.message || 'Không thể phân công task';
        showToast(`Project đã tạo nhưng phân công task thất bại: ${assignMsg}`, 'warning');
      }

      setTimeout(() => navigate(`/manager/projects/${projectId}`), 900);
    } catch (e) {
      let errorMsg = 'Tạo project thất bại';
      const data = e?.response?.data;
      if (data?.errors?.length)  errorMsg = data.errors.map(err => err.message || JSON.stringify(err)).join(', ');
      else if (data?.message)    errorMsg = data.message;
      else if (data?.detail)     errorMsg = Array.isArray(data.detail) ? data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ') : String(data.detail);
      else if (e.message)        errorMsg = e.message;
      setError(errorMsg); showToast(errorMsg, 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: PRIMARY }} />
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, color: TEXT }}>
      {/* Header */}
      <Box sx={{ px: 3.5, py: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => navigate('/manager/projects')} sx={{ color: MUTED }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 24, color: TEXT }}>Tạo Project mới</Typography>
            <Typography sx={{ color: MUTED, fontSize: 13 }}>Thiết lập dự án annotation bounding box</Typography>
          </Box>
        </Stack>
        <Button variant="contained" onClick={handleCreate} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CheckCircleIcon />}
          sx={{ bgcolor: PRIMARY, borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
          {saving ? 'Đang tạo...' : 'Tạo Project'}
        </Button>
      </Box>

      <Box sx={{ p: 3.5 }}>
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
              <CreateProjectSection icon={<CheckCircleIcon />} title="Thông tin cơ bản" subtitle="Tên, mô tả và deadline của project">
                <Stack spacing={2}>
                  <TextField fullWidth label="Tên project *" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="VD: Phân loại chó mèo Q2/2026" sx={inputSx} />
                  <TextField fullWidth label="Mô tả" multiline minRows={3} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} sx={inputSx} />
                  <TextField fullWidth label="Hướng dẫn cho annotator" multiline minRows={3} value={form.guidelines}
                    onChange={e => setForm(p => ({ ...p, guidelines: e.target.value }))}
                    placeholder="Mô tả cách gán nhãn, quy tắc vẽ bounding box..." sx={inputSx} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField fullWidth type="datetime-local" label="Deadline" InputLabelProps={{ shrink: true }}
                      value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                      sx={{ ...inputSx, flex: 2 }} />
                    <TextField fullWidth type="number" label="Sample Rate (%)"
                      InputProps={{ inputProps: { min: 1, max: 100 } }}
                      value={form.sampleRate}
                      onChange={e => setForm(p => ({ ...p, sampleRate: e.target.value ? Number(e.target.value) : '' }))}
                      placeholder="VD: 10" sx={{ ...inputSx, flex: 1 }} />
                  </Box>
                  {form.sampleRate < 100 && form.sampleRate > 0 && (
                    <Typography sx={{ color: '#fbbf24', fontSize: 13, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                      Annotator làm 100%. Reviewer chỉ kiểm tra ngẫu nhiên {form.sampleRate}% số ảnh.
                    </Typography>
                  )}
                </Stack>
              </CreateProjectSection>

              <CreateProjectSection icon={<FolderIcon />} title="Chọn Dataset *"
                subtitle={selectedDatasetId ? '✓ Đã chọn dataset' : 'Chọn 1 bộ ảnh cho project này'}>
                <CreateProjectDatasetPicker datasets={datasets} selected={selectedDatasetId} onSelect={setSelectedDatasetId} />
              </CreateProjectSection>

              <CreateProjectSection icon={<LabelIcon />} title="Chọn nhãn"
                subtitle={`${selectedLabelsetIds.length} nhãn được chọn`}>
                <CreateProjectLabelPicker labels={masterLabels} selected={selectedLabelsetIds} onToggle={toggleLabel} />
              </CreateProjectSection>
            </Stack>
          </Grid>

          {/* Right column */}
          <Grid item xs={12} lg={7}>
            <Stack spacing={3}>
              <CreateProjectSection icon={<PersonIcon />} title="Phân công Annotators *"
                subtitle={`${selectedAnnotators.length}/${annotators.length} người được chọn`}>
                <CreateProjectUserList
                  users={filteredAnnotators} selected={selectedAnnotators} onToggle={toggleAnnotator}
                  search={annoSearch} onSearch={setAnnoSearch} placeholder="Tìm annotator..." />
              </CreateProjectSection>

              <CreateProjectSection icon={<GroupIcon />} title="Phân công Reviewers *"
                subtitle={`${selectedReviewer ? 1 : 0}/${reviewers.length} người được chọn`}>
                <CreateProjectUserList
                  users={filteredReviewers} selected={selectedReviewer ? [selectedReviewer] : []} onToggle={toggleReviewer}
                  search={revSearch} onSearch={setRevSearch} placeholder="Tìm reviewer..." />
              </CreateProjectSection>

              {/* Summary */}
              <Card sx={{ bgcolor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 800, color: TEXT, mb: 1.5 }}>📋 Tóm tắt</Typography>
                  <Stack spacing={0.8}>
                    {[
                      { label: 'Project name', value: form.name || '—' },
                      { label: 'Dataset',      value: datasets.find(d => coerceId(d) === selectedDatasetId)?.name || '—' },
                      { label: 'Labels',       value: selectedLabelsetIds.length ? `${selectedLabelsetIds.length} nhãn` : '—' },
                      { label: 'Annotators',   value: selectedAnnotators.length  ? `${selectedAnnotators.length} người` : '—' },
                      { label: 'Reviewer',     value: selectedReviewer ? '1 người' : '—' },
                      { label: 'Deadline',     value: form.deadline ? new Date(form.deadline).toLocaleString('vi-VN') : '—' },
                    ].map(row => (
                      <Box key={row.label} sx={{ display: 'flex', gap: 1 }}>
                        <Typography sx={{ color: MUTED, fontSize: 13, minWidth: 110 }}>{row.label}:</Typography>
                        <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

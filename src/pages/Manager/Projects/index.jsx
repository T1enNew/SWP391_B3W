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
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';

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
};

const normalizeProject = (p) => ({
  ...p,
  id: p?.id || p?._id,
  name: p?.name || 'Untitled Project',
  description: p?.description || '',
  status: p?.status || 'draft',
  dataset_id: p?.dataset_id || p?.datasetId || p?.dataset?.id || null,
  dataset_name: p?.dataset?.name || p?.datasetName || '',
  total_tasks: p?.total_tasks || p?.totalTasks || 0,
  createdAt: p?.created_at || p?.createdAt,
  deadline: p?.deadline || null,
});

const statusColor = (status) => ({
  active: '#22c55e',
  draft: '#64748b',
  completed: '#3b82f6',
  archived: '#f59e0b',
}[status] || '#94a3b8');

const fmtDateTime = (v) => {
  if (!v) return 'N/A';
  const d = new Date(v);
  return isNaN(d) ? 'N/A' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const InfoRow = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', gap: 1, py: 0.8, borderBottom: '1px solid #1e293b' }}>
    <Typography sx={{ color: '#64748b', fontSize: 13, minWidth: 110, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ color: color || '#e2e8f0', fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value ?? 'N/A'}</Typography>
  </Box>
);

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null });
  const [infoProject, setInfoProject] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, datasetRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
      ]);
      if (projectRes.status === 'fulfilled') {
        const pData = projectRes.value.data;
        // Handle paginated response format
        const pList = pData?.data ? pData.data : getArray(pData);
        setProjects(pList.map(normalizeProject));
      } else {
        const errorMsg = projectRes.reason?.response?.data?.message || projectRes.reason?.response?.data?.detail || 'Server error';
        setError(`Không tải được danh sách project: ${errorMsg}`);
      }
      if (datasetRes.status === 'fulfilled') {
        setDatasets(getArray(datasetRes.value.data));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      const okSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.dataset_name.toLowerCase().includes(q);
      const okStatus = statusFilter === 'all' || p.status === statusFilter;
      return okSearch && okStatus;
    });
  }, [projects, search, statusFilter]);

  const deleteProject = async () => {
    const project = deleteDialog.project;
    if (!project) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${project.id}`, { headers: getAuthHeaders() });
      setDeleteDialog({ open: false, project: null });
      await loadData();
      setToast({ open: true, message: 'Xóa project thành công', severity: 'success' });
    } catch (e) {
      setToast({ open: true, message: e?.response?.data?.message || e.message || 'Xóa project thất bại', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h4" fontWeight={700}>Projects</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate('/manager/projects/create')}>New Project</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card sx={{ mb: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}><TextField fullWidth placeholder="Search project..." value={search} onChange={(e) => setSearch(e.target.value)} sx={inputSx} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} /> }} /></Grid>
            <Grid item xs={12} md={4}>
              <Select fullWidth value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={inputSx}>
                <MenuItem value="all">All status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {filtered.map(project => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header: tên + status chip + info icon */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.description || 'Không có mô tả'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    <Chip label={project.status} size="small" sx={{ bgcolor: `${statusColor(project.status)}22`, color: statusColor(project.status), border: `1px solid ${statusColor(project.status)}` }} />
                    <Tooltip title="Xem thông tin đầy đủ">
                      <IconButton size="small" onClick={() => setInfoProject(project)}
                        sx={{ color: '#94a3b8', width: 26, height: 26, '&:hover': { color: '#fff', bgcolor: 'rgba(59,130,246,0.2)' } }}>
                        <InfoIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Body info */}
                <Stack spacing={0.6} sx={{ mb: 2, flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    Dataset: <b>{project.dataset_name || datasets.find(d => d.id === project.dataset_id)?.name || 'N/A'}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Tasks: <b>{project.total_tasks}</b></Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    Deadline: <b>{fmtDateTime(project.deadline)}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: 12 }}>
                    Tạo lúc: {fmtDateTime(project.createdAt)}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<VisibilityIcon />} variant="outlined" onClick={() => navigate(`/manager/projects/${project.id}`)}>Detail</Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteDialog({ open: true, project })}>Delete</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, project: null })}>
        <DialogTitle>Delete project</DialogTitle>
        <DialogContent>Bạn có chắc muốn xóa project này?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, project: null })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteProject}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Info Dialog ── */}
      <Dialog open={!!infoProject} onClose={() => setInfoProject(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid #334155', borderRadius: 3, color: '#e2e8f0' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', pb: 2 }}>
          <Box>
            <Typography fontWeight={800} fontSize={17}>{infoProject?.name}</Typography>
            <Chip label={infoProject?.status} size="small" sx={{ mt: 0.5, bgcolor: `${statusColor(infoProject?.status)}22`, color: statusColor(infoProject?.status), border: `1px solid ${statusColor(infoProject?.status)}` }} />
          </Box>
          <IconButton onClick={() => setInfoProject(null)} size="small" sx={{ color: '#64748b', '&:hover': { color: '#fff' } }}>✕</IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <InfoRow label="Mô tả" value={infoProject?.description || 'Không có mô tả'} />
          <InfoRow label="Dataset" value={infoProject?.dataset_name || datasets.find(d => d.id === infoProject?.dataset_id)?.name || 'N/A'} color="#93c5fd" />
          <InfoRow label="Tổng tasks" value={infoProject?.total_tasks} />
          <InfoRow label="Deadline" value={fmtDateTime(infoProject?.deadline)} color="#fbbf24" />
          <InfoRow label="Ngày tạo" value={fmtDateTime(infoProject?.createdAt)} />
          {infoProject?.updatedAt && <InfoRow label="Cập nhật lần cuối" value={fmtDateTime(infoProject?.updatedAt)} />}
          {infoProject?.guidelines && <InfoRow label="Guidelines" value={infoProject?.guidelines} />}
          {infoProject?.reviewer && (
            <InfoRow label="Reviewer"
              value={infoProject.reviewer?.fullName || infoProject.reviewer?.username || infoProject.reviewer}
              color="#a78bfa" />
          )}
          {Array.isArray(infoProject?.annotators) && infoProject.annotators.length > 0 && (
            <InfoRow label="Annotators" value={`${infoProject.annotators.length} người`} />
          )}
          <InfoRow label="Project ID" value={infoProject?.id} color="#475569" />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e293b', px: 3, py: 2 }}>
          <Button onClick={() => navigate(`/manager/projects/${infoProject?.id}`)} variant="contained" startIcon={<VisibilityIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            Xem chi tiết
          </Button>
          <Button onClick={() => setInfoProject(null)} sx={{ color: '#64748b', textTransform: 'none' }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

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
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, datasetRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
      ]);
      setProjects(getArray(projectRes.data).map(normalizeProject));
      setDatasets(getArray(datasetRes.data));
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
            <Card sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{project.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>{project.description || 'Không có mô tả'}</Typography>
                  </Box>
                  <Chip label={project.status} size="small" sx={{ bgcolor: `${statusColor(project.status)}22`, color: statusColor(project.status), border: `1px solid ${statusColor(project.status)}` }} />
                </Box>
                <Stack spacing={0.8} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Dataset: {project.dataset_name || datasets.find(d => d.id === project.dataset_id)?.name || 'N/A'}</Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Tasks: {project.total_tasks}</Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>Deadline: {project.deadline ? new Date(project.deadline).toLocaleString('vi-VN') : 'N/A'}</Typography>
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

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

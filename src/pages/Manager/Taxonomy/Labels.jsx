import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import {
  Add as AddIcon, Label as LabelIcon,
  Search as SearchIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { getLabels, createLabel, updateLabel, deleteLabel } from '../../../services/LabelService';
import LabelCard from './LabelCard';
import LabelFormDialog from './LabelFormDialog';
import DeleteLabelDialog from './DeleteLabelDialog';

const BG = '#080f1e', PANEL = '#0f1a2e', BORDER = '#1e2d47';
const PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b', DANGER = '#ef4444';
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
};

export default function Labels() {
  const [labels, setLabels]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [toast, setToast]             = useState({ open: false, msg: '', sev: 'success' });
  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (msg, sev = 'success') => setToast({ open: true, msg, sev });

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const data = await getLabels();
      setLabels(Array.isArray(data) ? data : (data?.labels || data?.data || []));
    } catch (e) {
      showToast(e.message || 'Không tải được danh sách nhãn', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLabels(); }, []);

  const handleSave = async (form) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), color: form.color, description: form.description, shortcut: form.shortcut };
      if (editTarget) {
        const updated = await updateLabel(editTarget.id, payload);
        setLabels(prev => prev.map(l => l.id === editTarget.id ? { ...l, ...(updated?.label || updated) } : l));
        showToast('Cập nhật nhãn thành công');
      } else {
        const created = await createLabel(payload);
        setLabels(prev => [...prev, created?.label || created]);
        showToast('Tạo nhãn thành công');
      }
      setFormOpen(false); setEditTarget(null);
    } catch (e) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteLabel(deleteTarget.id);
      setLabels(prev => prev.filter(l => l.id !== deleteTarget.id));
      showToast('Đã xóa nhãn');
      setDeleteTarget(null);
    } catch (e) {
      showToast(e.message || 'Xóa thất bại', 'error');
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labels.filter(l => !q || l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
  }, [labels, search]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (l) => { setEditTarget(l);   setFormOpen(true); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG }}>
      {/* Header */}
      <Box sx={{ px: 3.5, py: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: TEXT, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>Labels</Typography>
            <Typography sx={{ color: MUTED, mt: 0.5, fontSize: 14 }}>
              Quản lý nhãn dùng chung cho tất cả project annotation
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchLabels} disabled={loading}
                sx={{ color: MUTED, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.06)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: PRIMARY, borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5, '&:hover': { bgcolor: '#2563eb' } }}>
              Tạo nhãn
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Chip label={`${labels.length} nhãn`} sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 700 }} />
        </Stack>
      </Box>

      <Box sx={{ p: 3.5 }}>
        {/* Search */}
        <Box sx={{ mb: 3, maxWidth: 400 }}>
          <TextField fullWidth size="small" placeholder="Tìm nhãn..." value={search}
            onChange={e => setSearch(e.target.value)} sx={inputSx}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: MUTED, mr: 1, fontSize: 20 }} /> }} />
        </Box>

        {/* Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: PRIMARY }} />
          </Box>
        ) : filtered.length === 0 && !search ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 2 }}>
            <Box sx={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${BORDER}`,
            }}>
              <LabelIcon sx={{ fontSize: 36, color: PRIMARY, opacity: 0.7 }} />
            </Box>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 18 }}>Chưa có nhãn nào</Typography>
            <Typography sx={{ color: MUTED, fontSize: 14, textAlign: 'center', maxWidth: 340 }}>
              Tạo master labels để dùng lại trong nhiều project. VD: dog, cat, car, person...
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, mt: 1, '&:hover': { bgcolor: '#2563eb' } }}>
              Tạo nhãn đầu tiên
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(l => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={l.id}>
                <LabelCard label={l} onEdit={openEdit} onDelete={setDeleteTarget} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Card onClick={openCreate} sx={{
                bgcolor: 'transparent', border: `1.5px dashed ${BORDER}`, borderRadius: 3, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 130,
                '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.06)' },
              }}>
                <Stack alignItems="center" spacing={1}>
                  <AddIcon sx={{ color: MUTED, fontSize: 32 }} />
                  <Typography sx={{ color: MUTED, fontSize: 14 }}>Thêm nhãn mới</Typography>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      <LabelFormDialog open={formOpen} initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }} onSave={handleSave} saving={saving} />

      <DeleteLabelDialog 
        deleteTarget={deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={handleDelete} 
      />

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

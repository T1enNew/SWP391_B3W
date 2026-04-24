import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Grid, IconButton, InputAdornment, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import {
  Add as AddIcon, Label as LabelIcon,
  Search as SearchIcon, Refresh as RefreshIcon,
  KeyboardAlt as KeyboardIcon, Palette as PaletteIcon,
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { getLabels, createLabel, updateLabel, deleteLabel } from '../../../services/LabelService';
import LabelCard from './LabelCard';
import LabelFormDialog from './LabelFormDialog';
import DeleteLabelDialog from './DeleteLabelDialog';

const BG = '#080f1e', PANEL = '#0d1829', BORDER = '#1e2d47';
const PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';

const StatTile = ({ icon, value, label, accent }) => (
  <Box sx={{
    bgcolor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 3,
    px: 2.5, py: 2, flex: 1, minWidth: 140,
    borderTop: `3px solid ${accent}`,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Box sx={{ color: accent, display: 'flex' }}>{icon}</Box>
      <Typography sx={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Box>
    <Typography sx={{ color: TEXT, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
  </Box>
);

export default function Labels() {
  const [labels, setLabels]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState('');
  const [toast, setToast]               = useState({ open: false, msg: '', sev: 'success' });
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
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

  const uniqueColors = useMemo(() => new Set(labels.map(l => l.color)).size, [labels]);
  const withShortcut = useMemo(() => labels.filter(l => l.shortcut).length, [labels]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (l) => { setEditTarget(l);   setFormOpen(true); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG }}>
      {/* Header */}
      <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LabelIcon sx={{ fontSize: 20, color: '#fff' }} />
              </Box>
              <Typography sx={{ color: TEXT, fontSize: 26, fontWeight: 800 }}>Quản lý nhãn</Typography>
            </Box>
            <Typography sx={{ color: MUTED, fontSize: 14, ml: 0.5 }}>
              Master labels dùng chung cho tất cả project annotation
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchLabels} disabled={loading}
                sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 2, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3,
                boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(59,130,246,0.5)' },
              }}>
              Tạo nhãn
            </Button>
          </Stack>
        </Box>

        {/* Stats row */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <StatTile icon={<LabelIcon sx={{ fontSize: 16 }} />} value={labels.length} label="Tổng nhãn" accent="#3b82f6" />
          <StatTile icon={<KeyboardIcon sx={{ fontSize: 16 }} />} value={withShortcut} label="Có phím tắt" accent="#8b5cf6" />
          <StatTile icon={<PaletteIcon sx={{ fontSize: 16 }} />} value={uniqueColors} label="Màu sắc" accent="#10b981" />
        </Stack>
      </Box>

      <Box sx={{ p: 4 }}>
        {/* Search + filter bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <TextField
            size="small" placeholder="Tìm nhãn theo tên hoặc mô tả..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{
              maxWidth: 380, flex: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: PANEL, color: TEXT, borderRadius: 2,
                '& fieldset': { borderColor: BORDER },
                '&:hover fieldset': { borderColor: '#2d4060' },
                '&.Mui-focused fieldset': { borderColor: PRIMARY },
              },
            }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: MUTED, fontSize: 18 }} /></InputAdornment> }}
          />
          {search && (
            <Chip
              label={`${filtered.length} kết quả`}
              size="small"
              sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontWeight: 600 }}
            />
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 16, gap: 2 }}>
            <CircularProgress sx={{ color: PRIMARY }} />
            <Typography sx={{ color: MUTED, fontSize: 14 }}>Đang tải nhãn...</Typography>
          </Box>
        ) : filtered.length === 0 && !search ? (
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', py: 14, gap: 2.5,
            border: `1.5px dashed ${BORDER}`, borderRadius: 4,
          }}>
            <Box sx={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed rgba(59,130,246,0.3)`,
            }}>
              <LabelIcon sx={{ fontSize: 40, color: PRIMARY, opacity: 0.7 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 18, mb: 0.5 }}>Chưa có nhãn nào</Typography>
              <Typography sx={{ color: MUTED, fontSize: 14, maxWidth: 360 }}>
                Tạo master labels để dùng lại trong nhiều project. VD: dog, cat, car, person...
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4, mt: 0.5,
                boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
              }}>
              Tạo nhãn đầu tiên
            </Button>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ color: MUTED, fontSize: 15 }}>Không tìm thấy nhãn nào khớp với "{search}"</Typography>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {filtered.map(l => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={l.id}>
                <LabelCard label={l} onEdit={openEdit} onDelete={setDeleteTarget} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Box onClick={openCreate} sx={{
                border: `2px dashed ${BORDER}`, borderRadius: 3, cursor: 'pointer', minHeight: 130,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                transition: 'all 0.15s',
                '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.05)' },
              }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(59,130,246,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AddIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                </Box>
                <Typography sx={{ color: MUTED, fontSize: 13, fontWeight: 600 }}>Thêm nhãn mới</Typography>
              </Box>
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton,
  LinearProgress, Snackbar, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FolderOpen as FolderIcon,
  Image as ImageIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';

/* ─── THEME TOKENS ─────────────────────────────────────── */
const BG      = '#080f1e';
const PANEL   = '#0f1a2e';
const CARD    = '#131f35';
const BORDER  = '#1e2d47';
const PRIMARY = '#3b82f6';
const TEXT    = '#e2e8f0';
const MUTED   = '#64748b';
const SUCCESS = '#22c55e';
const DANGER  = '#ef4444';
const WARNING = '#f59e0b';

/* ─── HELPERS ────────────────────────────────────────────── */
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const coerceId = (obj) => obj?._id || obj?.id || '';

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const buildImageUrl = (item) => {
  if (!item) return '';
  const base = API_URL.replace(/\/+$/, '');
  const direct = item.signed_url || item.signedUrl || item.storage_url || item.storageUrl || item.url || item.imageUrl || '';
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  const rawPath = (item.path || item.storagePath || item.storage_path || direct || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (rawPath) {
    const idx = rawPath.indexOf('uploads/');
    const rel = idx !== -1 ? rawPath.substring(idx) : rawPath;
    const last = rel.split('/').pop();
    if (/\.\w{1,10}$/i.test(last)) return `${base}/${rel.startsWith('uploads/') ? rel : `uploads/datasets/${rel}`}`;
  }
  const filename = item.originalName || item.original_name || item.filename || '';
  return filename ? `${base}/uploads/datasets/${filename}` : '';
};

const ANNOTATOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const getAnnotatorColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ANNOTATOR_COLORS[Math.abs(hash) % ANNOTATOR_COLORS.length];
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputBase-input': { color: TEXT },
};

/* ─── SUB-COMPONENTS ─────────────────────────────────────── */
const StatBadge = ({ label, value, color = PRIMARY }) => (
  <Box sx={{ textAlign: 'center', px: 2 }}>
    <Typography sx={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
    <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.3 }}>{label}</Typography>
  </Box>
);

const ImgThumb = ({ src, name }) => {
  const [err, setErr] = useState(false);
  return err || !src ? (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#07101d' }}>
      <ImageIcon sx={{ color: MUTED, fontSize: 32 }} />
    </Box>
  ) : (
    <Box component="img" src={src} alt={name} onError={() => setErr(true)}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  );
};

/* ─── ITEM DETAIL DIALOG ─────────────────────────────────── */
const ItemDetailDialog = ({ open, onClose, item }) => {
  const [annotatorToggles, setAnnotatorToggles] = useState({});

  const annotators = useMemo(() => {
    if (!item) return [];
    const annotations = item.annotations || [];
    const approvedAnns = annotations.filter(a => a.status === 'approved');
    const source = approvedAnns.length > 0 ? approvedAnns : annotations;
    return source.map((ann, idx) => {
      const name = ann.annotator || ann.annotatorId?.fullName || ann.annotatorId?.username || `Annotator ${idx + 1}`;
      const id = String(ann.annotatorId?.id || ann.annotatorId?._id || ann.annotatorId || `ann-${idx}`);
      const labels = [
        ...(ann.labels?.objects || []).map(o => o.label || ''),
        ...(ann.labels?.spans || []).map(s => s.label || ''),
        ...(ann.labels?.segments || []).map(s => s.label || ''),
      ].filter(Boolean);
      return { id, name, labels: [...new Set(labels)], color: getAnnotatorColor(name) };
    });
  }, [item]);

  useEffect(() => {
    const init = {};
    annotators.forEach(a => { init[a.id] = true; });
    setAnnotatorToggles(init);
  }, [annotators]);

  const visibleLabels = useMemo(() => {
    const set = new Set();
    annotators.forEach(a => { if (annotatorToggles[a.id]) a.labels.forEach(l => set.add(l)); });
    return [...set];
  }, [annotators, annotatorToggles]);

  const imageUrl = useMemo(() => buildImageUrl(item), [item]);
  const fileName = item?.originalName || item?.original_name || item?.filename || '';

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, pb: 2 }}>
        <Box>
          <Typography fontWeight={800} sx={{ color: TEXT, fontSize: 16 }}>{fileName || 'Chi tiết item'}</Typography>
          <Chip label="✓ Đã được duyệt" size="small" sx={{ mt: 0.5, bgcolor: 'rgba(34,197,94,0.15)', color: SUCCESS, fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)' }} />
        </Box>
        <IconButton onClick={onClose} sx={{ color: MUTED, '&:hover': { color: TEXT } }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' }, minHeight: 380 }}>
          {/* Image preview */}
          <Box sx={{ bgcolor: '#07101d', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, minHeight: 320 }}>
            {imageUrl ? (
              <Box component="img" src={imageUrl} alt={fileName}
                sx={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 2 }} />
            ) : (
              <Box sx={{ textAlign: 'center', color: MUTED }}>
                <ImageIcon sx={{ fontSize: 64, mb: 1 }} />
                <Typography fontSize={13}>Không có preview</Typography>
              </Box>
            )}
          </Box>

          {/* Sidebar */}
          <Box sx={{ p: 3, borderLeft: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto' }}>

            {annotators.length > 0 ? (
              <Box>
                <Typography variant="caption" sx={{ color: MUTED, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                  Annotators ({annotators.length})
                </Typography>
                <Stack spacing={1}>
                  {annotators.map(a => (
                    <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderRadius: 1.5, bgcolor: annotatorToggles[a.id] ? 'rgba(255,255,255,0.05)' : 'transparent', border: `1px solid ${annotatorToggles[a.id] ? BORDER : 'transparent'}`, transition: 'all 0.15s' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: a.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13, color: annotatorToggles[a.id] ? TEXT : MUTED, fontWeight: 600, transition: 'color 0.15s' }}>{a.name}</Typography>
                        {a.labels.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: MUTED }}>({a.labels.length} labels)</Typography>
                        )}
                      </Box>
                      <Switch
                        size="small"
                        checked={!!annotatorToggles[a.id]}
                        onChange={() => setAnnotatorToggles(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                        sx={{
                          '& .MuiSwitch-thumb': { bgcolor: annotatorToggles[a.id] ? a.color : '#475569' },
                          '& .MuiSwitch-track': { bgcolor: annotatorToggles[a.id] ? `${a.color}55` : '#334155' },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3, color: MUTED }}>
                <Typography fontSize={13}>Chưa có annotation nào được duyệt</Typography>
              </Box>
            )}

            {visibleLabels.length > 0 && (
              <>
                <Divider sx={{ borderColor: BORDER }} />
                <Box>
                  <Typography variant="caption" sx={{ color: MUTED, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                    Labels hiển thị ({visibleLabels.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {visibleLabels.map(label => (
                      <Chip key={label} label={label} size="small"
                        sx={{ bgcolor: 'rgba(59,130,246,0.14)', color: '#93c5fd', fontWeight: 700, border: '1px solid rgba(59,130,246,0.3)', fontSize: 11 }} />
                    ))}
                  </Box>
                </Box>
              </>
            )}

            {visibleLabels.length === 0 && annotators.length > 0 && (
              <Typography sx={{ fontSize: 12, color: MUTED, textAlign: 'center', py: 1 }}>
                Bật annotator để xem labels
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function Datasets() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [datasets, setDatasets]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [toast, setToast]           = useState({ open: false, msg: '', sev: 'success' });

  /* create dialog */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating]     = useState(false);

  /* edit dialog */
  const [editDs, setEditDs]         = useState(null);
  const [editForm, setEditForm]     = useState({ name: '', description: '' });
  const [editing, setEditing]       = useState(false);

  /* detail panel */
  const [selectedDs, setSelectedDs]       = useState(null);
  const [dsItems, setDsItems]             = useState([]);
  const [itemsLoading, setItemsLoading]   = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /* delete dataset */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  /* delete item */
  const [deletingItemId, setDeletingItemId] = useState(null);

  /* item detail dialog (shown when dataset is complete) */
  const [detailItem, setDetailItem]           = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const isComplete = useMemo(
    () => dsItems.length > 0 && dsItems.every(i => i.status === 'approved'),
    [dsItems]
  );

  /* ── loaders ── */
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() });
      setDatasets(getArray(res.data));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được danh sách dataset');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDatasetItems = useCallback(async (ds) => {
    if (!ds) return;
    setItemsLoading(true);
    setDsItems([]);
    try {
      const res = await axios.get(`${API_URL}/api/datasets/${coerceId(ds)}`, { headers: getAuthHeaders() });
      const data = res.data?.dataset || res.data || {};
      const items = data.data_items || data.items || data.files || [];
      setDsItems(Array.isArray(items) ? items : []);
    } catch {
      setDsItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  useEffect(() => {
    if (selectedDs) fetchDatasetItems(selectedDs);
  }, [selectedDs, fetchDatasetItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasets.filter(ds => !q || (ds.name || '').toLowerCase().includes(q) || (ds.description || '').toLowerCase().includes(q));
  }, [datasets, search]);

  /* ── create ── */
  const handleCreate = async () => {
    if (!createForm.name.trim()) return showToast('Vui lòng nhập tên dataset', 'warning');
    setCreating(true);
    try {
      await axios.post(`${API_URL}/api/datasets`, { name: createForm.name.trim(), description: createForm.description.trim(), type: 'image' }, { headers: getAuthHeaders() });
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
      await fetchDatasets();
      showToast('Tạo dataset thành công');
    } catch (e) {
      const data = e?.response?.data;
      let msg = 'Tạo dataset thất bại';
      if (data?.errors?.length) msg = data.errors.map(err => err.message || JSON.stringify(err)).join(', ');
      else if (data?.message) msg = data.message;
      else if (data?.detail) msg = Array.isArray(data.detail) ? data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ') : String(data.detail);
      else if (e.message) msg = e.message;
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  /* ── edit ── */
  const openEdit = (e, ds) => {
    e.stopPropagation();
    setEditDs(ds);
    setEditForm({ name: ds.name || '', description: ds.description || '' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return showToast('Tên dataset không được để trống', 'warning');
    setEditing(true);
    try {
      await axios.put(`${API_URL}/api/datasets/${coerceId(editDs)}`, { name: editForm.name.trim(), description: editForm.description.trim() }, { headers: getAuthHeaders() });
      setEditDs(null);
      await fetchDatasets();
      if (coerceId(selectedDs) === coerceId(editDs)) {
        setSelectedDs(prev => ({ ...prev, name: editForm.name.trim(), description: editForm.description.trim() }));
      }
      showToast('Cập nhật dataset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Cập nhật thất bại', 'error');
    } finally {
      setEditing(false);
    }
  };

  /* ── upload ── */
  const handleUpload = async (files) => {
    if (!selectedDs || !files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      await axios.post(`${API_URL}/api/datasets/${coerceId(selectedDs)}/upload`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      showToast(`Upload ${files.length} ảnh thành công`);
      await fetchDatasetItems(selectedDs);
      await fetchDatasets();
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Upload thất bại', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── delete dataset ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/datasets/${coerceId(deleteTarget)}`, { headers: getAuthHeaders() });
      setDeleteTarget(null);
      if (coerceId(selectedDs) === coerceId(deleteTarget)) { setSelectedDs(null); setDsItems([]); }
      await fetchDatasets();
      showToast('Xóa dataset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa dataset thất bại', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ── delete item ── */
  const handleDeleteItem = async (e, item) => {
    e.stopPropagation();
    const itemId = coerceId(item) || item.path;
    if (!itemId || !selectedDs) return;
    setDeletingItemId(itemId);
    try {
      await axios.delete(`${API_URL}/api/datasets/${coerceId(selectedDs)}/items/${itemId}`, { headers: getAuthHeaders() });
      setDsItems(prev => prev.filter(i => (coerceId(i) || i.path) !== itemId));
      await fetchDatasets();
      showToast('Xóa ảnh thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa ảnh thất bại', 'error');
    } finally {
      setDeletingItemId(null);
    }
  };

  /* ── item click: dialog if complete, navigate otherwise ── */
  const handleItemClick = (item) => {
    if (isComplete) {
      setDetailItem(item);
      setDetailDialogOpen(true);
    } else {
      navigate(
        `/manager/datasets/${coerceId(selectedDs)}/items/${encodeURIComponent(item.id || item._id || item.path || '')}`,
        { state: { item, datasetName: selectedDs.name } }
      );
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) handleUpload(files);
  };

  const showToast = (msg, sev = 'success') => setToast({ open: true, msg, sev });

  /* ══════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <Box sx={{ px: 3.5, py: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ color: TEXT, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>Datasets</Typography>
            <Typography sx={{ color: MUTED, mt: 0.5, fontSize: 14 }}>Quản lý bộ ảnh cho dự án annotation</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchDatasets} sx={{ color: MUTED, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.06)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: PRIMARY, borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5, '&:hover': { bgcolor: '#2563eb' } }}>
              Tạo Dataset
            </Button>
          </Stack>
        </Box>

        <Stack direction="row" spacing={0} divider={<Box sx={{ width: '1px', bgcolor: BORDER, my: 0.5 }} />}
          sx={{ mt: 2.5, bgcolor: '#07101d', borderRadius: 2, border: `1px solid ${BORDER}`, display: 'inline-flex', overflow: 'hidden' }}>
          <Box sx={{ py: 1.5, px: 3 }}><StatBadge label="Tổng datasets" value={datasets.length} color={PRIMARY} /></Box>
          <Box sx={{ py: 1.5, px: 3 }}><StatBadge label="Đang chọn" value={selectedDs ? '1' : '0'} color={SUCCESS} /></Box>
          <Box sx={{ py: 1.5, px: 3 }}><StatBadge label="Ảnh trong dataset" value={dsItems.length} color={WARNING} /></Box>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mx: 3, mt: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Dataset list ── */}
        <Box sx={{ width: 340, minWidth: 280, borderRight: `1px solid ${BORDER}`, bgcolor: PANEL, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
            <TextField fullWidth size="small" placeholder="Tìm kiếm dataset..." value={search}
              onChange={e => setSearch(e.target.value)} sx={inputSx}
              InputProps={{ startAdornment: <SearchIcon sx={{ color: MUTED, mr: 1, fontSize: 20 }} /> }} />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress size={28} sx={{ color: PRIMARY }} />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: MUTED }}>
                <FolderIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                <Typography>Chưa có dataset nào</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {filtered.map(ds => {
                  const isSelected = coerceId(selectedDs) === coerceId(ds);
                  const total = ds.total_items || ds.totalItems || 0;
                  return (
                    <Card key={coerceId(ds)} onClick={() => setSelectedDs(ds)} sx={{
                      bgcolor: isSelected ? 'rgba(59,130,246,0.15)' : CARD,
                      border: `1px solid ${isSelected ? PRIMARY : BORDER}`,
                      borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { borderColor: isSelected ? PRIMARY : '#2d4a6e', bgcolor: isSelected ? 'rgba(59,130,246,0.18)' : '#172133' },
                    }}>
                      <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ds.name || 'Untitled'}
                            </Typography>
                            {ds.description && (
                              <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ds.description}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.3, flexShrink: 0 }}>
                            <Tooltip title="Chỉnh sửa dataset">
                              <IconButton size="small" onClick={e => openEdit(e, ds)}
                                sx={{ color: '#94a3b8', width: 28, height: 28, '&:hover': { color: '#fff', bgcolor: 'rgba(59,130,246,0.25)' } }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa dataset">
                              <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteTarget(ds); }}
                                sx={{ color: '#94a3b8', width: 28, height: 28, '&:hover': { color: '#fff', bgcolor: 'rgba(239,68,68,0.25)' } }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={0.8} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.6 }}>
                          <Chip size="small" label={`${total} ảnh`}
                            sx={{ bgcolor: 'rgba(59,130,246,0.14)', color: '#93c5fd', fontSize: 11, fontWeight: 700, height: 22 }} />
                          <Chip size="small" label={fmtDate(ds.created_at || ds.createdAt)}
                            sx={{ bgcolor: 'rgba(148,163,184,0.1)', color: MUTED, fontSize: 11, height: 22 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>

        {/* ── RIGHT: Detail & Upload ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: BG }}>
          {!selectedDs ? (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: MUTED, gap: 2 }}>
              <FolderIcon sx={{ fontSize: 72, opacity: 0.25 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>Chọn dataset để xem & upload ảnh</Typography>
              <Typography sx={{ fontSize: 14, color: '#475569' }}>Hoặc tạo dataset mới bằng nút "Tạo Dataset"</Typography>
            </Box>
          ) : (
            <>
              {/* right header */}
              <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ color: TEXT, fontWeight: 800, fontSize: 22 }}>{selectedDs.name}</Typography>
                      {isComplete ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: `${SUCCESS} !important` }} />}
                          label="Hoàn thành"
                          size="small"
                          sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: SUCCESS, fontWeight: 700, border: `1px solid rgba(34,197,94,0.3)` }}
                        />
                      ) : dsItems.length > 0 && (
                        <Chip label="Đang xử lý" size="small"
                          sx={{ bgcolor: 'rgba(245,158,11,0.14)', color: WARNING, fontWeight: 700, border: `1px solid rgba(245,158,11,0.3)` }} />
                      )}
                    </Box>
                    {selectedDs.description && (
                      <Typography sx={{ color: MUTED, fontSize: 13, mt: 0.3 }}>{selectedDs.description}</Typography>
                    )}
                    {isComplete && (
                      <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.4 }}>
                        Tất cả ảnh đã được duyệt • Click vào ảnh để xem annotator & labels
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                      label={`${dsItems.length} ảnh`}
                      sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: SUCCESS, fontWeight: 700, border: `1px solid rgba(34,197,94,0.3)` }}
                    />
                    <Button variant="contained"
                      startIcon={uploading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <UploadIcon />}
                      disabled={uploading} onClick={() => fileInputRef.current?.click()}
                      sx={{ bgcolor: PRIMARY, borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5, '&:hover': { bgcolor: '#2563eb' } }}>
                      {uploading ? `Đang upload ${uploadProgress}%` : 'Upload ảnh'}
                    </Button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.zip" hidden onChange={e => handleUpload(e.target.files)} />
                  </Stack>
                </Box>
                {uploading && (
                  <LinearProgress variant="determinate" value={uploadProgress}
                    sx={{ mt: 1.5, height: 4, borderRadius: 4, bgcolor: 'rgba(59,130,246,0.15)', '& .MuiLinearProgress-bar': { bgcolor: PRIMARY } }} />
                )}
              </Box>

              {/* drag & drop empty zone */}
              {dsItems.length === 0 && !itemsLoading && (
                <Box onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                  sx={{
                    m: 3, borderRadius: 3, border: `2px dashed ${BORDER}`, bgcolor: PANEL, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    py: 8, gap: 1.5, transition: 'all 0.2s',
                    '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.05)' },
                  }}>
                  <UploadIcon sx={{ fontSize: 52, color: MUTED, opacity: 0.6 }} />
                  <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>Kéo thả ảnh vào đây</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 13 }}>Hoặc click để chọn file • JPG, PNG, WEBP, ZIP</Typography>
                </Box>
              )}

              {/* images grid */}
              {itemsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                  <CircularProgress sx={{ color: PRIMARY }} />
                </Box>
              ) : dsItems.length > 0 && (
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                  {/* upload more compact bar */}
                  <Box onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                    sx={{
                      mb: 2, borderRadius: 2, border: `1px dashed ${BORDER}`, bgcolor: PANEL, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, transition: 'all 0.2s',
                      '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.05)' },
                    }}>
                    <UploadIcon sx={{ color: MUTED, fontSize: 20 }} />
                    <Typography sx={{ color: MUTED, fontSize: 13 }}>Kéo thả hoặc click để upload thêm ảnh</Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {dsItems.map((item, idx) => {
                      const id = coerceId(item) || idx;
                      const name = item.originalName || item.original_name || item.filename || `item-${idx + 1}`;
                      const src = buildImageUrl(item);
                      const isDeletingThis = deletingItemId === (coerceId(item) || item.path);
                      const approved = item.status === 'approved';
                      return (
                        <Grid item xs={6} sm={4} md={3} lg={2} key={id}>
                          <Card
                            sx={{
                              bgcolor: CARD,
                              border: `1px solid ${approved && isComplete ? 'rgba(34,197,94,0.35)' : BORDER}`,
                              borderRadius: 2, overflow: 'hidden', position: 'relative',
                              transition: 'border-color 0.15s',
                              '&:hover': { borderColor: isComplete ? SUCCESS : PRIMARY },
                            }}
                          >
                            {/* Image area — clickable */}
                            <Box
                              onClick={() => handleItemClick(item)}
                              sx={{ position: 'relative', pt: '75%', bgcolor: '#07101d', cursor: 'pointer' }}
                            >
                              <Box sx={{ position: 'absolute', inset: 0 }}>
                                <ImgThumb src={src} name={name} />
                              </Box>
                              {/* approved dot */}
                              {approved && (
                                <Box sx={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: '50%', bgcolor: SUCCESS, border: '1.5px solid rgba(0,0,0,0.5)', boxShadow: `0 0 4px ${SUCCESS}` }} />
                              )}
                            </Box>

                            {/* Footer: filename + delete button */}
                            <CardContent sx={{ p: '6px 8px', '&:last-child': { pb: '6px' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title={name}>
                                <Typography
                                  onClick={() => handleItemClick(item)}
                                  sx={{ color: TEXT, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'pointer' }}
                                >
                                  {name}
                                </Typography>
                              </Tooltip>
                              <Tooltip title="Xóa ảnh">
                                <IconButton
                                  size="small"
                                  onClick={e => handleDeleteItem(e, item)}
                                  disabled={!!isDeletingThis}
                                  sx={{
                                    flexShrink: 0, width: 22, height: 22,
                                    color: '#64748b',
                                    '&:hover': { color: '#fff', bgcolor: 'rgba(239,68,68,0.3)' },
                                  }}
                                >
                                  {isDeletingThis
                                    ? <CircularProgress size={11} sx={{ color: '#94a3b8' }} />
                                    : <DeleteIcon sx={{ fontSize: 13 }} />}
                                </IconButton>
                              </Tooltip>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* ── Create Dataset Dialog ── */}
      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2 }}>Tạo Dataset mới</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField fullWidth label="Tên dataset *" value={createForm.name}
              onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
              placeholder="VD: Ảnh chó mèo 2024" sx={inputSx} />
            <TextField fullWidth label="Mô tả" multiline minRows={3} value={createForm.description}
              onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả ngắn về bộ dữ liệu này..." sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}
            startIcon={creating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AddIcon />}
            sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
            {creating ? 'Đang tạo...' : 'Tạo Dataset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dataset Dialog ── */}
      <Dialog open={!!editDs} onClose={() => !editing && setEditDs(null)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2 }}>Chỉnh sửa Dataset</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField fullWidth label="Tên dataset *" value={editForm.name}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} sx={inputSx} />
            <TextField fullWidth label="Mô tả" multiline minRows={3} value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setEditDs(null)} disabled={editing} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editing}
            startIcon={editing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <EditIcon />}
            sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
            {editing ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dataset Confirm ── */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}
        PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Xóa Dataset</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa dataset <strong>"{deleteTarget?.name}"</strong>?</Typography>
          <Typography sx={{ color: DANGER, fontSize: 13, mt: 1 }}>⚠ Tất cả ảnh trong dataset này sẽ bị xóa vĩnh viễn.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>
            {deleting ? 'Đang xóa...' : 'Xóa Dataset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Item Detail Dialog (completed datasets) ── */}
      <ItemDetailDialog
        open={detailDialogOpen}
        onClose={() => { setDetailDialogOpen(false); setDetailItem(null); }}
        item={detailItem}
      />

      {/* ── Toast ── */}
      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

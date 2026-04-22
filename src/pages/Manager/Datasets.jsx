import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  FolderOpen as FolderIcon,
  Image as ImageIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

/* ─── THEME TOKENS ─────────────────────────────────────── */
const BG       = '#080f1e';
const PANEL    = '#0f1a2e';
const CARD     = '#131f35';
const BORDER   = '#1e2d47';
const PRIMARY  = '#3b82f6';
const TEXT     = '#e2e8f0';
const MUTED    = '#64748b';
const SUCCESS  = '#22c55e';
const DANGER   = '#ef4444';

/* ─── HELPERS ────────────────────────────────────────────── */
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const coerceId = (obj) => obj?._id || obj?.id || '';

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
};

const buildImageUrl = (item) => {
  if (!item) return '';
  const base = API_URL.replace(/\/+$/, '');
  const direct = item.signed_url || item.signedUrl || item.storage_url || item.storageUrl || item.url || item.imageUrl || '';
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  const filename = item.originalName || item.original_name || item.filename || '';
  const rawPath = (item.path || item.storagePath || item.storage_path || direct || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (rawPath) {
    const idx = rawPath.indexOf('uploads/');
    const rel = idx !== -1 ? rawPath.substring(idx) : rawPath;
    const last = rel.split('/').pop();
    if (/\.\w{1,10}$/i.test(last)) return `${base}/${rel.startsWith('uploads/') ? rel : `uploads/datasets/${rel}`}`;
  }
  return filename ? `${base}/uploads/datasets/${filename}` : '';
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f',
    color: TEXT,
    borderRadius: '10px',
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

/* image thumbnail with fallback */
const ImgThumb = ({ src, name }) => {
  const [err, setErr] = useState(false);
  return err || !src ? (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', bgcolor: '#07101d' }}>
      <ImageIcon sx={{ color: MUTED, fontSize: 32 }} />
    </Box>
  ) : (
    <Box component="img" src={src} alt={name} onError={() => setErr(true)}
      sx={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function Datasets() {
  const fileInputRef = useRef(null);

  /* list state */
  const [datasets, setDatasets]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState({ open:false, msg:'', sev:'success' });

  /* create-dataset dialog */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name:'', description:'' });
  const [creating, setCreating]     = useState(false);

  /* detail panel (right side) */
  const [selectedDs, setSelectedDs] = useState(null);
  const [dsItems, setDsItems]       = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /* delete dialog */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

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

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasets.filter(ds =>
      !q || (ds.name || '').toLowerCase().includes(q) || (ds.description || '').toLowerCase().includes(q)
    );
  }, [datasets, search]);

  /* ── create dataset ── */
  const handleCreate = async () => {
    if (!createForm.name.trim()) return showToast('Vui lòng nhập tên dataset', 'warning');
    setCreating(true);
    try {
      const payload = { 
        name: createForm.name.trim(), 
        description: createForm.description.trim(), 
        type: 'image',
        // The backend requires a valid UUID format for topic_id, even if the topic table doesn't exist anymore
        topic_id: crypto.randomUUID()
      };
      await axios.post(`${API_URL}/api/datasets`, payload, { headers: getAuthHeaders() });
      setCreateOpen(false);
      setCreateForm({ name:'', description:'' });
      await fetchDatasets();
      showToast('Tạo dataset thành công');
    } catch (e) {
      let errorMsg = 'Tạo dataset thất bại';
      const data = e?.response?.data;
      if (data) {
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMsg = data.errors.map(err => err.message || JSON.stringify(err)).join(', ');
        } else if (data.message) {
          errorMsg = data.message;
        } else if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
          } else {
            errorMsg = String(data.detail);
          }
        }
      } else if (e.message) {
        errorMsg = e.message;
      }
      showToast(errorMsg, 'error');
    } finally {
      setCreating(false);
    }
  };

  /* ── upload images ── */
  const handleUpload = async (files) => {
    if (!selectedDs || !files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      await axios.post(
        `${API_URL}/api/datasets/${coerceId(selectedDs)}/upload`,
        fd,
        {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
        }
      );
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
      if (coerceId(selectedDs) === coerceId(deleteTarget)) {
        setSelectedDs(null);
        setDsItems([]);
      }
      await fetchDatasets();
      showToast('Xóa dataset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa dataset thất bại', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ── drag & drop ── */
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) handleUpload(files);
  };

  const showToast = (msg, sev = 'success') => setToast({ open: true, msg, sev });

  /* ═══════════════════════════════════════════════════════ */
  return (
    <Box sx={{ minHeight:'100vh', bgcolor: BG, display:'flex', flexDirection:'column' }}>
      {/* ── Header ── */}
      <Box sx={{ px:3.5, py:3, borderBottom:`1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:2 }}>
          <Box>
            <Typography sx={{ color: TEXT, fontSize: 28, fontWeight: 800, lineHeight:1 }}>Datasets</Typography>
            <Typography sx={{ color: MUTED, mt:0.5, fontSize:14 }}>Quản lý bộ ảnh cho dự án annotation</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchDatasets} sx={{ color: MUTED, '&:hover':{ color: TEXT, bgcolor:'rgba(255,255,255,0.06)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: PRIMARY, borderRadius:2, fontWeight:700, textTransform:'none', px:2.5, '&:hover':{ bgcolor:'#2563eb' } }}
            >
              Tạo Dataset
            </Button>
          </Stack>
        </Box>

        {/* Summary stats */}
        <Stack direction="row" spacing={0} divider={<Box sx={{ width:'1px', bgcolor: BORDER, my:0.5 }} />}
          sx={{ mt:2.5, bgcolor:'#07101d', borderRadius:2, border:`1px solid ${BORDER}`, display:'inline-flex', overflow:'hidden' }}>
          <Box sx={{ py:1.5, px:3 }}>
            <StatBadge label="Tổng datasets" value={datasets.length} color={PRIMARY} />
          </Box>
          <Box sx={{ py:1.5, px:3 }}>
            <StatBadge label="Đang chọn" value={selectedDs ? '1' : '0'} color={SUCCESS} />
          </Box>
          <Box sx={{ py:1.5, px:3 }}>
            <StatBadge label="Ảnh trong dataset" value={dsItems.length} color="#f59e0b" />
          </Box>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mx:3, mt:2, borderRadius:2 }}>{error}</Alert>}

      {/* ── Main body: left list + right detail ── */}
      <Box sx={{ flex:1, display:'flex', overflow:'hidden', gap:0 }}>

        {/* ── LEFT: Dataset List ── */}
        <Box sx={{ width:340, minWidth:280, borderRight:`1px solid ${BORDER}`, bgcolor: PANEL, display:'flex', flexDirection:'column', flexShrink:0 }}>
          {/* search */}
          <Box sx={{ p:2, borderBottom:`1px solid ${BORDER}` }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm dataset..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={inputSx}
              InputProps={{ startAdornment: <SearchIcon sx={{ color: MUTED, mr:1, fontSize:20 }} /> }}
            />
          </Box>

          {/* list */}
          <Box sx={{ flex:1, overflowY:'auto', p:1.5 }}>
            {loading ? (
              <Box sx={{ display:'flex', justifyContent:'center', pt:4 }}>
                <CircularProgress size={28} sx={{ color: PRIMARY }} />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign:'center', py:6, color: MUTED }}>
                <FolderIcon sx={{ fontSize:48, mb:1, opacity:0.4 }} />
                <Typography>Chưa có dataset nào</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {filtered.map(ds => {
                  const isSelected = coerceId(selectedDs) === coerceId(ds);
                  const total = ds.total_items || ds.totalItems || 0;
                  return (
                    <Card
                      key={coerceId(ds)}
                      onClick={() => setSelectedDs(ds)}
                      sx={{
                        bgcolor: isSelected ? 'rgba(59,130,246,0.15)' : CARD,
                        border: `1px solid ${isSelected ? PRIMARY : BORDER}`,
                        borderRadius:2,
                        cursor:'pointer',
                        transition:'all 0.15s',
                        '&:hover': { borderColor: isSelected ? PRIMARY : '#2d4a6e', bgcolor: isSelected ? 'rgba(59,130,246,0.18)' : '#172133' },
                      }}
                    >
                      <CardContent sx={{ p:1.8, '&:last-child':{ pb:1.8 } }}>
                        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:1 }}>
                          <Box sx={{ minWidth:0, flex:1 }}>
                            <Typography sx={{ color: TEXT, fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {ds.name || 'Untitled'}
                            </Typography>
                            {ds.description && (
                              <Typography sx={{ color: MUTED, fontSize:12, mt:0.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {ds.description}
                              </Typography>
                            )}
                          </Box>
                          <IconButton
                            size="small"
                            onClick={e => { e.stopPropagation(); setDeleteTarget(ds); }}
                            sx={{ color: MUTED, flexShrink:0, '&:hover':{ color: DANGER, bgcolor:'rgba(239,68,68,0.1)' } }}
                          >
                            <DeleteIcon sx={{ fontSize:16 }} />
                          </IconButton>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt:1.2, flexWrap:'wrap', gap:0.6 }}>
                          <Chip size="small" label={`${total} ảnh`}
                            sx={{ bgcolor:'rgba(59,130,246,0.14)', color:'#93c5fd', fontSize:11, fontWeight:700, height:22 }} />
                          <Chip size="small" label={fmtDate(ds.created_at || ds.createdAt)}
                            sx={{ bgcolor:'rgba(148,163,184,0.1)', color: MUTED, fontSize:11, height:22 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>

        {/* ── RIGHT: Dataset Detail & Upload ── */}
        <Box sx={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', bgcolor: BG }}>
          {!selectedDs ? (
            <Box sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color: MUTED, gap:2 }}>
              <FolderIcon sx={{ fontSize:72, opacity:0.25 }} />
              <Typography sx={{ fontSize:18, fontWeight:600 }}>Chọn dataset để xem & upload ảnh</Typography>
              <Typography sx={{ fontSize:14, color:'#475569' }}>Hoặc tạo dataset mới bằng nút "Tạo Dataset"</Typography>
            </Box>
          ) : (
            <>
              {/* header */}
              <Box sx={{ px:3.5, py:2.5, borderBottom:`1px solid ${BORDER}`, bgcolor: PANEL }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:2, flexWrap:'wrap' }}>
                  <Box>
                    <Typography sx={{ color: TEXT, fontWeight:800, fontSize:22 }}>{selectedDs.name}</Typography>
                    {selectedDs.description && (
                      <Typography sx={{ color: MUTED, fontSize:13, mt:0.3 }}>{selectedDs.description}</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize:'14px !important' }} />}
                      label={`${dsItems.length} ảnh`}
                      sx={{ bgcolor:'rgba(34,197,94,0.15)', color: SUCCESS, fontWeight:700, border:`1px solid rgba(34,197,94,0.3)` }}
                    />
                    <Button
                      variant="contained"
                      startIcon={uploading ? <CircularProgress size={14} sx={{ color:'#fff' }} /> : <UploadIcon />}
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ bgcolor: PRIMARY, borderRadius:2, fontWeight:700, textTransform:'none', px:2.5, '&:hover':{ bgcolor:'#2563eb' } }}
                    >
                      {uploading ? `Đang upload ${uploadProgress}%` : 'Upload ảnh'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.zip"
                      hidden
                      onChange={e => handleUpload(e.target.files)}
                    />
                  </Stack>
                </Box>
                {uploading && (
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{ mt:1.5, height:4, borderRadius:4, bgcolor:'rgba(59,130,246,0.15)', '& .MuiLinearProgress-bar':{ bgcolor: PRIMARY } }}
                  />
                )}
              </Box>

              {/* drag & drop zone (shows only when empty) */}
              {dsItems.length === 0 && !itemsLoading && (
                <Box
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    m:3, borderRadius:3, border:`2px dashed ${BORDER}`, bgcolor: PANEL, cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    py:8, gap:1.5, transition:'all 0.2s',
                    '&:hover':{ borderColor: PRIMARY, bgcolor:'rgba(59,130,246,0.05)' },
                  }}
                >
                  <UploadIcon sx={{ fontSize:52, color: MUTED, opacity:0.6 }} />
                  <Typography sx={{ color: TEXT, fontWeight:700, fontSize:16 }}>Kéo thả ảnh vào đây</Typography>
                  <Typography sx={{ color: MUTED, fontSize:13 }}>Hoặc click để chọn file • JPG, PNG, WEBP, ZIP (max 50 files, 500MB mỗi file)</Typography>
                </Box>
              )}

              {/* images grid */}
              {itemsLoading ? (
                <Box sx={{ display:'flex', justifyContent:'center', pt:6 }}>
                  <CircularProgress sx={{ color: PRIMARY }} />
                </Box>
              ) : dsItems.length > 0 && (
                <Box sx={{ flex:1, overflowY:'auto', p:2.5 }}>
                  {/* upload more zone (compact) */}
                  <Box
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      mb:2, borderRadius:2, border:`1px dashed ${BORDER}`, bgcolor: PANEL, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:1.5, px:2.5, py:1.5, transition:'all 0.2s',
                      '&:hover':{ borderColor: PRIMARY, bgcolor:'rgba(59,130,246,0.05)' },
                    }}
                  >
                    <UploadIcon sx={{ color: MUTED, fontSize:20 }} />
                    <Typography sx={{ color: MUTED, fontSize:13 }}>Kéo thả hoặc click để upload thêm ảnh</Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {dsItems.map((item, idx) => {
                      const id = coerceId(item) || idx;
                      const name = item.originalName || item.original_name || item.filename || `item-${idx+1}`;
                      const src = buildImageUrl(item);
                      return (
                        <Grid item xs={6} sm={4} md={3} lg={2} key={id}>
                          <Card sx={{ bgcolor: CARD, border:`1px solid ${BORDER}`, borderRadius:2, overflow:'hidden' }}>
                            <Box sx={{ position:'relative', pt:'75%', bgcolor:'#07101d' }}>
                              <Box sx={{ position:'absolute', inset:0 }}>
                                <ImgThumb src={src} name={name} />
                              </Box>
                            </Box>
                            <CardContent sx={{ p:1, '&:last-child':{ pb:1 } }}>
                              <Tooltip title={name}>
                                <Typography sx={{ color: TEXT, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {name}
                                </Typography>
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
        PaperProps={{ sx:{ bgcolor:'#0d1829', border:`1px solid ${BORDER}`, borderRadius:3, color: TEXT } }}>
        <DialogTitle sx={{ fontWeight:800, borderBottom:`1px solid ${BORDER}`, pb:2 }}>Tạo Dataset mới</DialogTitle>
        <DialogContent sx={{ pt:3 }}>
          <Stack spacing={2.5}>
            <TextField fullWidth label="Tên dataset *" value={createForm.name}
              onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
              placeholder="VD: Ảnh chó mèo 2024" sx={inputSx} />
            <TextField fullWidth label="Mô tả" multiline minRows={3} value={createForm.description}
              onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả ngắn về bộ dữ liệu này..." sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop:`1px solid ${BORDER}`, px:3, py:2, gap:1 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}
            sx={{ color: MUTED, textTransform:'none' }}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}
            startIcon={creating ? <CircularProgress size={16} sx={{ color:'#fff' }} /> : <AddIcon />}
            sx={{ bgcolor: PRIMARY, textTransform:'none', fontWeight:700, borderRadius:2, px:3, '&:hover':{ bgcolor:'#2563eb' } }}>
            {creating ? 'Đang tạo...' : 'Tạo Dataset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}
        PaperProps={{ sx:{ bgcolor:'#0d1829', border:`1px solid ${BORDER}`, borderRadius:3, color: TEXT } }}>
        <DialogTitle sx={{ fontWeight:800 }}>Xóa Dataset</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa dataset <strong>"{deleteTarget?.name}"</strong>?</Typography>
          <Typography sx={{ color: DANGER, fontSize:13, mt:1 }}>
            ⚠ Tất cả ảnh trong dataset này sẽ bị xóa vĩnh viễn.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px:3, py:2, gap:1 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: MUTED, textTransform:'none' }}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} sx={{ color:'#fff' }} /> : <DeleteIcon />}
            sx={{ textTransform:'none', fontWeight:700, borderRadius:2, px:3 }}>
            {deleting ? 'Đang xóa...' : 'Xóa Dataset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p => ({ ...p, open:false }))}
        anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p => ({ ...p, open:false }))} sx={{ borderRadius:2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
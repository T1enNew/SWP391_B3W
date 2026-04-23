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
  InfoOutlined as InfoIcon,
  FileDownload as DownloadIcon,
  TaskAlt as TaskAltIcon,
  HourglassTop as PendingIcon,
  Pending as ReviewIcon,
} from '@mui/icons-material';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';
import ImageViewer from '../../../components/ImageViewer';
import { getLabelColor } from '../Projects/ProjectDetail/utils';
import FormControlLabel from '@mui/material/FormControlLabel';

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

const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const DsInfoRow = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', gap: 1, py: 0.8, borderBottom: `1px solid ${BORDER}` }}>
    <Typography sx={{ color: MUTED, fontSize: 13, minWidth: 120, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ color: color || TEXT, fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value ?? '—'}</Typography>
  </Box>
);

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
  const [showLabels, setShowLabels] = useState(true);
  const [visibleMap, setVisibleMap] = useState({});

  const annotatorLabels = item?.annotatorLabels || [];

  useEffect(() => {
    const init = {};
    annotatorLabels.forEach(a => { init[a.name] = true; });
    setVisibleMap(init);
  }, [item]);

  const visibleAnnotations = annotatorLabels.flatMap(ann => {
    if (!showLabels || !visibleMap[ann.name]) return [];
    return (ann.annotations || []).filter(x => x?.bbox);
  });

  const formattedAnnotations = visibleAnnotations.map(ann => {
    let bbox = Array.isArray(ann.bbox) ? ann.bbox : [0, 0, 0, 0];
    if (bbox.length === 4 && bbox.every(v => v <= 1 && v >= 0)) bbox = bbox.map(v => v * 100);
    return { label: ann.label, bbox };
  });

  const uniqueLabels = [...new Set(formattedAnnotations.map(a => a.label))];
  const labelSetForViewer = uniqueLabels.map(lbl => ({ name: lbl, color: getLabelColor(lbl) }));

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { bgcolor: '#111827', border: '1px solid #243041', borderRadius: 3, color: TEXT } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #243041', fontWeight: 800, fontSize: 16 }}>
        Approved item detail
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Image with bbox overlay */}
          <Grid item xs={12} md={7}>
            <Box sx={{ position: 'relative', width: '100%', minHeight: 420, borderRadius: 3, overflow: 'hidden', bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageViewer imageUrl={item.fileUrl} annotations={formattedAnnotations} labelSet={labelSetForViewer} />
            </Box>
          </Grid>

          {/* Info sidebar */}
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>File</Typography>
                <Typography fontWeight={700}>{item.fileName || item.originalName || item.filename || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Item ID</Typography>
                <Typography sx={{ fontSize: 12, wordBreak: 'break-all' }}>{item.itemId || item._id || item.id || '—'}</Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Approved annotators</Typography>
                  <FormControlLabel
                    control={<Switch checked={showLabels} onChange={e => setShowLabels(e.target.checked)} size="small" />}
                    label="Show labels"
                    sx={{ color: '#94a3b8', mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                  />
                </Box>
                <Stack spacing={1.2}>
                  {annotatorLabels.length === 0 ? (
                    <Typography sx={{ color: MUTED, fontSize: 13 }}>Không có annotation được duyệt</Typography>
                  ) : annotatorLabels.map((ann, idx) => (
                    <Box key={`${ann.name}-${idx}`} sx={{ p: 1.2, borderRadius: 2, bgcolor: '#1f2937', border: '1px solid #334155' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={ann.isPrimary ? `${ann.name} • PRIMARY` : ann.name}
                          sx={{
                            bgcolor: ann.isPrimary ? 'rgba(245,158,11,0.22)' : 'rgba(34,197,94,0.18)',
                            color: ann.isPrimary ? '#fbbf24' : '#22c55e',
                            fontWeight: 700, fontSize: 12,
                          }}
                        />
                        {showLabels && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={visibleMap[ann.name] ?? true}
                                onChange={e => setVisibleMap(prev => ({ ...prev, [ann.name]: e.target.checked }))}
                                size="small"
                              />
                            }
                            label="Visible"
                            sx={{ color: '#94a3b8', mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', mt: 1 }}>
                        {(ann.labels || []).length === 0 ? (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>No label</Typography>
                        ) : ann.labels.map((label, li) => (
                          <Chip key={li} label={label} size="small"
                            sx={{ bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700 }} />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #243041', px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: '#94a3b8', borderColor: '#334155', textTransform: 'none', '&:hover': { borderColor: '#64748b' } }}>
          Close
        </Button>
      </DialogActions>
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
  const [linkedTasks, setLinkedTasks]     = useState([]);

  /* delete dataset */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  /* info dialog */
  const [infoDs, setInfoDs] = useState(null);

  /* delete item */
  const [deletingItemId, setDeletingItemId] = useState(null);

  /* item detail dialog (shown when dataset is complete) */
  const [detailItem, setDetailItem]           = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  /* pre-loaded status map for all datasets {dsId → {isComplete, inProgress, tasks}} */
  const [dsStatusMap, setDsStatusMap] = useState({});

  const tasksByItemId = useMemo(() => {
    const byId  = new Map();
    const byName = new Map();
    linkedTasks.forEach(t => {
      const di = t.dataItem || t.data_item;
      // dataItem can be a plain string ID or an object
      const itemId = typeof di === 'string' ? di : (di?._id || di?.id || '');
      if (itemId) {
        if (!byId.has(itemId))  byId.set(itemId, []);
        byId.get(itemId).push(t);
      }
      const fname = typeof di === 'object'
        ? (di?.originalName || di?.original_name || di?.filename || '')
        : '';
      if (fname) {
        if (!byName.has(fname)) byName.set(fname, []);
        byName.get(fname).push(t);
      }
    });
    return { byId, byName };
  }, [linkedTasks]);

  const getTasksForItem = useCallback((item) => {
    const id    = coerceId(item);
    const fname = item?.originalName || item?.original_name || item?.filename || '';
    const byId  = (id    ? (tasksByItemId.byId?.get(id)     || []) : []);
    const byN   = (fname ? (tasksByItemId.byName?.get(fname) || []) : []);
    const seen  = new Set();
    return [...byId, ...byN].filter(t => {
      const k = t.id || t._id || '';
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }, [tasksByItemId]);

  const isComplete = useMemo(() => {
    if (dsItems.length === 0) return false;
    if (dsItems.every(i => i.status === 'approved')) return true;
    const approvedTaskCount = linkedTasks.filter(t => t.status === 'approved').length;
    if (linkedTasks.length > 0 && approvedTaskCount >= dsItems.length) return true;
    return false;
  }, [dsItems, linkedTasks]);

  const dsStats = useMemo(() => {
    const approved  = linkedTasks.filter(t => t.status === 'approved').length;
    const reviewing = linkedTasks.filter(t => t.status === 'submitted').length;
    const rework    = linkedTasks.filter(t => t.status === 'rejected').length;
    const annotating = linkedTasks.filter(t => !['approved','submitted','rejected'].includes(t.status)).length;
    return { approved, reviewing, rework, annotating };
  }, [linkedTasks]);

  const handleExport = () => {
    if (!selectedDs || !isComplete) return;
    const seenKeys = new Set();
    const items = dsItems.map(item => {
      const keys = [coerceId(item), item?.originalName, item?.original_name, item?.filename].filter(Boolean);
      const entry = keys.reduce((f, k) => f || approvedItemsMap.get(k), null);
      const fname = item?.originalName || item?.original_name || item?.filename || coerceId(item);
      return {
        id: coerceId(item),
        filename: fname,
        url: buildImageUrl(item),
        status: 'approved',
        annotations: (entry?.annotatorLabels || []).map(ann => ({
          annotator: ann.name,
          labels: ann.labels,
          bboxes: (ann.annotations || [])
            .filter(a => a.bbox)
            .map(a => ({ label: a.label, bbox: a.bbox })),
          spans: (ann.annotations || [])
            .filter(a => a.start !== undefined)
            .map(a => ({ label: a.label, start: a.start, end: a.end })),
        })),
      };
    });
    const payload = {
      dataset: {
        id: coerceId(selectedDs),
        name: selectedDs.name,
        description: selectedDs.description || '',
        type: selectedDs.type || 'image',
        totalItems: dsItems.length,
        exportedAt: new Date().toISOString(),
      },
      summary: {
        total: dsItems.length,
        approved: dsStats.approved,
        reviewing: dsStats.reviewing,
        rework: dsStats.rework,
        annotating: dsStats.annotating,
      },
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${selectedDs.name.replace(/\s+/g, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build approvedItemsMap keyed by filename (most reliable cross-entity key)
  const approvedItemsMap = useMemo(() => {
    const map = new Map(); // key: filename → approvedItem
    linkedTasks.filter(t => t.status === 'approved').forEach(task => {
      const di = task.dataItem || task.data_item || {};
      const annotatorObj = task.annotatorId || task.annotator || {};
      const name = typeof annotatorObj === 'string'
        ? annotatorObj
        : (annotatorObj?.fullName || annotatorObj?.full_name || annotatorObj?.username || 'Annotator');

      // Keys to index by
      const keys = [
        typeof di === 'string' ? di : null,
        di?._id, di?.id,
        di?.originalName, di?.original_name, di?.filename,
      ].filter(Boolean);

      const L = task.labels || task.annotation_data || task.annotationData || {};
      const raw = L?.bboxes || L?.objects || L?.spans || L?.segments || (Array.isArray(L) ? L : []);
      const annotations = (Array.isArray(raw) ? raw : [raw]).map(x => ({
        label: typeof x === 'string' ? x : (x?.label || x?.text || x?.name || 'unknown'),
        bbox: x?.bbox || x?.box || (x?.x !== undefined ? [x.x, x.y, x.x + (x.width || 0), x.y + (x.height || 0)] : null),
        start: x?.start,
        end: x?.end,
      })).filter(a => a.label && a.label !== 'unknown');
      const labels = [...new Set(annotations.map(a => a.label))];

      const primaryKey = keys[0];
      if (!primaryKey) return;

      if (!map.has(primaryKey)) {
        map.set(primaryKey, {
          fileName: di?.originalName || di?.original_name || di?.filename || primaryKey,
          fileUrl: (() => {
            if (!di || typeof di === 'string') return '';
            const base = API_URL.replace(/\/+$/, '');
            const direct = di.signed_url || di.signedUrl || di.storage_url || di.storageUrl || di.url || '';
            if (direct && /^https?:\/\//i.test(direct)) return direct;
            const rawPath = (di.path || di.storagePath || di.storage_path || direct || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (rawPath) {
              const idx = rawPath.indexOf('uploads/');
              const rel = idx !== -1 ? rawPath.substring(idx) : rawPath;
              if (/\.\w{1,10}$/i.test(rel.split('/').pop())) return `${base}/${rel.startsWith('uploads/') ? rel : `uploads/datasets/${rel}`}`;
            }
            const fname = di.originalName || di.original_name || di.filename || '';
            return fname ? `${base}/uploads/datasets/${fname}` : '';
          })(),
          itemId: di?._id || di?.id || primaryKey,
          mediaType: 'image',
          annotatorLabels: [{ name, labels, annotations, isPrimary: false }],
          _keys: keys,
        });
      } else {
        const entry = map.get(primaryKey);
        if (!entry.annotatorLabels.find(a => a.name === name)) {
          entry.annotatorLabels.push({ name, labels, annotations, isPrimary: false });
        }
      }
      // Add alias keys pointing to same entry
      keys.slice(1).forEach(k => { if (!map.has(k)) map.set(k, map.get(primaryKey)); });
    });
    return map;
  }, [linkedTasks]);

  /* ── pre-load task counts for all datasets so cards show status without clicking ── */
  const buildDsStatusMap = useCallback(async (dsList) => {
    if (!dsList?.length) return;
    try {
      const pjRes = await axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers: getAuthHeaders() });
      const pjList = Array.isArray(pjRes.data) ? pjRes.data : pjRes.data?.data || pjRes.data?.projects || [];

      const taskResults = await Promise.allSettled(
        pjList.map(p => axios.get(`${API_URL}/api/tasks/project/${coerceId(p)}`, { headers: getAuthHeaders() }))
      );

      const tasksByDs = {};
      taskResults.forEach((r, idx) => {
        if (r.status !== 'fulfilled') return;
        const tasks = Array.isArray(r.value.data) ? r.value.data : r.value.data?.data || r.value.data?.tasks || [];
        const proj = pjList[idx];
        const dsId = String(
          proj.dataset?.id || proj.dataset?._id
          || (typeof proj.dataset === 'string' ? proj.dataset : null)
          || proj.dataset_id || proj.datasetId || ''
        );
        if (!dsId || dsId === 'null' || dsId === 'undefined') return;
        if (!tasksByDs[dsId]) tasksByDs[dsId] = [];
        tasksByDs[dsId].push(...tasks);
      });

      const newMap = {};
      dsList.forEach(ds => {
        const dsId = String(coerceId(ds));
        const tasks = tasksByDs[dsId] || [];
        const total = ds.total_items || ds.totalItems || 0;
        const approved = tasks.filter(t => t.status === 'approved').length;
        const isComplete = total > 0 && approved >= total;
        const inProgress = !isComplete && tasks.length > 0;
        newMap[dsId] = { isComplete, inProgress, approved, total, tasks };
      });
      setDsStatusMap(newMap);
    } catch { /* silent */ }
  }, []);

  /* ── loaders ── */
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() });
      const list = getArray(res.data);
      setDatasets(list);
      buildDsStatusMap(list); // fire & forget — populates dsStatusMap for all cards
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được danh sách dataset');
    } finally {
      setLoading(false);
    }
  }, [buildDsStatusMap]);

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

  const fetchLinkedTasks = useCallback(async (ds) => {
    if (!ds) return;
    setLinkedTasks([]);
    try {
      const pjRes = await axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers: getAuthHeaders() });
      const pjList = Array.isArray(pjRes.data) ? pjRes.data : pjRes.data?.data || pjRes.data?.projects || [];
      const dsId = coerceId(ds);
      const linked = pjList.filter(p => {
        const did = p.dataset?.id || p.dataset?._id
          || (typeof p.dataset === 'string' ? p.dataset : null)
          || p.dataset_id || p.datasetId;
        return String(did) === String(dsId);
      });
      const taskResults = await Promise.allSettled(
        linked.map(p => axios.get(`${API_URL}/api/tasks/project/${coerceId(p)}`, { headers: getAuthHeaders() }))
      );
      const allTasks = taskResults.flatMap(r => {
        if (r.status !== 'fulfilled') return [];
        const d = r.value.data;
        return Array.isArray(d) ? d : d?.data || d?.tasks || [];
      });
      setLinkedTasks(allTasks);
    } catch {
      setLinkedTasks([]);
    }
  }, []);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  useEffect(() => {
    if (selectedDs) {
      fetchDatasetItems(selectedDs);
      const preloaded = dsStatusMap[String(coerceId(selectedDs))]?.tasks;
      if (preloaded?.length) {
        setLinkedTasks(preloaded);
      } else {
        fetchLinkedTasks(selectedDs);
      }
    }
  }, [selectedDs, fetchDatasetItems, fetchLinkedTasks, dsStatusMap]);

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
      if (coerceId(selectedDs) === coerceId(deleteTarget)) { setSelectedDs(null); setDsItems([]); setLinkedTasks([]); }
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
      const itemId = coerceId(item);
      const itemFilename = item?.originalName || item?.original_name || item?.filename || '';

      // Find all approved tasks that reference this dataset item (flexible matching)
      const matchingTasks = linkedTasks.filter(t => {
        if (t.status !== 'approved') return false;
        const di = t.dataItem || t.data_item;
        if (!di) return false;
        const diId = typeof di === 'string' ? di : (di?._id || di?.id || '');
        if (itemId && diId && String(diId) === String(itemId)) return true;
        const diName = typeof di === 'object' ? (di?.originalName || di?.original_name || di?.filename || '') : '';
        if (itemFilename && diName) {
          if (diName === itemFilename) return true;
          const diBase = diName.replace(/^\d+_/, '');
          const itemBase = itemFilename.replace(/^\d+_/, '');
          if (diBase === itemFilename || itemFilename === diBase || diBase === itemBase) return true;
        }
        return false;
      });

      // Group by annotator, deduplicate
      const annotatorMap = new Map();
      matchingTasks.forEach(task => {
        const di = task.dataItem || task.data_item || {};
        const annotatorObj = task.annotatorId || task.annotator || {};
        const name = typeof annotatorObj === 'string'
          ? annotatorObj
          : (annotatorObj?.fullName || annotatorObj?.full_name || annotatorObj?.name || annotatorObj?.username || 'Annotator');
        const L = task.labels || task.annotation_data || task.annotationData || {};
        const raw = L?.bboxes || L?.objects || L?.spans || L?.segments || (Array.isArray(L) ? L : []);
        const annotations = (Array.isArray(raw) ? raw : [raw]).map(x => ({
          label: typeof x === 'string' ? x : (x?.label || x?.text || x?.name || 'unknown'),
          bbox: x?.bbox || x?.box || (x?.x !== undefined ? [x.x, x.y, x.x + (x.width || 0), x.y + (x.height || 0)] : null),
          start: x?.start, end: x?.end,
        })).filter(a => a.label && a.label !== 'unknown');
        const directLabels = Array.isArray(L?.labels) ? L.labels : (L?.label ? [L.label] : []);
        const labels = [...new Set([...annotations.map(a => a.label), ...directLabels])];
        if (!annotatorMap.has(name)) {
          annotatorMap.set(name, { name, labels, annotations, isPrimary: false });
        }
      });

      const diObj = typeof (matchingTasks[0]?.dataItem || matchingTasks[0]?.data_item) === 'object'
        ? (matchingTasks[0]?.dataItem || matchingTasks[0]?.data_item || {}) : {};
      const fileUrl = buildImageUrl(Object.keys(diObj).length ? diObj : item);

      setDetailItem({
        fileName: itemFilename,
        fileUrl,
        itemId,
        mediaType: 'image',
        annotatorLabels: [...annotatorMap.values()],
      });
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
                  const mapEntry = dsStatusMap[String(coerceId(ds))];
                  const dsComplete = isSelected ? isComplete : (mapEntry?.isComplete ?? false);
                  const dsInProgress = isSelected
                    ? (!isComplete && dsItems.length > 0)
                    : (!dsComplete && (mapEntry?.inProgress ?? (total > 0 && !mapEntry)));
                  return (
                    <Card key={coerceId(ds)} onClick={() => setSelectedDs(ds)} sx={{
                      bgcolor: isSelected ? 'rgba(59,130,246,0.12)' : CARD,
                      border: `1px solid ${dsComplete ? 'rgba(34,197,94,0.5)' : isSelected ? PRIMARY : BORDER}`,
                      borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { borderColor: dsComplete ? SUCCESS : isSelected ? PRIMARY : '#2d4a6e', bgcolor: isSelected ? 'rgba(59,130,246,0.18)' : '#172133' },
                    }}>
                      <CardContent sx={{ p: '12px 14px', '&:last-child': { pb: '12px' } }}>
                        {/* Top row: name + status dot + actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              bgcolor: dsComplete ? SUCCESS : dsInProgress ? WARNING : '#475569',
                              boxShadow: dsComplete ? `0 0 6px ${SUCCESS}` : 'none',
                            }} />
                            <Typography sx={{ color: '#ffffff', fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.1 }}>
                              {ds.name || 'Untitled'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.3, flexShrink: 0 }}>
                            <Tooltip title="Thông tin">
                              <IconButton size="small" onClick={e => { e.stopPropagation(); setInfoDs(ds); }}
                                sx={{ color: '#475569', width: 24, height: 24, '&:hover': { color: '#fff', bgcolor: 'rgba(59,130,246,0.25)' } }}>
                                <InfoIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton size="small" onClick={e => openEdit(e, ds)}
                                sx={{ color: '#475569', width: 24, height: 24, '&:hover': { color: '#fff', bgcolor: 'rgba(59,130,246,0.25)' } }}>
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteTarget(ds); }}
                                sx={{ color: '#475569', width: 24, height: 24, '&:hover': { color: '#fff', bgcolor: 'rgba(239,68,68,0.25)' } }}>
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        {ds.description && (
                          <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.4, pl: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ds.description}
                          </Typography>
                        )}

                        {/* Status badge + meta */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1, pl: '16px', flexWrap: 'wrap' }}>
                          {dsComplete && (
                            <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: '11px !important', color: `${SUCCESS} !important` }} />}
                              label="Hoàn thành"
                              sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: SUCCESS, fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(34,197,94,0.3)` }} />
                          )}
                          {dsInProgress && (
                            <Chip size="small" label="Đang xử lý"
                              sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: WARNING, fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(245,158,11,0.3)` }} />
                          )}
                          <Chip size="small" label={`${total} ảnh`}
                            sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontSize: 10, fontWeight: 700, height: 20 }} />
                          <Typography sx={{ color: '#334155', fontSize: 10 }}>
                            {fmtDate(ds.created_at || ds.createdAt)}
                          </Typography>
                        </Box>
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
              <Box sx={{
                px: 3, py: 2, borderBottom: `1px solid ${BORDER}`,
                bgcolor: isComplete ? 'rgba(34,197,94,0.04)' : PANEL,
                borderTop: isComplete ? `2px solid rgba(34,197,94,0.35)` : 'none',
              }}>
                {/* Row 1: name + status + actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', minWidth: 0 }}>
                    <Typography sx={{ color: TEXT, fontWeight: 800, fontSize: 20 }}>{selectedDs.name}</Typography>
                    {isComplete ? (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: `${SUCCESS} !important` }} />}
                        label="Hoàn thành"
                        size="small"
                        sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: SUCCESS, fontWeight: 700, border: `1px solid rgba(34,197,94,0.35)`, fontSize: 12 }}
                      />
                    ) : dsItems.length > 0 ? (
                      <Chip label="Đang xử lý" size="small"
                        sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: WARNING, fontWeight: 700, border: `1px solid rgba(245,158,11,0.3)`, fontSize: 12 }} />
                    ) : null}
                    {selectedDs.description && (
                      <Typography sx={{ color: MUTED, fontSize: 13 }}>{selectedDs.description}</Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                    {isComplete && (
                      <Tooltip title="Xuất toàn bộ dữ liệu đã duyệt dưới dạng JSON">
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={handleExport}
                          sx={{
                            bgcolor: SUCCESS, fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2.5,
                            '&:hover': { bgcolor: '#16a34a' },
                            boxShadow: `0 0 12px rgba(34,197,94,0.35)`,
                          }}
                        >
                          Export JSON
                        </Button>
                      </Tooltip>
                    )}
                    <Button variant="outlined"
                      startIcon={uploading ? <CircularProgress size={14} sx={{ color: PRIMARY }} /> : <UploadIcon />}
                      disabled={uploading} onClick={() => fileInputRef.current?.click()}
                      sx={{ borderColor: BORDER, color: TEXT, borderRadius: 2, fontWeight: 600, textTransform: 'none', px: 2, '&:hover': { borderColor: PRIMARY, color: PRIMARY } }}>
                      {uploading ? `${uploadProgress}%` : 'Upload ảnh'}
                    </Button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.zip" hidden onChange={e => handleUpload(e.target.files)} />
                  </Stack>
                </Box>

                {/* Row 2: Stats */}
                {dsItems.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {[
                      { icon: <TaskAltIcon sx={{ fontSize: 13 }} />, label: 'Approved', value: isComplete ? dsItems.length : dsStats.approved, color: SUCCESS, bg: 'rgba(34,197,94,0.1)' },
                      { icon: <ReviewIcon sx={{ fontSize: 13 }} />, label: 'Reviewing', value: dsStats.reviewing, color: WARNING, bg: 'rgba(245,158,11,0.1)' },
                      { icon: <PendingIcon sx={{ fontSize: 13 }} />, label: 'Annotating', value: dsStats.annotating, color: PRIMARY, bg: 'rgba(59,130,246,0.1)' },
                      { icon: null, label: 'Rework', value: dsStats.rework, color: DANGER, bg: 'rgba(239,68,68,0.1)' },
                      { icon: null, label: 'Tổng ảnh', value: dsItems.length, color: MUTED, bg: 'rgba(100,116,139,0.1)' },
                    ].map(s => (
                      <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.6, borderRadius: 1.5, bgcolor: s.bg, border: `1px solid ${s.color}22` }}>
                        {s.icon && <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>}
                        <Typography sx={{ fontSize: 11, color: MUTED }}>{s.label}:</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {isComplete && (
                  <Typography sx={{ color: '#4ade80', fontSize: 11, mt: 1, opacity: 0.8 }}>
                    ✓ Tất cả ảnh đã được duyệt • Click vào ảnh để xem annotator & labels • Dùng "Export JSON" để tải xuống dữ liệu
                  </Typography>
                )}

                {uploading && (
                  <LinearProgress variant="determinate" value={uploadProgress}
                    sx={{ mt: 1.5, height: 3, borderRadius: 4, bgcolor: 'rgba(59,130,246,0.15)', '& .MuiLinearProgress-bar': { bgcolor: PRIMARY } }} />
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
                      const approved = item.status === 'approved'
                        || getTasksForItem(item).some(t => t.status === 'approved')
                        || isComplete;
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

      {/* ── Dataset Info Dialog ── */}
      <Dialog open={!!infoDs} onClose={() => setInfoDs(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, pb: 2 }}>
          <Typography fontWeight={800} fontSize={16}>{infoDs?.name}</Typography>
          <IconButton onClick={() => setInfoDs(null)} size="small" sx={{ color: MUTED, '&:hover': { color: TEXT } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <DsInfoRow label="Tên dataset" value={infoDs?.name} color="#93c5fd" />
          <DsInfoRow label="Mô tả" value={infoDs?.description || 'Không có mô tả'} />
          <DsInfoRow label="Loại" value={(infoDs?.type || 'image').toUpperCase()} />
          <DsInfoRow label="Tổng ảnh" value={infoDs?.total_items || infoDs?.totalItems || 0} color={WARNING} />
          <DsInfoRow label="Ngày tạo" value={fmtDateTime(infoDs?.created_at || infoDs?.createdAt)} color={SUCCESS} />
          {(infoDs?.updated_at || infoDs?.updatedAt) && (
            <DsInfoRow label="Cập nhật lần cuối" value={fmtDateTime(infoDs?.updated_at || infoDs?.updatedAt)} />
          )}
          <DsInfoRow label="Dataset ID" value={coerceId(infoDs)} color={MUTED} />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 1.5 }}>
          <Button onClick={() => setInfoDs(null)} sx={{ color: MUTED, textTransform: 'none' }}>Đóng</Button>
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

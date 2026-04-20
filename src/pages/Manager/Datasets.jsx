import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  const [detail, setDetail] = useState({ open: false, dataset: null, subtopics: [], approvedResults: [] });
  const [previewTask, setPreviewTask] = useState(null);

  const imgRef = useRef(null);
  const [imgNat, setImgNat] = useState({ w: 0, h: 0 });

  const toPixel = (obj, w, h) => {
    if (!obj || w === 0 || h === 0) return null;
    
    // 1. Array [x1, y1, x2, y2] (% of width/height)
    if (Array.isArray(obj.bbox || obj.points) && (obj.bbox || obj.points).length >= 4) {
      const arr = obj.bbox || obj.points;
      const px1 = (arr[0] / 100) * w;
      const py1 = (arr[1] / 100) * h;
      const px2 = (arr[2] / 100) * w;
      const py2 = (arr[3] / 100) * h;
      return { x: px1, y: py1, w: Math.abs(px2 - px1), h: Math.abs(py2 - py1) };
    }
    
    // 2. Object {x, y, width, height} (% of width/height)
    if (obj.x !== undefined && obj.y !== undefined && obj.width !== undefined && obj.height !== undefined) {
      const px = (obj.x / 100) * w;
      const py = (obj.y / 100) * h;
      const pw = (obj.width / 100) * w;
      const ph = (obj.height / 100) * h;
      // Adjust if they gave x,y as center (we assume x,y is top-left here, if they are center, then bounding box code elsewhere does that. 
      // But standard coco/web is top-left usually)
      return { x: px, y: py, w: pw, h: ph };
    }

    return null;
  };

  const getColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

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
      setDetail({ open: true, dataset: full, subtopics: [...allSubs, ...missing].filter(s => ids.includes(String(s.id))), approvedResults: [] });

      // Load approved results in background
      axios.get(`${API_URL}/api/datasets/${dataset.id}/approved-results`, { headers: getAuthHeaders() })
        .then(resApproved => {
          setDetail(prev => ({ ...prev, approvedResults: resApproved.data || [] }));
        })
        .catch(err => console.error("Failed to fetch approved results", err));
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

      <Dialog open={detail.open} onClose={() => setDetail({ open: false, dataset: null, subtopics: [], approvedResults: [] })} fullWidth maxWidth="md">
        <DialogTitle>Dataset detail</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography fontWeight={700}>{detail.dataset?.name}</Typography>
            <Typography sx={{ color: '#94a3b8' }}>{detail.dataset?.description || 'Không có mô tả'}</Typography>
            <Typography fontWeight={700}>Subtopics</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {detail.subtopics.map(s => <Chip key={s.id} label={s.name} sx={{ bgcolor: 'rgba(59,130,246,0.18)', color: '#bfdbfe' }} />)}
            </Stack>

            <Typography variant="h6" fontWeight={700} sx={{ mt: '24px !important', color: '#34d399' }}>
              Approved Results ({detail.approvedResults?.length || 0})
            </Typography>

            {detail.approvedResults && detail.approvedResults.length > 0 ? (
              <Box sx={{
                maxHeight: '400px',
                overflowY: 'auto',
                pr: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 2,
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#475569', borderRadius: '4px' }
              }}>
                {detail.approvedResults.map(task => (
                  <Card 
                    key={task.id} 
                    onClick={() => { setPreviewTask(task); setImgNat({ w: 0, h: 0 }); }}
                    sx={{ 
                      bgcolor: '#0f172a', border: '1px solid #334155', position: 'relative', overflow: 'hidden',
                      cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.02)', borderColor: '#3b82f6' }
                    }}
                  >
                    <Box sx={{ width: '100%', paddingTop: '100%', position: 'relative', bgcolor: '#000' }}>
                      <img
                        src={task.data_item?.storage_url || 'https://via.placeholder.com/150'}
                        alt="item"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </Box>
                    <CardContent sx={{ p: 1.5, pb: '12px !important' }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        👤 {task.annotator?.full_name || task.annotator?.username || 'Annotator'}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {(() => {
                          let labels = [];
                          try {
                            let data = typeof task.annotation_data === 'string' ? JSON.parse(task.annotation_data) : task.annotation_data;
                            
                            const uniqueLabels = new Set();
                            
                            if (data && typeof data === 'object') {
                               if (Array.isArray(data)) {
                                  data.forEach(item => {
                                    if (item && typeof item === 'object') {
                                      if (item.label) uniqueLabels.add(item.label);
                                      else if (item.label_name) uniqueLabels.add(item.label_name);
                                      else if (item.name) uniqueLabels.add(item.name);
                                    } else if (typeof item === 'string') {
                                      uniqueLabels.add(item);
                                    }
                                  });
                               } else {
                                  // Format gốc của Reviewer/Workspace.jsx là một Dictionary Map
                                  // vd: { "Cat": [ { bbox: [...] } ] }
                                  Object.entries(data).forEach(([key, val]) => {
                                      if (key === 'grouped' && typeof val === 'object' && !Array.isArray(val)) {
                                          Object.keys(val).forEach(k => uniqueLabels.add(k));
                                      } else if (key === 'bboxes' && Array.isArray(val)) {
                                          val.forEach(b => { if (b && b.label) uniqueLabels.add(b.label); });
                                      } else if (Array.isArray(val)) {
                                          uniqueLabels.add(key); // Key chính là Label Name
                                      }
                                  });
                               }
                            }
                            labels = Array.from(uniqueLabels).filter(l => l !== '__unlabeled' && l !== 'null');
                          } catch (e) {}

                          if (labels.length === 0) return <Chip size="small" label="No label" sx={{ height: 20, fontSize: '0.65rem' }} />;
                          return labels.map((l, i) => (
                            <Chip key={i} size="small" label={String(l)} sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7' }} />
                          ));
                        })()}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                Dataset này chưa có dữ liệu nào được duyệt.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail({ open: false, dataset: null, subtopics: [], approvedResults: [] })}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={!!previewTask} onClose={() => setPreviewTask(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
          <Typography fontWeight="bold">Chi tiết Bounding Box</Typography>
          <Button size="small" onClick={() => setPreviewTask(null)} color="inherit">Đóng</Button>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0f172a', p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', position: 'relative' }}>
          {previewTask && (
            <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%', p: 2 }}>
              <img 
                 ref={imgRef}
                 src={previewTask.data_item?.storage_url || ''} 
                 alt="preview" 
                 onLoad={(e) => setImgNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                 style={{ maxHeight: '75vh', maxWidth: '100%', display: 'block', borderRadius: '4px' }}
              />
              {imgNat.w > 0 && imgNat.h > 0 && (
                <svg 
                  style={{ position: 'absolute', top: 16, left: 16, width: 'calc(100% - 32px)', height: 'calc(100% - 32px)', pointerEvents: 'none' }}
                  viewBox={`0 0 ${imgNat.w} ${imgNat.h}`}
                >
                  {(() => {
                    let shapes = [];
                    try {
                      let data = typeof previewTask.annotation_data === 'string' ? JSON.parse(previewTask.annotation_data) : previewTask.annotation_data;
                      
                      if (data && typeof data === 'object') {
                          if (Array.isArray(data)) {
                             shapes = data;
                          } else {
                             Object.entries(data).forEach(([key, val]) => {
                                 if (key === 'grouped' && typeof val === 'object' && !Array.isArray(val)) {
                                     Object.entries(val).forEach(([k, arr]) => {
                                         if (Array.isArray(arr)) arr.forEach(item => shapes.push({ label: k, ...item }));
                                     });
                                 } else if (key === 'bboxes' && Array.isArray(val)) {
                                     val.forEach(item => shapes.push(item));
                                 } else if (Array.isArray(val)) {
                                     // Dictionary Map format! key is the label.
                                     val.forEach(item => shapes.push({ label: key, ...item }));
                                 }
                             });
                          }
                      }
                    } catch(e) {}

                    return shapes.map((obj, i) => {
                      const px = toPixel(obj, imgNat.w, imgNat.h);
                      if (!px) return null;
                      const labelName = obj.label || obj.label_name || obj.name || 'Box';
                      const color = obj.color || getColor(String(labelName));
                      const textBgH = imgNat.h * 0.04;
                      const textWidth = Math.max(px.w, labelName.length * (imgNat.w * 0.015));
                      const fontSize = imgNat.h * 0.03;
                      
                      return (
                        <g key={i}>
                          <rect x={px.x} y={px.y} width={px.w} height={px.h} fill="rgba(0,0,0,0.1)" stroke={color} strokeWidth={Math.max(2, imgNat.w * 0.005)} />
                          <rect x={px.x - 1} y={px.y - textBgH} width={textWidth} height={textBgH} fill={color} />
                          <text x={px.x + 4} y={px.y - 4} fill="#fff" fontSize={fontSize} fontWeight="bold" fontFamily="sans-serif">{labelName}</text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  Label as LabelIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const panelSx = {
  borderRadius: 3,
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#e2e8f0',
  boxShadow: '0 16px 32px rgba(0,0,0,0.25)',
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

const normalizeTopic = (t) => ({
  ...t,
  id: t?.id || t?._id,
  name: t?.name || t?.title || 'Untitled Topic',
  description: t?.description || '',
});

const normalizeSubtopic = (s) => ({
  ...s,
  id: s?.id || s?._id || s?.subtopicId,
  name: s?.name || s?.title || 'Untitled Subtopic',
  topic_id: s?.topic_id || s?.topicId || s?.topic?.id || null,
});

const getAssetUrl = (asset) => {
  if (asset?.signed_url) return asset.signed_url;
  if (asset?.storage_url && /^https?:/i.test(asset.storage_url)) return asset.storage_url;
  if (asset?.storage_url) return `${API_URL.replace(/\/+$/, '')}/${String(asset.storage_url).replace(/^\/+/, '')}`;
  if (asset?.filename) return `${API_URL.replace(/\/+$/, '')}/uploads/datasets/${asset.filename}`;
  return '';
};

export default function TopicManagement() {
  const fileInputRef = useRef(null);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('');
  const [assets, setAssets] = useState([]);
  const [labelsets, setLabelsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [topicDialog, setTopicDialog] = useState({ open: false, edit: null, name: '', description: '' });
  const [subtopicDialog, setSubtopicDialog] = useState({ open: false, edit: null, name: '', description: '' });
  const [labelDialog, setLabelDialog] = useState({ open: false, name: '', labels: [] });
  const [newLabel, setNewLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  const selectedTopic = useMemo(() => topics.find(t => String(t.id) === String(selectedTopicId)) || null, [topics, selectedTopicId]);
  const selectedSubtopic = useMemo(() => subtopics.find(s => String(s.id) === String(selectedSubtopicId)) || null, [subtopics, selectedSubtopicId]);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const loadTopics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/topics`, { headers: getAuthHeaders() });
      const list = getArray(res.data).map(normalizeTopic);
      setTopics(list);
      if (!selectedTopicId && list[0]?.id) setSelectedTopicId(list[0].id);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được topic');
    } finally {
      setLoading(false);
    }
  };

  const loadSubtopics = async (topicId) => {
    if (!topicId) {
      setSubtopics([]);
      setSelectedSubtopicId('');
      return;
    }
    setSubLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/subtopics`, {
        params: { topic_id: topicId },
        headers: getAuthHeaders(),
      });
      const list = getArray(res.data).map(normalizeSubtopic);
      setSubtopics(list);
      setSelectedSubtopicId(prev => (list.some(s => String(s.id) === String(prev)) ? prev : list[0]?.id || ''));
    } catch (e) {
      setSubtopics([]);
      showToast(e?.response?.data?.message || e.message || 'Không tải được subtopic', 'error');
    } finally {
      setSubLoading(false);
    }
  };

  const loadSubtopicDetail = async (subtopicId) => {
    if (!subtopicId) {
      setAssets([]);
      setLabelsets([]);
      return;
    }
    setDetailLoading(true);
    try {
      const [assetRes, labelRes] = await Promise.all([
        axios.get(`${API_URL}/api/subtopics/${subtopicId}/assets`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/subtopics/${subtopicId}/labelsets`, { headers: getAuthHeaders() }),
      ]);
      setAssets(getArray(assetRes.data));
      setLabelsets(getArray(labelRes.data));
    } catch (e) {
      setAssets([]);
      setLabelsets([]);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { loadTopics(); }, []);
  useEffect(() => { if (selectedTopicId) loadSubtopics(selectedTopicId); }, [selectedTopicId]);
  useEffect(() => { if (selectedSubtopicId) loadSubtopicDetail(selectedSubtopicId); else { setAssets([]); setLabelsets([]);} }, [selectedSubtopicId]);

  const saveTopic = async () => {
    try {
      const payload = { name: topicDialog.name.trim(), description: topicDialog.description.trim() };
      if (!payload.name) return showToast('Nhập tên topic', 'warning');
      if (topicDialog.edit?.id) {
        await axios.put(`${API_URL}/api/topics/${topicDialog.edit.id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/topics`, payload, { headers: getAuthHeaders() });
      }
      setTopicDialog({ open: false, edit: null, name: '', description: '' });
      await loadTopics();
      showToast('Lưu topic thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Lưu topic thất bại', 'error');
    }
  };

  const saveSubtopic = async () => {
    try {
      const payload = { name: subtopicDialog.name.trim(), description: subtopicDialog.description.trim(), topic_id: selectedTopicId };
      if (!payload.name) return showToast('Nhập tên subtopic', 'warning');
      if (!payload.topic_id) return showToast('Chọn topic trước', 'warning');
      if (subtopicDialog.edit?.id) {
        await axios.put(`${API_URL}/api/subtopics/${subtopicDialog.edit.id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/subtopics`, payload, { headers: getAuthHeaders() });
      }
      setSubtopicDialog({ open: false, edit: null, name: '', description: '' });
      await loadSubtopics(selectedTopicId);
      showToast('Lưu subtopic thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Lưu subtopic thất bại', 'error');
    }
  };

  const deleteTopic = async (topic) => {
    if (!window.confirm(`Xóa topic "${topic.name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/topics/${topic.id}`, { headers: getAuthHeaders() });
      await loadTopics();
      showToast('Xóa topic thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa topic thất bại', 'error');
    }
  };

  const deleteSubtopic = async (subtopic) => {
    if (!window.confirm(`Xóa subtopic "${subtopic.name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/subtopics/${subtopic.id}`, { headers: getAuthHeaders() });
      await loadSubtopics(selectedTopicId);
      showToast('Xóa subtopic thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa subtopic thất bại', 'error');
    }
  };

  const uploadAssets = async (files) => {
    if (!selectedSubtopicId || !files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(file => fd.append('files', file));
      await axios.post(`${API_URL}/api/subtopics/${selectedSubtopicId}/assets`, fd, { headers: getAuthHeaders() });
      await loadSubtopicDetail(selectedSubtopicId);
      showToast('Upload asset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Upload asset thất bại', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (assetId) => {
    if (!window.confirm('Xóa asset này?')) return;
    try {
      await axios.delete(`${API_URL}/api/subtopics/${selectedSubtopicId}/assets/${assetId}`, { headers: getAuthHeaders() });
      await loadSubtopicDetail(selectedSubtopicId);
      showToast('Xóa asset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa asset thất bại', 'error');
    }
  };

  const saveLabelset = async () => {
    try {
      const payload = { name: labelDialog.name.trim(), labels: labelDialog.labels, allowMultiple: false };
      if (!payload.name) return showToast('Nhập tên labelset', 'warning');
      await axios.post(`${API_URL}/api/subtopics/${selectedSubtopicId}/labelsets`, payload, { headers: getAuthHeaders() });
      setLabelDialog({ open: false, name: '', labels: [] });
      setNewLabel('');
      await loadSubtopicDetail(selectedSubtopicId);
      showToast('Tạo labelset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Tạo labelset thất bại', 'error');
    }
  };

  const deleteLabelset = async (id) => {
    if (!window.confirm('Xóa labelset này?')) return;
    try {
      await axios.delete(`${API_URL}/api/labelsets/${id}`, { headers: getAuthHeaders() });
      await loadSubtopicDetail(selectedSubtopicId);
      showToast('Xóa labelset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa labelset thất bại', 'error');
    }
  };
const handleSaveLabelSet = async () => {
  try {
    if (!selectedSubtopic?.id) return;

    const payload = {
      name: labelDialog.data.name?.trim() || 'Default',
      description: labelDialog.data.description || '',
      allow_multiple: !!labelDialog.data.allowMultiple,
      required: true,
      labels: (labelDialog.data.labels || []).map((l, idx) => ({
        name: l.name?.trim(),
        color: l.color || '#3b82f6',
        description: l.description || '',
        shortcut: l.shortcut || '',
        sort_order: idx,
      })),
    };

    console.log('LABELSET PAYLOAD =', payload);

    await axios.post(
      `${API_URL}/api/subtopics/${selectedSubtopic.id}/labelsets`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
      }
    );

    alert('Tạo labelset thành công');
  } catch (err) {
    console.error(err.response?.data || err.message);
    alert('Tạo labelset thất bại');
  }
};
  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h4" fontWeight={700}>Topic Management</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setTopicDialog({ open: true, edit: null, name: '', description: '' })}>New Topic</Button>
          <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setSubtopicDialog({ open: true, edit: null, name: '', description: '' })} disabled={!selectedTopicId}>New Subtopic</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ ...panelSx, p: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Topics</Typography>
            <Stack spacing={1}>
              {topics.map(topic => (
                <Card key={topic.id} sx={{ bgcolor: String(topic.id) === String(selectedTopicId) ? 'rgba(59,130,246,0.16)' : '#0f172a', border: '1px solid', borderColor: String(topic.id) === String(selectedTopicId) ? '#3b82f6' : '#334155' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedTopicId(topic.id)}>
                        <Typography fontWeight={700}>{topic.name}</Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>{topic.description || 'Không có mô tả'}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setTopicDialog({ open: true, edit: topic, name: topic.name, description: topic.description || '' })}><EditIcon sx={{ fontSize: 18, color: '#60a5fa' }} /></IconButton>
                      <IconButton size="small" onClick={() => deleteTopic(topic)}><DeleteIcon sx={{ fontSize: 18, color: '#f87171' }} /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ ...panelSx, p: 2, minHeight: 420 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Subtopics {selectedTopic ? `- ${selectedTopic.name}` : ''}</Typography>
            {subLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}
            <Stack spacing={1}>
              {subtopics.map(subtopic => (
                <Card key={subtopic.id} sx={{ bgcolor: String(subtopic.id) === String(selectedSubtopicId) ? 'rgba(59,130,246,0.16)' : '#0f172a', border: '1px solid', borderColor: String(subtopic.id) === String(selectedSubtopicId) ? '#3b82f6' : '#334155' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedSubtopicId(subtopic.id)}>
                        <Typography fontWeight={700}>{subtopic.name}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setSubtopicDialog({ open: true, edit: subtopic, name: subtopic.name, description: subtopic.description || '' })}><EditIcon sx={{ fontSize: 18, color: '#60a5fa' }} /></IconButton>
                      <IconButton size="small" onClick={() => deleteSubtopic(subtopic)}><DeleteIcon sx={{ fontSize: 18, color: '#f87171' }} /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ ...panelSx, p: 2, minHeight: 420 }}>
            {!selectedSubtopic ? (
              <Box sx={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748b' }}>
                <FolderIcon sx={{ fontSize: 64, mb: 1 }} />
                <Typography>Chọn subtopic để quản lý assets và labelsets</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{selectedSubtopic.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>{assets.length} assets • {labelsets.length} labelsets</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<LabelIcon />} variant="outlined" onClick={() => setLabelDialog({ open: true, name: 'Default', labels: [] })}>New Labelset</Button>
                    <Button startIcon={<UploadIcon />} variant="contained" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
                    <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => uploadAssets(Array.from(e.target.files || []))} />
                  </Stack>
                </Box>

                {detailLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>Labelsets</Typography>
                    <Stack spacing={1}>
                      {labelsets.length === 0 ? <Typography sx={{ color: '#94a3b8' }}>Chưa có labelset</Typography> : null}
                      {labelsets.map(ls => (
                        <Card key={ls.id || ls._id} sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                              <Box>
                                <Typography fontWeight={700}>{ls.name || 'Labelset'}</Typography>
                                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                  {(ls.labels || []).map((label, idx) => (
                                    <Chip key={`${label.name}-${idx}`} size="small" label={label.name} sx={{ bgcolor: `${label.color || '#3b82f6'}22`, color: label.color || '#93c5fd', border: `1px solid ${label.color || '#3b82f6'}` }} />
                                  ))}
                                </Stack>
                              </Box>
                              <IconButton size="small" onClick={() => deleteLabelset(ls.id || ls._id)}><DeleteIcon sx={{ fontSize: 18, color: '#f87171' }} /></IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>Assets</Typography>
                    <Grid container spacing={1.5}>
                      {assets.length === 0 ? <Grid item xs={12}><Typography sx={{ color: '#94a3b8' }}>Chưa có asset</Typography></Grid> : null}
                      {assets.map(asset => (
                        <Grid item xs={6} sm={4} md={3} key={asset.id || asset._id}>
                          <Card sx={{ bgcolor: '#0f172a', border: '1px solid #334155' }}>
                            <Box sx={{ position: 'relative', pt: '75%', bgcolor: '#111827' }}>
                              {getAssetUrl(asset) ? (
                                <Box component="img" src={getAssetUrl(asset)} alt={asset.original_name || asset.filename || 'asset'} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon sx={{ color: '#64748b' }} /></Box>
                              )}
                            </Box>
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Typography variant="caption" sx={{ display: 'block', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {asset.original_name || asset.filename || 'asset'}
                              </Typography>
                              <Button size="small" color="error" onClick={() => deleteAsset(asset.id || asset._id)}>Delete</Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={topicDialog.open} onClose={() => setTopicDialog({ open: false, edit: null, name: '', description: '' })} fullWidth maxWidth="sm">
        <DialogTitle>{topicDialog.edit ? 'Edit Topic' : 'New Topic'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Topic name" value={topicDialog.name} onChange={(e) => setTopicDialog(prev => ({ ...prev, name: e.target.value }))} sx={inputSx} />
            <TextField label="Description" multiline minRows={3} value={topicDialog.description} onChange={(e) => setTopicDialog(prev => ({ ...prev, description: e.target.value }))} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopicDialog({ open: false, edit: null, name: '', description: '' })}>Cancel</Button>
          <Button onClick={saveTopic} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={subtopicDialog.open} onClose={() => setSubtopicDialog({ open: false, edit: null, name: '', description: '' })} fullWidth maxWidth="sm">
        <DialogTitle>{subtopicDialog.edit ? 'Edit Subtopic' : 'New Subtopic'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Subtopic name" value={subtopicDialog.name} onChange={(e) => setSubtopicDialog(prev => ({ ...prev, name: e.target.value }))} sx={inputSx} />
            <TextField label="Description" multiline minRows={3} value={subtopicDialog.description} onChange={(e) => setSubtopicDialog(prev => ({ ...prev, description: e.target.value }))} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubtopicDialog({ open: false, edit: null, name: '', description: '' })}>Cancel</Button>
          <Button onClick={saveSubtopic} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={labelDialog.open} onClose={() => setLabelDialog({ open: false, name: '', labels: [] })} fullWidth maxWidth="sm">
        <DialogTitle>New Labelset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Labelset name" value={labelDialog.name} onChange={(e) => setLabelDialog(prev => ({ ...prev, name: e.target.value }))} sx={inputSx} />
            <Stack direction="row" spacing={1}>
              <TextField label="New label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} sx={inputSx} fullWidth />
              <Button variant="contained" onClick={() => { if (!newLabel.trim()) return; setLabelDialog(prev => ({ ...prev, labels: [...prev.labels, { name: newLabel.trim(), color: '#3b82f6' }] })); setNewLabel(''); }}>Add</Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {labelDialog.labels.map((label, idx) => (
                <Chip key={`${label.name}-${idx}`} label={label.name} onDelete={() => setLabelDialog(prev => ({ ...prev, labels: prev.labels.filter((_, i) => i !== idx) }))} />
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLabelDialog({ open: false, name: '', labels: [] })}>Cancel</Button>
          <Button onClick={saveLabelset} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

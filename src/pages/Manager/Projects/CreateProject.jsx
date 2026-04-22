import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress,
  Grid, IconButton, Snackbar, Stack, TextField, Typography, Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon,
  Search as SearchIcon, Person as PersonIcon, Group as GroupIcon,
  FolderOpen as FolderIcon, Label as LabelIcon,
} from '@mui/icons-material';
import { API_URL } from '../../../config/api';
import { getArray } from '../../../utils/api';

/* ─── THEME ── */
const BG='#080f1e', PANEL='#0f1a2e', CARD='#131f35', BORDER='#1e2d47';
const PRIMARY='#3b82f6', TEXT='#e2e8f0', MUTED='#64748b';

const getAuthHeaders = () => {
  const t = sessionStorage.getItem('token') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const coerceId = o => o?._id || o?.id || '';
const normalizeUser = u => ({
  ...u, id: coerceId(u) || u?.user_id,
  fullName: u?.full_name || u?.fullName || u?.username || u?.email || 'User',
});

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor:'#08121f', color:TEXT, borderRadius:'10px',
    '& fieldset':{ borderColor:BORDER },
    '&:hover fieldset':{ borderColor:'#2d4060' },
    '&.Mui-focused fieldset':{ borderColor:PRIMARY },
  },
  '& .MuiInputLabel-root':{ color:MUTED },
};

/* ── Section card wrapper ── */
const Section = ({ icon, title, subtitle, children }) => (
  <Card sx={{ bgcolor:PANEL, border:`1px solid ${BORDER}`, borderRadius:3, color:TEXT }}>
    <CardContent sx={{ p:3 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2.5, pb:2, borderBottom:`1px solid ${BORDER}` }}>
        <Box sx={{ color:PRIMARY }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontWeight:800, fontSize:16 }}>{title}</Typography>
          {subtitle && <Typography sx={{ color:MUTED, fontSize:13 }}>{subtitle}</Typography>}
        </Box>
      </Box>
      {children}
    </CardContent>
  </Card>
);

/* ── User checkbox list ── */
const UserList = ({ users, selected, onToggle, search, onSearch, placeholder }) => (
  <Stack spacing={1.5}>
    <TextField size="small" placeholder={placeholder} value={search} onChange={e => onSearch(e.target.value)}
      sx={inputSx} InputProps={{ startAdornment: <SearchIcon sx={{ color:MUTED, mr:1, fontSize:18 }} /> }} />
    <Box sx={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:0.8 }}>
      {users.length === 0 && <Typography sx={{ color:MUTED, fontSize:13, py:2, textAlign:'center' }}>Không có người dùng</Typography>}
      {users.map(u => {
        const checked = selected.includes(u.id);
        return (
          <Box key={u.id} onClick={() => onToggle(u.id)}
            sx={{
              display:'flex', alignItems:'center', gap:1.5, p:1.5, borderRadius:2, cursor:'pointer',
              bgcolor: checked ? 'rgba(59,130,246,0.12)' : CARD,
              border:`1px solid ${checked ? PRIMARY : BORDER}`,
              transition:'all 0.15s', '&:hover':{ borderColor:'#2d4060' },
            }}>
            <Box sx={{
              width:34, height:34, borderRadius:'50%', bgcolor: checked ? PRIMARY : '#1e293b',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              fontSize:13, fontWeight:700, color: checked ? '#fff' : MUTED,
            }}>
              {u.fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </Box>
            <Box sx={{ flex:1, minWidth:0 }}>
              <Typography sx={{ fontWeight:700, fontSize:14, color:TEXT }}>{u.fullName}</Typography>
              <Typography sx={{ color:MUTED, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</Typography>
            </Box>
            <Checkbox checked={checked} size="small" sx={{ color:MUTED, '&.Mui-checked':{ color:PRIMARY }, p:0 }} onChange={()=>{}} />
          </Box>
        );
      })}
    </Box>
    {selected.length > 0 && (
      <Typography sx={{ color:'#93c5fd', fontSize:12 }}>✓ Đã chọn {selected.length} người</Typography>
    )}
  </Stack>
);

/* ── Dataset picker ── */
const DatasetPicker = ({ datasets, selected, onSelect }) => (
  <Box sx={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:0.8 }}>
    {datasets.length === 0 && <Typography sx={{ color:MUTED, fontSize:13, py:2, textAlign:'center' }}>Chưa có dataset nào</Typography>}
    {datasets.map(ds => {
      const isSelected = selected === coerceId(ds);
      const total = ds.total_items || ds.totalItems || 0;
      return (
        <Box key={coerceId(ds)} onClick={() => onSelect(isSelected ? '' : coerceId(ds))}
          sx={{
            display:'flex', alignItems:'center', gap:1.5, p:1.5, borderRadius:2, cursor:'pointer',
            bgcolor: isSelected ? 'rgba(59,130,246,0.12)' : CARD,
            border:`1px solid ${isSelected ? PRIMARY : BORDER}`,
            transition:'all 0.15s', '&:hover':{ borderColor:'#2d4060' },
          }}>
          <FolderIcon sx={{ color: isSelected ? PRIMARY : MUTED, fontSize:22, flexShrink:0 }} />
          <Box sx={{ flex:1, minWidth:0 }}>
            <Typography sx={{ fontWeight:700, fontSize:14, color:TEXT }}>{ds.name}</Typography>
            {ds.description && <Typography sx={{ color:MUTED, fontSize:12 }}>{ds.description}</Typography>}
          </Box>
          <Chip size="small" label={`${total} ảnh`}
            sx={{ bgcolor:'rgba(59,130,246,0.14)', color:'#93c5fd', fontWeight:700, fontSize:11 }} />
          {isSelected && <CheckCircleIcon sx={{ color:PRIMARY, fontSize:20, flexShrink:0 }} />}
        </Box>
      );
    })}
  </Box>
);

/* ── Label picker (from master labels) ── */
const LabelPicker = ({ labels, selected, onToggle }) => (
  <Box>
    {labels.length === 0 && (
      <Typography sx={{ color:MUTED, fontSize:13, py:2, textAlign:'center' }}>
        Chưa có nhãn nào. Hãy tạo nhãn ở tab Labels trước.
      </Typography>
    )}
    <Box sx={{ display:'flex', flexWrap:'wrap', gap:1 }}>
      {labels.map(l => {
        const isSelected = selected.includes(l._labelsetId || l.id);
        return (
          <Chip
            key={l.id}
            label={l.name}
            onClick={() => onToggle(l._labelsetId || l.id)}
            sx={{
              bgcolor: isSelected ? `${l.color}33` : 'rgba(255,255,255,0.05)',
              color: isSelected ? l.color : MUTED,
              border:`1px solid ${isSelected ? l.color : BORDER}`,
              fontWeight: isSelected ? 700 : 500,
              cursor:'pointer', transition:'all 0.15s',
              '&:hover':{ bgcolor:`${l.color}22`, color:l.color },
            }}
          />
        );
      })}
    </Box>
    {selected.length > 0 && (
      <Typography sx={{ color:'#93c5fd', fontSize:12, mt:1 }}>✓ Đã chọn {selected.length} nhãn</Typography>
    )}
  </Box>
);

/* ─── MAIN ─────────────────────────────────────────────── */
const MASTER_TOPIC_NAME = '__master_labels__';
const MASTER_SUBTOPIC_NAME = '__labels__';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState({ open:false, msg:'', sev:'success' });

  const [datasets, setDatasets]     = useState([]);
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers]   = useState([]);
  const [masterLabels, setMasterLabels] = useState([]);

  const [form, setForm] = useState({ name:'', description:'', guidelines:'', deadline:'', sampleRate: 100 });
  const [selectedDatasetId, setSelectedDatasetId]     = useState('');
  const [selectedLabelsetIds, setSelectedLabelsetIds] = useState([]);
  const [selectedAnnotators, setSelectedAnnotators]   = useState([]);
  const [selectedReviewer, setSelectedReviewer]       = useState('');
  const [annoSearch, setAnnoSearch] = useState('');
  const [revSearch, setRevSearch]   = useState('');

  const showToast = (msg, sev='success') => setToast({ open:true, msg, sev });

  /* ── load master labels from localStorage (same key as Labels.jsx) ── */
  const loadMasterLabels = () => {
    try {
      const raw = localStorage.getItem('master_labels_v1');
      setMasterLabels(raw ? JSON.parse(raw) : []);
    } catch {
      setMasterLabels([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dsRes, userRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/datasets`, { headers:getAuthHeaders() }),
          axios.get(`${API_URL}/api/users`, { headers:getAuthHeaders() }),
        ]);
        if (dsRes.status === 'fulfilled') setDatasets(getArray(dsRes.value.data));
        if (userRes.status === 'fulfilled') {
          const users = getArray(userRes.value.data).map(normalizeUser);
          setAnnotators(users.filter(u => u.role === 'annotator' && u.is_active !== false));
          setReviewers(users.filter(u => u.role === 'reviewer' && u.is_active !== false));
        }
        loadMasterLabels();
      } catch (e) {
        setError(e?.response?.data?.message || e.message || 'Không tải được dữ liệu');
      } finally { setLoading(false); }
    })();
  }, []);

  const filteredAnnotators = useMemo(() => {
    const q = annoSearch.toLowerCase();
    return annotators.filter(u => !q || u.fullName.toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  }, [annotators, annoSearch]);

  const filteredReviewers = useMemo(() => {
    const q = revSearch.toLowerCase();
    return reviewers.filter(u => !q || u.fullName.toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  }, [reviewers, revSearch]);

  const toggleAnnotator = id => setSelectedAnnotators(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const toggleReviewer  = id => setSelectedReviewer(prev => prev === id ? '' : id);
  const toggleLabel     = id => setSelectedLabelsetIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.deadline || !selectedDatasetId) {
      showToast('Vui lòng điền đủ tên project, deadline và chọn 1 dataset', 'warning');
      return;
    }
    if (!selectedAnnotators.length || !selectedReviewer) {
      showToast('Vui lòng chọn ít nhất 1 Annotator và 1 Reviewer', 'warning');
      return;
    }
    if (form.sampleRate < 1 || form.sampleRate > 100) {
      showToast('Sample Rate phải nằm trong khoảng từ 1% đến 100%', 'warning');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        guidelines: form.guidelines.trim() || 'No guidelines',
        deadline: new Date(form.deadline).toISOString(),
        export_format: 'JSON',
        review_policy: { 
          mode: form.sampleRate < 100 ? 'sample' : 'full', 
          sample_rate: form.sampleRate / 100, 
          reviewers_per_item: 1 
        },
        dataset_id: selectedDatasetId,
        annotator_ids: selectedAnnotators,
        reviewer_id: selectedReviewer,
      };
      const res = await axios.post(`${API_URL}/api/projects`, payload, { headers:getAuthHeaders() });
      const project = res.data?.project || res.data;
      const projectId = coerceId(project);
      if (!projectId) throw new Error('Server không trả về project ID');
      showToast('Tạo project thành công!');
      setTimeout(() => navigate(`/manager/projects/${projectId}`), 800);
    } catch (e) {
      let errorMsg = 'Tạo project thất bại';
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
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <Box sx={{ minHeight:'100vh', bgcolor:BG, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <CircularProgress sx={{ color:PRIMARY }} />
    </Box>
  );

  return (
    <Box sx={{ minHeight:'100vh', bgcolor:BG, color:TEXT }}>
      {/* ── Header ── */}
      <Box sx={{ px:3.5, py:3, borderBottom:`1px solid ${BORDER}`, bgcolor:PANEL,
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:2, flexWrap:'wrap' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => navigate('/manager/projects')} sx={{ color:MUTED }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography sx={{ fontWeight:800, fontSize:24, color:TEXT }}>Tạo Project mới</Typography>
            <Typography sx={{ color:MUTED, fontSize:13 }}>Thiết lập dự án annotation bounding box</Typography>
          </Box>
        </Stack>
        <Button variant="contained" onClick={handleCreate} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color:'#fff' }} /> : <CheckCircleIcon />}
          sx={{ bgcolor:PRIMARY, borderRadius:2, fontWeight:700, textTransform:'none', px:3, '&:hover':{ bgcolor:'#2563eb' } }}>
          {saving ? 'Đang tạo...' : 'Tạo Project'}
        </Button>
      </Box>

      <Box sx={{ p:3.5 }}>
        {error && <Alert severity="error" sx={{ mb:3, borderRadius:2 }}>{error}</Alert>}

        <Grid container spacing={3}>
          {/* ── Left col: info ── */}
          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
              {/* Basic info */}
              <Section icon={<CheckCircleIcon />} title="Thông tin cơ bản" subtitle="Tên, mô tả và deadline của project">
                <Stack spacing={2}>
                  <TextField fullWidth label="Tên project *" value={form.name}
                    onChange={e => setForm(p=>({...p, name:e.target.value}))}
                    placeholder="VD: Phân loại chó mèo Q2/2026" sx={inputSx} />
                  <TextField fullWidth label="Mô tả" multiline minRows={3} value={form.description}
                    onChange={e => setForm(p=>({...p, description:e.target.value}))} sx={inputSx} />
                  <TextField fullWidth label="Hướng dẫn cho annotator" multiline minRows={3} value={form.guidelines}
                    onChange={e => setForm(p=>({...p, guidelines:e.target.value}))}
                    placeholder="Mô tả cách gán nhãn, quy tắc vẽ bounding box..." sx={inputSx} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField fullWidth type="datetime-local" label="Deadline"
                      InputLabelProps={{ shrink:true }} value={form.deadline}
                      onChange={e => setForm(p=>({...p, deadline:e.target.value}))} sx={{ ...inputSx, flex: 2 }} />
                    <TextField fullWidth type="number" label="Sample Rate (%)"
                      InputProps={{ inputProps: { min: 1, max: 100 } }}
                      value={form.sampleRate}
                      onChange={e => setForm(p=>({...p, sampleRate: e.target.value ? Number(e.target.value) : ''}))}
                      placeholder="VD: 10" sx={{ ...inputSx, flex: 1 }} />
                  </Box>
                  {form.sampleRate < 100 && form.sampleRate > 0 && (
                    <Typography sx={{ color: '#fbbf24', fontSize: 13, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                      Annotator làm 100%. Reviewer chỉ kiểm tra ngẫu nhiên {form.sampleRate}% số ảnh.
                    </Typography>
                  )}
                </Stack>
              </Section>

              {/* Dataset */}
              <Section icon={<FolderIcon />} title="Chọn Dataset *"
                subtitle={selectedDatasetId ? `✓ Đã chọn dataset` : 'Chọn 1 bộ ảnh cho project này'}>
                <DatasetPicker datasets={datasets} selected={selectedDatasetId} onSelect={setSelectedDatasetId} />
              </Section>

              {/* Labels */}
              <Section icon={<LabelIcon />} title="Chọn nhãn"
                subtitle={`${selectedLabelsetIds.length} nhãn được chọn`}>
                <LabelPicker labels={masterLabels} selected={selectedLabelsetIds} onToggle={toggleLabel} />
              </Section>
            </Stack>
          </Grid>

          {/* ── Right col: people ── */}
          <Grid item xs={12} lg={7}>
            <Stack spacing={3}>
              <Section icon={<PersonIcon />} title="Phân công Annotators *"
                subtitle={`${selectedAnnotators.length}/${annotators.length} người được chọn`}>
                <UserList
                  users={filteredAnnotators}
                  selected={selectedAnnotators}
                  onToggle={toggleAnnotator}
                  search={annoSearch}
                  onSearch={setAnnoSearch}
                  placeholder="Tìm annotator..."
                />
              </Section>

              <Section icon={<GroupIcon />} title="Phân công Reviewers *"
                subtitle={selectedReviewer ? `1/${reviewers.length} người được chọn` : `0/${reviewers.length} người được chọn`}>
                <UserList
                  users={filteredReviewers}
                  selected={selectedReviewer ? [selectedReviewer] : []}
                  onToggle={toggleReviewer}
                  search={revSearch}
                  onSearch={setRevSearch}
                  placeholder="Tìm reviewer..."
                />
              </Section>

              {/* Summary */}
              <Card sx={{ bgcolor:'rgba(59,130,246,0.08)', border:`1px solid rgba(59,130,246,0.3)`, borderRadius:3 }}>
                <CardContent sx={{ p:2.5 }}>
                  <Typography sx={{ fontWeight:800, color:TEXT, mb:1.5 }}>📋 Tóm tắt</Typography>
                  <Stack spacing={0.8}>
                    {[
                      { label:'Project name', value: form.name || '—' },
                      { label:'Dataset', value: datasets.find(d=>coerceId(d)===selectedDatasetId)?.name || '—' },
                      { label:'Labels', value: selectedLabelsetIds.length ? `${selectedLabelsetIds.length} nhãn` : '—' },
                      { label:'Annotators', value: selectedAnnotators.length ? `${selectedAnnotators.length} người` : '—' },
                      { label:'Reviewer', value: selectedReviewer ? `1 người` : '—' },
                      { label:'Deadline', value: form.deadline ? new Date(form.deadline).toLocaleString('vi-VN') : '—' },
                    ].map(row => (
                      <Box key={row.label} sx={{ display:'flex', gap:1 }}>
                        <Typography sx={{ color:MUTED, fontSize:13, minWidth:110 }}>{row.label}:</Typography>
                        <Typography sx={{ color:TEXT, fontSize:13, fontWeight:600 }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p=>({...p,open:false}))}
        anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p=>({...p,open:false}))} sx={{ borderRadius:2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

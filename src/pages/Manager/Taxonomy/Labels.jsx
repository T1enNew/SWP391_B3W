import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, InputAdornment, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Label as LabelIcon, Search as SearchIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';

/* ─── THEME ── */
const BG='#080f1e', PANEL='#0f1a2e', CARD='#131f35', BORDER='#1e2d47';
const PRIMARY='#3b82f6', TEXT='#e2e8f0', MUTED='#64748b', DANGER='#ef4444';

const PRESET_COLORS = [
  '#ef4444','#f97316','#f59e0b','#eab308',
  '#22c55e','#10b981','#06b6d4','#3b82f6',
  '#6366f1','#8b5cf6','#a855f7','#ec4899',
  '#64748b','#e2e8f0','#14b8a6','#84cc16',
];

const STORAGE_KEY = 'master_labels_v1';

/* ─── persistence helpers ── */
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const saveToStorage = (labels) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(labels)); } catch {}
};
const genId = () => `lbl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor:'#08121f', color:TEXT, borderRadius:'10px',
    '& fieldset':{ borderColor:BORDER },
    '&:hover fieldset':{ borderColor:'#2d4060' },
    '&.Mui-focused fieldset':{ borderColor:PRIMARY },
  },
  '& .MuiInputLabel-root':{ color:MUTED },
};

function hexToRgb(hex='#3b82f6') {
  const r=parseInt(hex.slice(1,3),16)||0, g=parseInt(hex.slice(3,5),16)||0, b=parseInt(hex.slice(5,7),16)||0;
  return `${r},${g},${b}`;
}

/* ─── Label Card ── */
const LabelCard = ({ label, onEdit, onDelete }) => (
  <Card sx={{
    bgcolor:CARD, border:`1px solid ${BORDER}`, borderRadius:3, color:TEXT,
    transition:'all 0.15s',
    '&:hover':{ borderColor:'#2d4a6e', boxShadow:`0 8px 24px rgba(0,0,0,0.3)` },
  }}>
    <Box sx={{ height:4, bgcolor:label.color, borderRadius:'12px 12px 0 0' }} />
    <CardContent sx={{ p:2.2 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:1, mb:1 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, minWidth:0 }}>
          <Box sx={{
            width:36, height:36, borderRadius:'50%', bgcolor:label.color, flexShrink:0,
            boxShadow:`0 0 0 3px rgba(${hexToRgb(label.color)},0.25)`,
          }} />
          <Box sx={{ minWidth:0 }}>
            <Typography sx={{ fontWeight:800, fontSize:16, color:TEXT }}>{label.name}</Typography>
            {label.shortcut && (
              <Chip size="small" label={`⌨ ${label.shortcut}`}
                sx={{ bgcolor:'rgba(59,130,246,0.14)', color:'#93c5fd', fontSize:10, fontWeight:700, height:18, mt:0.3 }} />
            )}
          </Box>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink:0 }}>
          <IconButton size="small" onClick={()=>onEdit(label)}
            sx={{ color:MUTED, '&:hover':{ color:'#60a5fa', bgcolor:'rgba(59,130,246,0.12)' } }}>
            <EditIcon sx={{ fontSize:16 }} />
          </IconButton>
          <IconButton size="small" onClick={()=>onDelete(label)}
            sx={{ color:MUTED, '&:hover':{ color:DANGER, bgcolor:'rgba(239,68,68,0.12)' } }}>
            <DeleteIcon sx={{ fontSize:16 }} />
          </IconButton>
        </Stack>
      </Box>
      {label.description && (
        <Typography sx={{ color:MUTED, fontSize:13, lineHeight:1.5,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {label.description}
        </Typography>
      )}
    </CardContent>
  </Card>
);

/* ─── Form Dialog ── */
const LabelFormDialog = ({ open, initial, onClose, onSave }) => {
  const [form, setForm] = useState({ name:'', color:'#3b82f6', description:'', shortcut:'' });
  useEffect(()=>{
    if(open) setForm({ name:initial?.name||'', color:initial?.color||'#3b82f6', description:initial?.description||'', shortcut:initial?.shortcut||'' });
  }, [open, initial]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx:{ bgcolor:'#0d1829', border:`1px solid ${BORDER}`, borderRadius:3, color:TEXT } }}>
      <DialogTitle sx={{ fontWeight:800, borderBottom:`1px solid ${BORDER}`, pb:2 }}>
        {initial ? '✏️ Sửa nhãn' : '🏷️ Tạo nhãn mới'}
      </DialogTitle>
      <DialogContent sx={{ pt:3 }}>
        <Stack spacing={3}>
          <TextField fullWidth label="Tên nhãn *" value={form.name}
            onChange={e=>setForm(p=>({...p,name:e.target.value}))}
            placeholder="VD: dog, cat, car, person..." sx={inputSx} />

          <Box>
            <Typography sx={{ color:MUTED, fontSize:13, mb:1.2 }}>Màu nhãn</Typography>
            <Box sx={{ display:'flex', gap:1.2, flexWrap:'wrap', alignItems:'center' }}>
              {PRESET_COLORS.map(c=>(
                <Box key={c} onClick={()=>setForm(p=>({...p,color:c}))}
                  sx={{
                    width:28, height:28, borderRadius:'50%', bgcolor:c, cursor:'pointer',
                    border:form.color===c?'3px solid #fff':'2px solid transparent',
                    boxShadow:form.color===c?`0 0 0 2px ${c}`:'none',
                    transform:form.color===c?'scale(1.2)':'scale(1)', transition:'all 0.15s',
                  }} />
              ))}
              <TextField size="small" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))}
                sx={{ ...inputSx, width:110 }} inputProps={{ maxLength:7 }} />
            </Box>
            <Box sx={{ mt:1.5, p:1.2, bgcolor:'#07101d', borderRadius:2, border:`1px solid ${BORDER}`, display:'inline-flex', alignItems:'center', gap:1 }}>
              <Box sx={{ width:12, height:12, borderRadius:'50%', bgcolor:form.color }} />
              <Typography sx={{ color:form.color, fontWeight:700, fontSize:13 }}>{form.name||'preview'}</Typography>
            </Box>
          </Box>

          <TextField fullWidth label="Mô tả (tùy chọn)" multiline minRows={2} value={form.description}
            onChange={e=>setForm(p=>({...p,description:e.target.value}))} sx={inputSx} />

          <TextField fullWidth label="Phím tắt (tùy chọn)" value={form.shortcut}
            onChange={e=>setForm(p=>({...p,shortcut:e.target.value}))}
            placeholder="VD: d, c, 1..." sx={inputSx}
            InputProps={{ startAdornment:<InputAdornment position="start"><Typography sx={{color:MUTED}}>⌨</Typography></InputAdornment> }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ borderTop:`1px solid ${BORDER}`, px:3, py:2, gap:1 }}>
        <Button onClick={onClose} sx={{ color:MUTED, textTransform:'none' }}>Hủy</Button>
        <Button variant="contained" onClick={()=>onSave(form)} disabled={!form.name.trim()}
          startIcon={initial?<EditIcon />:<AddIcon />}
          sx={{ bgcolor:PRIMARY, textTransform:'none', fontWeight:700, borderRadius:2, px:3, '&:hover':{ bgcolor:'#2563eb' } }}>
          {initial ? 'Cập nhật' : 'Tạo nhãn'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ─── MAIN ── */
export default function Labels() {
  const [labels, setLabels]         = useState([]);
  const [search, setSearch]         = useState('');
  const [toast, setToast]           = useState({ open:false, msg:'', sev:'success' });
  const [formOpen, setFormOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (msg, sev='success') => setToast({ open:true, msg, sev });

  /* init from localStorage */
  useEffect(() => { setLabels(loadFromStorage()); }, []);

  const persist = (newLabels) => { setLabels(newLabels); saveToStorage(newLabels); };

  const handleSave = (form) => {
    if (!form.name.trim()) return;
    let updated;
    if (editTarget) {
      updated = labels.map(l => l.id === editTarget.id ? { ...l, ...form } : l);
      showToast('Cập nhật nhãn thành công');
    } else {
      updated = [...labels, { id:genId(), name:form.name.trim(), color:form.color, description:form.description, shortcut:form.shortcut }];
      showToast('Tạo nhãn thành công');
    }
    persist(updated);
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    persist(labels.filter(l => l.id !== deleteTarget.id));
    showToast('Đã xóa nhãn');
    setDeleteTarget(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labels.filter(l => !q || l.name.toLowerCase().includes(q) || (l.description||'').toLowerCase().includes(q));
  }, [labels, search]);

  return (
    <Box sx={{ minHeight:'100vh', bgcolor:BG }}>
      {/* Header */}
      <Box sx={{ px:3.5, py:3, borderBottom:`1px solid ${BORDER}`, bgcolor:PANEL }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:2, flexWrap:'wrap' }}>
          <Box>
            <Typography sx={{ color:TEXT, fontSize:28, fontWeight:800, lineHeight:1 }}>Labels</Typography>
            <Typography sx={{ color:MUTED, mt:0.5, fontSize:14 }}>
              Quản lý nhãn dùng chung cho tất cả project annotation
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Làm mới">
              <IconButton onClick={()=>setLabels(loadFromStorage())}
                sx={{ color:MUTED, '&:hover':{ color:TEXT, bgcolor:'rgba(255,255,255,0.06)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={()=>{ setEditTarget(null); setFormOpen(true); }}
              sx={{ bgcolor:PRIMARY, borderRadius:2, fontWeight:700, textTransform:'none', px:2.5, '&:hover':{ bgcolor:'#2563eb' } }}>
              Tạo nhãn
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt:2 }}>
          <Chip label={`${labels.length} nhãn`} sx={{ bgcolor:'rgba(59,130,246,0.15)', color:'#93c5fd', fontWeight:700 }} />
        </Stack>
      </Box>

      <Box sx={{ p:3.5 }}>
        {/* Search */}
        <Box sx={{ mb:3, maxWidth:400 }}>
          <TextField fullWidth size="small" placeholder="Tìm nhãn..."
            value={search} onChange={e=>setSearch(e.target.value)} sx={inputSx}
            InputProps={{ startAdornment:<SearchIcon sx={{ color:MUTED, mr:1, fontSize:20 }} /> }} />
        </Box>

        {/* Grid */}
        {filtered.length === 0 && !search ? (
          <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', py:12, gap:2 }}>
            <Box sx={{ width:80, height:80, borderRadius:'50%',
              background:'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))',
              display:'flex', alignItems:'center', justifyContent:'center', border:`2px dashed ${BORDER}` }}>
              <LabelIcon sx={{ fontSize:36, color:PRIMARY, opacity:0.7 }} />
            </Box>
            <Typography sx={{ color:TEXT, fontWeight:700, fontSize:18 }}>Chưa có nhãn nào</Typography>
            <Typography sx={{ color:MUTED, fontSize:14, textAlign:'center', maxWidth:340 }}>
              Tạo master labels để dùng lại trong nhiều project. VD: dog, cat, car, person...
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={()=>{ setEditTarget(null); setFormOpen(true); }}
              sx={{ bgcolor:PRIMARY, textTransform:'none', fontWeight:700, borderRadius:2, px:3, mt:1, '&:hover':{ bgcolor:'#2563eb' } }}>
              Tạo nhãn đầu tiên
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(l=>(
              <Grid item xs={12} sm={6} md={4} lg={3} key={l.id}>
                <LabelCard label={l} onEdit={l=>{ setEditTarget(l); setFormOpen(true); }} onDelete={setDeleteTarget} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Card onClick={()=>{ setEditTarget(null); setFormOpen(true); }}
                sx={{ bgcolor:'transparent', border:`1.5px dashed ${BORDER}`, borderRadius:3, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', minHeight:130,
                  '&:hover':{ borderColor:PRIMARY, bgcolor:'rgba(59,130,246,0.06)' } }}>
                <Stack alignItems="center" spacing={1}>
                  <AddIcon sx={{ color:MUTED, fontSize:32 }} />
                  <Typography sx={{ color:MUTED, fontSize:14 }}>Thêm nhãn mới</Typography>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      <LabelFormDialog open={formOpen} initial={editTarget}
        onClose={()=>{ setFormOpen(false); setEditTarget(null); }} onSave={handleSave} />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        PaperProps={{ sx:{ bgcolor:'#0d1829', border:`1px solid ${BORDER}`, borderRadius:3, color:TEXT } }}>
        <DialogTitle sx={{ fontWeight:800 }}>Xóa nhãn</DialogTitle>
        <DialogContent>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <Box sx={{ width:14, height:14, borderRadius:'50%', bgcolor:deleteTarget?.color||PRIMARY, flexShrink:0 }} />
            <Typography>Xóa nhãn <strong>"{deleteTarget?.name}"</strong>?</Typography>
          </Box>
          <Typography sx={{ color:DANGER, fontSize:13, mt:1 }}>⚠ Hành động không thể hoàn tác.</Typography>
        </DialogContent>
        <DialogActions sx={{ px:3, py:2, gap:1 }}>
          <Button onClick={()=>setDeleteTarget(null)} sx={{ color:MUTED, textTransform:'none' }}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleDelete}
            sx={{ textTransform:'none', fontWeight:700, borderRadius:2, px:3 }}>
            Xóa nhãn
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={()=>setToast(p=>({...p,open:false}))}
        anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={toast.sev} onClose={()=>setToast(p=>({...p,open:false}))} sx={{ borderRadius:2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

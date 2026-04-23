import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Label as LabelIcon } from '@mui/icons-material';

const BORDER = '#1e2d47', PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
};

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e',
];

const LabelFormDialog = ({ open, initial, onClose, onSave, saving }) => {
  const [form, setForm] = useState({ name: '', color: '#3b82f6', description: '', shortcut: '' });

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name || '',
        color: initial.color || '#3b82f6',
        description: initial.description || '',
        shortcut: initial.shortcut || '',
      } : { name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], description: '', shortcut: '' });
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="xs"
      PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {initial ? <EditIcon sx={{ color: PRIMARY }} /> : <LabelIcon sx={{ color: PRIMARY }} />}
        {initial ? 'Chỉnh sửa nhãn' : 'Tạo nhãn mới'}
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <TextField fullWidth label="Tên nhãn *" value={form.name} autoFocus
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="VD: dog, vehicle..." sx={inputSx} />
            
          <Box>
            <Typography sx={{ color: MUTED, fontSize: 12, mb: 1, ml: 0.5 }}>Màu sắc *</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {COLORS.map(c => (
                <Box key={c} onClick={() => setForm(p => ({ ...p, color: c }))} sx={{
                  width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                  transition: 'all 0.15s', '&:hover': { transform: 'scale(1.1)' }
                }} />
              ))}
            </Box>
          </Box>
          
          <TextField fullWidth label="Phím tắt" value={form.shortcut}
            onChange={e => setForm(p => ({ ...p, shortcut: e.target.value.slice(0, 1).toUpperCase() }))}
            placeholder="1 ký tự (VD: D)" sx={inputSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><Box sx={{ color: MUTED }}>⌨</Box></InputAdornment> }} />
            
          <TextField fullWidth label="Mô tả" multiline minRows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Hướng dẫn cách gán nhãn này..." sx={inputSx} />
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : (initial ? <EditIcon /> : <AddIcon />)}
          sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
          {saving ? 'Đang lưu...' : (initial ? 'Lưu thay đổi' : 'Tạo nhãn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabelFormDialog;

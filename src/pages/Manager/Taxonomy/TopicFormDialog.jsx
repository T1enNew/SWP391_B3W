import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, TextField,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Category as CategoryIcon } from '@mui/icons-material';

const BORDER = '#1e2d47', PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: PRIMARY },
};

const TopicFormDialog = ({ open, initial, onClose, onSave, saving }) => {
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { name: initial.name || '', description: initial.description || '' }
        : { name: '', description: '' }
      );
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>

      <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5,
          background: initial ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initial ? <EditIcon sx={{ fontSize: 17, color: '#fff' }} /> : <CategoryIcon sx={{ fontSize: 17, color: '#fff' }} />}
        </Box>
        {initial ? 'Chỉnh sửa topic' : 'Tạo topic mới'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <TextField fullWidth label="Tên topic *" value={form.name} autoFocus
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="VD: animal, vehicle, person..." sx={inputSx} />
          <TextField fullWidth label="Mô tả (tuỳ chọn)" multiline minRows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Mô tả topic này dùng để nhóm các nhãn gì..." sx={inputSx} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}
          sx={{ color: MUTED, textTransform: 'none', fontWeight: 600, '&:hover': { color: TEXT } }}>
          Hủy
        </Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : (initial ? <EditIcon /> : <AddIcon />)}
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3,
            '&:hover': { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
            '&.Mui-disabled': { opacity: 0.5 },
          }}>
          {saving ? 'Đang lưu...' : (initial ? 'Lưu thay đổi' : 'Tạo topic')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TopicFormDialog;

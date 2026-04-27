import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Stack, TextField, Typography,
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
  '& .MuiInputLabel-root.Mui-focused': { color: PRIMARY },
};

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#ec4899', '#f43f5e',
];

const hexToRgb = (hex = '#3b82f6') => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `${r},${g},${b}`;
};

const LabelFormDialog = ({ open, initial, onClose, onSave, saving, topics = [], prefillTopicId = '' }) => {
  const [form, setForm] = useState({ name: '', color: '#3b82f6', description: '', shortcut: '', topic_id: '' });

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name || '',
        color: initial.color || '#3b82f6',
        description: initial.description || '',
        shortcut: initial.shortcut || '',
        topic_id: initial.topic_id || initial.topic?.id || '',
      } : {
        name: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        description: '',
        shortcut: '',
        topic_id: prefillTopicId,   // Điền sẵn topic khi bấm "+" trên chip topic
      });
    }
  }, [open, initial, prefillTopicId]);

  const rgb = hexToRgb(form.color);

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>

      <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5,
          background: initial ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'linear-gradient(135deg,#10b981,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initial ? <EditIcon sx={{ fontSize: 17, color: '#fff' }} /> : <LabelIcon sx={{ fontSize: 17, color: '#fff' }} />}
        </Box>
        {initial ? 'Chỉnh sửa nhãn' : 'Tạo nhãn mới'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          {/* Live preview */}
          <Box sx={{
            border: `1px solid ${BORDER}`, borderLeft: `4px solid ${form.color}`,
            borderRadius: 2, p: 1.8, bgcolor: '#080f1e',
            display: 'flex', alignItems: 'center', gap: 1.5,
            boxShadow: `0 4px 16px rgba(${rgb},0.15)`,
          }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 1.5, bgcolor: form.color, flexShrink: 0,
              boxShadow: `0 2px 8px rgba(${rgb},0.4)`,
            }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: form.name ? TEXT : MUTED }}>
                {form.name || 'Tên nhãn...'}
              </Typography>
              {form.shortcut && (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.4,
                  bgcolor: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: 0.8, px: 0.8, py: 0.2, mt: 0.3,
                }}>
                  <Typography sx={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>
                    ⌨ {form.shortcut}
                  </Typography>
                </Box>
              )}
            </Box>
            {form.description && (
              <Typography sx={{ color: MUTED, fontSize: 12, ml: 'auto', maxWidth: 160, textAlign: 'right',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                {form.description}
              </Typography>
            )}
          </Box>

          <TextField fullWidth label="Tên nhãn *" value={form.name} autoFocus
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="VD: dog, vehicle, person..." sx={inputSx} />

          {/* Color picker */}
          <Box>
            <Typography sx={{ color: MUTED, fontSize: 12, mb: 1.2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Màu sắc
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {COLORS.map(c => (
                <Box key={c} onClick={() => setForm(p => ({ ...p, color: c }))} sx={{
                  width: 30, height: 30, borderRadius: '8px', bgcolor: c, cursor: 'pointer',
                  border: form.color === c ? '2.5px solid #fff' : '2px solid transparent',
                  boxShadow: form.color === c ? `0 0 0 2.5px ${c}` : 'none',
                  transition: 'all 0.12s', '&:hover': { transform: 'scale(1.15)', boxShadow: `0 0 8px rgba(${hexToRgb(c)},0.5)` },
                }} />
              ))}
            </Box>
          </Box>

          {topics.length > 0 && (
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>Topic (tuỳ chọn)</InputLabel>
              <Select value={form.topic_id} label="Topic (tuỳ chọn)"
                onChange={e => setForm(p => ({ ...p, topic_id: e.target.value }))}
                sx={{ bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2d4060' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY },
                  '& .MuiSvgIcon-root': { color: MUTED },
                }}
                MenuProps={{ PaperProps: { sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, color: TEXT } } }}>
                <MenuItem value=""><em style={{ color: MUTED }}>Không chọn</em></MenuItem>
                {topics.map(t => (
                  <MenuItem key={t.id} value={t.id} sx={{ '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' } }}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField fullWidth label="Phím tắt (tuỳ chọn)" value={form.shortcut}
            onChange={e => setForm(p => ({ ...p, shortcut: e.target.value.slice(0, 1).toUpperCase() }))}
            placeholder="1 ký tự (VD: D)" sx={inputSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><Box sx={{ color: MUTED, fontFamily: 'monospace' }}>⌨</Box></InputAdornment> }} />

          <TextField fullWidth label="Mô tả (tuỳ chọn)" multiline minRows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Hướng dẫn cách gán nhãn này..." sx={inputSx} />
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
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3,
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' },
            '&.Mui-disabled': { opacity: 0.5 },
          }}>
          {saving ? 'Đang lưu...' : (initial ? 'Lưu thay đổi' : 'Tạo nhãn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabelFormDialog;

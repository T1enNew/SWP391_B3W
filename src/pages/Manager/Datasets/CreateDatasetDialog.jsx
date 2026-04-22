import React from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, TextField,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { BORDER, MUTED, PRIMARY, TEXT, inputSx } from './utils';

const CreateDatasetDialog = ({ open, onClose, createForm, setCreateForm, creating, handleCreate }) => (
  <Dialog open={open} onClose={() => !creating && onClose()} fullWidth maxWidth="sm"
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
      <Button onClick={onClose} disabled={creating} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
      <Button variant="contained" onClick={handleCreate} disabled={creating}
        startIcon={creating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AddIcon />}
        sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
        {creating ? 'Đang tạo...' : 'Tạo Dataset'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default CreateDatasetDialog;

import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

const BORDER = '#1e2d47', TEXT = '#e2e8f0', MUTED = '#64748b', DANGER = '#ef4444', PRIMARY = '#3b82f6';

const DeleteLabelDialog = ({ deleteTarget, onClose, onConfirm }) => (
  <Dialog open={!!deleteTarget} onClose={onClose}
    PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
    <DialogTitle sx={{ fontWeight: 800 }}>Xóa nhãn</DialogTitle>
    <DialogContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: deleteTarget?.color || PRIMARY, flexShrink: 0 }} />
        <Typography>Xóa nhãn <strong>"{deleteTarget?.name}"</strong>?</Typography>
      </Box>
      <Typography sx={{ color: DANGER, fontSize: 13, mt: 1 }}>⚠ Hành động không thể hoàn tác.</Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
      <Button onClick={onClose} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
      <Button variant="contained" color="error" onClick={onConfirm}
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>
        Xóa nhãn
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteLabelDialog;

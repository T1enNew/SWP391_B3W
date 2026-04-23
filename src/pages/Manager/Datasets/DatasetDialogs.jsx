import React from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { BORDER, DANGER, MUTED, PRIMARY, SUCCESS, TEXT, WARNING } from './constants';
import { inputSx } from './constants';
import { coerceId, fmtDateTime } from './utils';

/* ── small helper used only by InfoDialog ── */
const DsInfoRow = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', gap: 1, py: 0.8, borderBottom: `1px solid ${BORDER}` }}>
    <Typography sx={{ color: MUTED, fontSize: 13, minWidth: 120, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ color: color || TEXT, fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value ?? '—'}</Typography>
  </Box>
);

/* ── Create ── */
export const CreateDatasetDialog = ({ open, creating, createForm, setCreateForm, onClose, onCreate }) => (
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
      <Button variant="contained" onClick={onCreate} disabled={creating}
        startIcon={creating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AddIcon />}
        sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
        {creating ? 'Đang tạo...' : 'Tạo Dataset'}
      </Button>
    </DialogActions>
  </Dialog>
);

/* ── Edit ── */
export const EditDatasetDialog = ({ editDs, editing, editForm, setEditForm, onClose, onSave }) => (
  <Dialog open={!!editDs} onClose={() => !editing && onClose()} fullWidth maxWidth="sm"
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
      <Button onClick={onClose} disabled={editing} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
      <Button variant="contained" onClick={onSave} disabled={editing}
        startIcon={editing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <EditIcon />}
        sx={{ bgcolor: PRIMARY, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#2563eb' } }}>
        {editing ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </DialogActions>
  </Dialog>
);

/* ── Delete confirm ── */
export const DeleteDatasetDialog = ({ deleteTarget, deleting, onClose, onConfirm }) => (
  <Dialog open={!!deleteTarget} onClose={() => !deleting && onClose()}
    PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
    <DialogTitle sx={{ fontWeight: 800 }}>Xóa Dataset</DialogTitle>
    <DialogContent>
      <Typography>Bạn có chắc muốn xóa dataset <strong>"{deleteTarget?.name}"</strong>?</Typography>
      <Typography sx={{ color: DANGER, fontSize: 13, mt: 1 }}>⚠ Tất cả ảnh trong dataset này sẽ bị xóa vĩnh viễn.</Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
      <Button onClick={onClose} disabled={deleting} sx={{ color: MUTED, textTransform: 'none' }}>Hủy</Button>
      <Button variant="contained" color="error" onClick={onConfirm} disabled={deleting}
        startIcon={deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>
        {deleting ? 'Đang xóa...' : 'Xóa Dataset'}
      </Button>
    </DialogActions>
  </Dialog>
);

/* ── Info ── */
export const InfoDialog = ({ infoDs, onClose }) => (
  <Dialog open={!!infoDs} onClose={onClose} maxWidth="xs" fullWidth
    PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, pb: 2 }}>
      <Typography fontWeight={800} fontSize={16}>{infoDs?.name}</Typography>
      <IconButton onClick={onClose} size="small" sx={{ color: MUTED, '&:hover': { color: TEXT } }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <DialogContent sx={{ pt: 2.5 }}>
      <DsInfoRow label="Tên dataset"        value={infoDs?.name}                              color="#93c5fd" />
      <DsInfoRow label="Mô tả"              value={infoDs?.description || 'Không có mô tả'} />
      <DsInfoRow label="Loại"               value={(infoDs?.type || 'image').toUpperCase()} />
      <DsInfoRow label="Tổng ảnh"           value={infoDs?.total_items || infoDs?.totalItems || 0} color={WARNING} />
      <DsInfoRow label="Ngày tạo"           value={fmtDateTime(infoDs?.created_at || infoDs?.createdAt)} color={SUCCESS} />
      {(infoDs?.updated_at || infoDs?.updatedAt) && (
        <DsInfoRow label="Cập nhật lần cuối" value={fmtDateTime(infoDs?.updated_at || infoDs?.updatedAt)} />
      )}
      <DsInfoRow label="Dataset ID"         value={coerceId(infoDs)} color={MUTED} />
    </DialogContent>
    <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 1.5 }}>
      <Button onClick={onClose} sx={{ color: MUTED, textTransform: 'none' }}>Đóng</Button>
    </DialogActions>
  </Dialog>
);

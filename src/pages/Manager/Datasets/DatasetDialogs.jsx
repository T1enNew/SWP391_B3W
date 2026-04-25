import React from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Fingerprint as FingerprintIcon,
  Image as ImageIcon,
  Info as InfoIcon,
  Notes as NotesIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { BORDER, CARD, DANGER, MUTED, PRIMARY, SUCCESS, TEXT, WARNING } from './constants';
import { inputSx } from './constants';
import { coerceId, fmtDateTime } from './utils';

/* ── small helper used only by InfoDialog ── */
const DsInfoRow = ({ icon: Icon, label, value, color, mono }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1 }}>
    <Box sx={{
      width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
      bgcolor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {Icon && <Icon sx={{ fontSize: 15, color: PRIMARY }} />}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ color: MUTED, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6, lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography sx={{
        color: color || TEXT, fontSize: 13, fontWeight: 500, mt: 0.3,
        wordBreak: 'break-all', lineHeight: 1.4,
        ...(mono ? { fontFamily: 'monospace', fontSize: 11, color: MUTED } : {}),
      }}>
        {value ?? '—'}
      </Typography>
    </Box>
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
export const InfoDialog = ({ infoDs, onClose }) => {
  const totalItems = infoDs?.total_items ?? infoDs?.totalItems ?? 0;
  const dsType = (infoDs?.type || 'image').toUpperCase();
  const isComplete = infoDs?.status === 'completed' || infoDs?.is_complete;

  return (
    <Dialog open={!!infoDs} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: '#0d1829', border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT, overflow: 'hidden' } }}>

      {/* ── Header band ── */}
      <Box sx={{
        px: 2.5, pt: 2.5, pb: 2,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(15,26,46,0) 100%)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                bgcolor: isComplete ? SUCCESS : WARNING,
                boxShadow: isComplete ? `0 0 6px ${SUCCESS}` : 'none',
              }} />
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {infoDs?.name || 'Untitled'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', pl: '16px' }}>
              <Chip size="small" label={dsType}
                icon={<ImageIcon sx={{ fontSize: '11px !important', color: `${PRIMARY} !important` }} />}
                sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(59,130,246,0.25)` }} />
              <Chip size="small" label={`${totalItems} ảnh`}
                icon={<PhotoLibraryIcon sx={{ fontSize: '11px !important', color: `${WARNING} !important` }} />}
                sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: WARNING, fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(245,158,11,0.25)` }} />
              {isComplete && (
                <Chip size="small" label="Hoàn thành"
                  sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: SUCCESS, fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(34,197,94,0.25)` }} />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: MUTED, mt: -0.5, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.06)' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* ── Body ── */}
      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <Stack divider={<Divider sx={{ borderColor: BORDER, opacity: 0.5 }} />} spacing={0}>
          <DsInfoRow icon={NotesIcon}       label="Mô tả"              value={infoDs?.description || 'Không có mô tả'} />
          <DsInfoRow icon={CalendarIcon}    label="Ngày tạo"           value={fmtDateTime(infoDs?.created_at || infoDs?.createdAt)} color={SUCCESS} />
          {(infoDs?.updated_at || infoDs?.updatedAt) && (
            <DsInfoRow icon={UpdateIcon}    label="Cập nhật lần cuối"  value={fmtDateTime(infoDs?.updated_at || infoDs?.updatedAt)} />
          )}
          <DsInfoRow icon={FingerprintIcon} label="Dataset ID"         value={coerceId(infoDs)} mono />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ color: MUTED, textTransform: 'none', fontSize: 13 }}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

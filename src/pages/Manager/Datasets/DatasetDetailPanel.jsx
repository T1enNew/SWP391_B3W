import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Grid,
  IconButton, LinearProgress, Pagination, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon,
  FolderOpen as FolderIcon,
  HourglassTop as PendingIcon,
  Image as ImageIcon,
  Pending as ReviewIcon,
  TaskAlt as TaskAltIcon,
} from '@mui/icons-material';
import { BG, BORDER, CARD, DANGER, MUTED, PANEL, PRIMARY, SUCCESS, TEXT, WARNING } from './constants';
import { buildImageUrl, coerceId } from './utils';

const ImgThumb = ({ src, name }) => {
  const [err, setErr] = useState(false);
  return err || !src ? (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#07101d' }}>
      <ImageIcon sx={{ color: MUTED, fontSize: 32 }} />
    </Box>
  ) : (
    <Box component="img" src={src} alt={name} onError={() => setErr(true)}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  );
};

const ITEMS_PER_PAGE = 12;

const DatasetDetailPanel = ({
  selectedDs, dsItems, isComplete, dsStats, uploading, uploadProgress, itemsLoading,
  deletingItemId, fileInputRef, getTasksForItem,
  onUpload, onDeleteItem, onItemClick, onExport, onDrop,
}) => {
  const [itemPage, setItemPage] = useState(1);

  useEffect(() => { setItemPage(1); }, [selectedDs]);
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(dsItems.length / ITEMS_PER_PAGE));
    if (itemPage > maxPage) setItemPage(maxPage);
  }, [dsItems.length]);

  const totalItemPages  = Math.max(1, Math.ceil(dsItems.length / ITEMS_PER_PAGE));
  const paginatedItems  = dsItems.slice((itemPage - 1) * ITEMS_PER_PAGE, itemPage * ITEMS_PER_PAGE);

  if (!selectedDs) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: MUTED, gap: 2 }}>
        <FolderIcon sx={{ fontSize: 72, opacity: 0.25 }} />
        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>Chọn dataset để xem & upload ảnh</Typography>
        <Typography sx={{ fontSize: 14, color: '#475569' }}>Hoặc tạo dataset mới bằng nút "Tạo Dataset"</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: BG }}>
      {/* ── Header ── */}
      <Box sx={{
        px: 3, py: 2, borderBottom: `1px solid ${BORDER}`,
        bgcolor: isComplete ? 'rgba(34,197,94,0.04)' : PANEL,
        borderTop: isComplete ? `2px solid rgba(34,197,94,0.35)` : 'none',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', minWidth: 0 }}>
            <Typography sx={{ color: TEXT, fontWeight: 800, fontSize: 20 }}>{selectedDs.name}</Typography>
            {isComplete ? (
              <Chip icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: `${SUCCESS} !important` }} />}
                label="Hoàn thành" size="small"
                sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: SUCCESS, fontWeight: 700, border: `1px solid rgba(34,197,94,0.35)`, fontSize: 12 }} />
            ) : dsItems.length > 0 ? (
              <Chip label="Đang xử lý" size="small"
                sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: WARNING, fontWeight: 700, border: `1px solid rgba(245,158,11,0.3)`, fontSize: 12 }} />
            ) : null}
            {selectedDs.description && (
              <Typography sx={{ color: MUTED, fontSize: 13 }}>{selectedDs.description}</Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            {isComplete && (
              <Tooltip title="Xuất toàn bộ dữ liệu đã duyệt dưới dạng JSON">
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={onExport}
                  sx={{ bgcolor: SUCCESS, fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2.5, '&:hover': { bgcolor: '#16a34a' }, boxShadow: `0 0 12px rgba(34,197,94,0.35)` }}>
                  Export JSON
                </Button>
              </Tooltip>
            )}
            <Button variant="outlined"
              startIcon={uploading ? <CircularProgress size={14} sx={{ color: PRIMARY }} /> : <UploadIcon />}
              disabled={uploading} onClick={() => fileInputRef.current?.click()}
              sx={{ borderColor: BORDER, color: TEXT, borderRadius: 2, fontWeight: 600, textTransform: 'none', px: 2, '&:hover': { borderColor: PRIMARY, color: PRIMARY } }}>
              {uploading ? `${uploadProgress}%` : 'Upload ảnh'}
            </Button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.zip" hidden onChange={e => onUpload(e.target.files)} />
          </Stack>
        </Box>

        {/* Stats row */}
        {dsItems.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
            {[
              { icon: <TaskAltIcon sx={{ fontSize: 13 }} />, label: 'Approved',  value: isComplete ? dsItems.length : dsStats.approved,  color: SUCCESS, bg: 'rgba(34,197,94,0.1)' },
              { icon: <ReviewIcon  sx={{ fontSize: 13 }} />, label: 'Reviewing', value: dsStats.reviewing,  color: WARNING, bg: 'rgba(245,158,11,0.1)' },
              { icon: <PendingIcon sx={{ fontSize: 13 }} />, label: 'Annotating',value: dsStats.annotating, color: PRIMARY, bg: 'rgba(59,130,246,0.1)' },
              { icon: null, label: 'Rework',    value: dsStats.rework,    color: DANGER, bg: 'rgba(239,68,68,0.1)' },
              { icon: null, label: 'Tổng ảnh',  value: dsItems.length,    color: MUTED,  bg: 'rgba(100,116,139,0.1)' },
            ].map(s => (
              <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.6, borderRadius: 1.5, bgcolor: s.bg, border: `1px solid ${s.color}22` }}>
                {s.icon && <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>}
                <Typography sx={{ fontSize: 11, color: MUTED }}>{s.label}:</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {isComplete && (
          <Typography sx={{ color: '#4ade80', fontSize: 11, mt: 1, opacity: 0.8 }}>
            ✓ Tất cả ảnh đã được duyệt • Click vào ảnh để xem annotator & labels • Dùng "Export JSON" để tải xuống dữ liệu
          </Typography>
        )}
        {uploading && (
          <LinearProgress variant="determinate" value={uploadProgress}
            sx={{ mt: 1.5, height: 3, borderRadius: 4, bgcolor: 'rgba(59,130,246,0.15)', '& .MuiLinearProgress-bar': { bgcolor: PRIMARY } }} />
        )}
      </Box>

      {/* ── Empty drop zone ── */}
      {dsItems.length === 0 && !itemsLoading && (
        <Box onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
          sx={{ m: 3, borderRadius: 3, border: `2px dashed ${BORDER}`, bgcolor: PANEL, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 1.5, transition: 'all 0.2s', '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.05)' } }}>
          <UploadIcon sx={{ fontSize: 52, color: MUTED, opacity: 0.6 }} />
          <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>Kéo thả ảnh vào đây</Typography>
          <Typography sx={{ color: MUTED, fontSize: 13 }}>Hoặc click để chọn file • JPG, PNG, WEBP, ZIP</Typography>
        </Box>
      )}

      {/* ── Items grid ── */}
      {itemsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress sx={{ color: PRIMARY }} />
        </Box>
      ) : dsItems.length > 0 && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column' }}>
          <Box onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
            sx={{ mb: 2, borderRadius: 2, border: `1px dashed ${BORDER}`, bgcolor: PANEL, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, transition: 'all 0.2s', '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.05)' } }}>
            <UploadIcon sx={{ color: MUTED, fontSize: 20 }} />
            <Typography sx={{ color: MUTED, fontSize: 13 }}>Kéo thả hoặc click để upload thêm ảnh</Typography>
          </Box>

          {/* Page info */}
          {totalItemPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ color: MUTED, fontSize: 12 }}>
                Hiển thị {(itemPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(itemPage * ITEMS_PER_PAGE, dsItems.length)} / {dsItems.length} ảnh
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            {paginatedItems.map((item, idx) => {
              const globalIdx      = (itemPage - 1) * ITEMS_PER_PAGE + idx;
              const id             = coerceId(item) || globalIdx;
              const name           = item.originalName || item.original_name || item.filename || `item-${globalIdx + 1}`;
              const src            = buildImageUrl(item);
              const isDeletingThis = deletingItemId === (coerceId(item) || item.path);
              const approved       = item.status === 'approved' || getTasksForItem(item).some(t => t.status === 'approved') || isComplete;
              return (
                <Grid item xs={6} sm={4} md={3} lg={2} key={id}>
                  <Card sx={{ bgcolor: CARD, border: `1px solid ${approved && isComplete ? 'rgba(34,197,94,0.35)' : BORDER}`, borderRadius: 2, overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s', '&:hover': { borderColor: isComplete ? SUCCESS : PRIMARY } }}>
                    <Box onClick={() => onItemClick(item)} sx={{ position: 'relative', pt: '75%', bgcolor: '#07101d', cursor: 'pointer' }}>
                      <Box sx={{ position: 'absolute', inset: 0 }}>
                        <ImgThumb src={src} name={name} />
                      </Box>
                      {approved && (
                        <Box sx={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: '50%', bgcolor: SUCCESS, border: '1.5px solid rgba(0,0,0,0.5)', boxShadow: `0 0 4px ${SUCCESS}` }} />
                      )}
                    </Box>
                    <CardContent sx={{ p: '6px 8px', '&:last-child': { pb: '6px' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title={name}>
                        <Typography onClick={() => onItemClick(item)}
                          sx={{ color: TEXT, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'pointer' }}>
                          {name}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Xóa ảnh">
                        <IconButton size="small" onClick={e => onDeleteItem(e, item)} disabled={!!isDeletingThis}
                          sx={{ flexShrink: 0, width: 22, height: 22, color: '#64748b', '&:hover': { color: '#fff', bgcolor: 'rgba(239,68,68,0.3)' } }}>
                          {isDeletingThis ? <CircularProgress size={11} sx={{ color: '#94a3b8' }} /> : <DeleteIcon sx={{ fontSize: 13 }} />}
                        </IconButton>
                      </Tooltip>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination for items */}
          {totalItemPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalItemPages} page={itemPage} onChange={(_, v) => { setItemPage(v); }}
                sx={{
                  '& .MuiPaginationItem-root': { color: MUTED, borderColor: BORDER },
                  '& .MuiPaginationItem-root.Mui-selected': { bgcolor: PRIMARY, color: '#fff', borderColor: PRIMARY },
                  '& .MuiPaginationItem-root:hover': { bgcolor: 'rgba(59,130,246,0.12)' },
                }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DatasetDetailPanel;

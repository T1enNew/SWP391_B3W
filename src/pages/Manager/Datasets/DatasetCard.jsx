import React from 'react';
import { Box, Card, CardContent, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { BORDER, CARD, MUTED, PRIMARY, SUCCESS, TEXT, WARNING } from './constants';
import { coerceId, fmtDate } from './utils';

const DatasetCard = ({ ds, isSelected, dsComplete, dsInProgress, onSelect, onOpenInfo, onOpenEdit, onDeleteTarget }) => (
  <Card onClick={() => onSelect(ds)} sx={{
    bgcolor: isSelected ? 'rgba(59,130,246,0.12)' : CARD,
    border:  `1px solid ${dsComplete ? 'rgba(34,197,94,0.5)' : isSelected ? PRIMARY : BORDER}`,
    borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.15s',
    '&:hover': { borderColor: dsComplete ? SUCCESS : isSelected ? PRIMARY : '#2d4a6e', bgcolor: isSelected ? 'rgba(59,130,246,0.18)' : '#172133' },
  }}>
    <CardContent sx={{ p: '12px 14px', '&:last-child': { pb: '12px' } }}>

      {/* Top row: status dot + name + actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            bgcolor: dsComplete ? SUCCESS : dsInProgress ? WARNING : '#475569',
            boxShadow: dsComplete ? `0 0 6px ${SUCCESS}` : 'none',
          }} />
          <Typography sx={{ color: '#ffffff', fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.1 }}>
            {ds.name || 'Untitled'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.3, flexShrink: 0 }}>
          <Tooltip title="Thông tin">
            <IconButton size="small" onClick={e => { e.stopPropagation(); onOpenInfo(ds); }}
              sx={{ color: '#475569', width: 24, height: 24, '&:hover': { color: '#fff', bgcolor: 'rgba(59,130,246,0.25)' } }}>
              <InfoIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton size="small" onClick={e => onOpenEdit(e, ds)}
              sx={{ color: '#475569', width: 24, height: 24, '&:hover': { color: '#fff', bgcolor: 'rgba(59,130,246,0.25)' } }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa">
            <IconButton size="small" onClick={e => { e.stopPropagation(); onDeleteTarget(ds); }}
              sx={{ color: '#475569', width: 24, height: 24, '&:hover': { color: '#fff', bgcolor: 'rgba(239,68,68,0.25)' } }}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {ds.description && (
        <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.4, pl: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ds.description}
        </Typography>
      )}

      {/* Status badge + meta row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1, pl: '16px', flexWrap: 'wrap' }}>
        {dsComplete && (
          <Chip size="small"
            icon={<CheckCircleIcon sx={{ fontSize: '11px !important', color: `${SUCCESS} !important` }} />}
            label="Hoàn thành"
            sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: SUCCESS, fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(34,197,94,0.3)` }} />
        )}
        {dsInProgress && (
          <Chip size="small" label="Đang xử lý"
            sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: WARNING, fontSize: 10, fontWeight: 700, height: 20, border: `1px solid rgba(245,158,11,0.3)` }} />
        )}
        <Chip size="small" label={`${ds.total_items || ds.totalItems || 0} ảnh`}
          sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontSize: 10, fontWeight: 700, height: 20 }} />
        <Typography sx={{ color: '#334155', fontSize: 10 }}>
          {fmtDate(ds.created_at || ds.createdAt)}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

export default DatasetCard;

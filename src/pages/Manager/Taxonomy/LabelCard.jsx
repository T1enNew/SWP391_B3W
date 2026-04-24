import React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

const CARD = '#0d1829', BORDER = '#1e2d47', TEXT = '#e2e8f0', MUTED = '#64748b', DANGER = '#ef4444';

const hexToRgb = (hex = '#3b82f6') => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `${r},${g},${b}`;
};

const LabelCard = ({ label, onEdit, onDelete }) => {
  const rgb = hexToRgb(label.color);

  return (
    <Box sx={{
      bgcolor: CARD,
      border: `1px solid ${BORDER}`,
      borderLeft: `4px solid ${label.color}`,
      borderRadius: 3,
      p: 2.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      minHeight: 120,
      transition: 'all 0.15s',
      cursor: 'default',
      '&:hover': {
        borderColor: label.color,
        borderLeftColor: label.color,
        boxShadow: `0 6px 24px rgba(${rgb},0.18), 0 0 0 1px rgba(${rgb},0.15)`,
        transform: 'translateY(-2px)',
      },
    }}>
      {/* Top row: swatch + name + actions */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Color swatch */}
        <Box sx={{
          width: 40, height: 40, borderRadius: 2, bgcolor: label.color, flexShrink: 0,
          boxShadow: `0 2px 8px rgba(${rgb},0.4)`,
        }} />

        {/* Name + shortcut */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontWeight: 800, fontSize: 15, color: TEXT,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label.name}
          </Typography>
          {label.shortcut && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.4,
              bgcolor: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: 1, px: 0.8, py: 0.2,
            }}>
              <Typography sx={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>
                ⌨ {label.shortcut}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={0.3} sx={{ flexShrink: 0, mt: -0.5 }}>
          <IconButton size="small" onClick={() => onEdit(label)}
            sx={{ color: MUTED, width: 28, height: 28, '&:hover': { color: '#60a5fa', bgcolor: 'rgba(59,130,246,0.12)' } }}>
            <EditIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(label)}
            sx={{ color: MUTED, width: 28, height: 28, '&:hover': { color: DANGER, bgcolor: 'rgba(239,68,68,0.12)' } }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* Description */}
      {label.description ? (
        <Typography sx={{
          color: MUTED, fontSize: 12.5, lineHeight: 1.55,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {label.description}
        </Typography>
      ) : (
        <Typography sx={{ color: 'rgba(100,116,139,0.45)', fontSize: 12, fontStyle: 'italic' }}>
          Chưa có mô tả
        </Typography>
      )}
    </Box>
  );
};

export default LabelCard;

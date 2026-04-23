import React from 'react';
import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

const CARD = '#131f35', BORDER = '#1e2d47', TEXT = '#e2e8f0', MUTED = '#64748b', DANGER = '#ef4444';

const hexToRgb = (hex = '#3b82f6') => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `${r},${g},${b}`;
};

const LabelCard = ({ label, onEdit, onDelete }) => (
  <Card sx={{
    bgcolor: CARD, border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT,
    transition: 'all 0.15s',
    '&:hover': { borderColor: '#2d4a6e', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
  }}>
    <Box sx={{ height: 4, bgcolor: label.color, borderRadius: '12px 12px 0 0' }} />
    <CardContent sx={{ p: 2.2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%', bgcolor: label.color, flexShrink: 0,
            boxShadow: `0 0 0 3px rgba(${hexToRgb(label.color)},0.25)`,
          }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{label.name}</Typography>
            {label.shortcut && (
              <Chip size="small" label={`⌨ ${label.shortcut}`}
                sx={{ bgcolor: 'rgba(59,130,246,0.14)', color: '#93c5fd', fontSize: 10, fontWeight: 700, height: 18, mt: 0.3 }} />
            )}
          </Box>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <IconButton size="small" onClick={() => onEdit(label)}
            sx={{ color: MUTED, '&:hover': { color: '#60a5fa', bgcolor: 'rgba(59,130,246,0.12)' } }}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(label)}
            sx={{ color: MUTED, '&:hover': { color: DANGER, bgcolor: 'rgba(239,68,68,0.12)' } }}>
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Box>
      {label.description && (
        <Typography sx={{
          color: MUTED, fontSize: 13, lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {label.description}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default LabelCard;

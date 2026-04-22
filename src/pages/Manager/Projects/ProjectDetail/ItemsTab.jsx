import React from 'react';
import {
  Box, Button, Card, CardContent, Chip, Grid, Paper, Stack, Typography,
} from '@mui/material';
import { cardSx, panelSx, primaryBtnSx, typePalette } from './constants';
import { getLabelColor } from './utils';

const ItemsTab = ({ approvedItems, datasets, onViewDetail }) => (
  <Stack spacing={3}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
      <Box>
        <Typography variant="h6" fontWeight={800}>Approved items</Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Manager view focused on approved output, real labels, and who created each annotation.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip label={`${approvedItems.length} approved items`} sx={{ bgcolor: 'rgba(34,197,94,0.16)', color: '#22c55e', fontWeight: 700 }} />
        <Chip label={`${datasets.length} datasets`}           sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd', fontWeight: 700 }} />
      </Stack>
    </Box>

    {approvedItems.length === 0 ? (
      <Paper sx={{ ...panelSx, p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#94a3b8' }}>No approved item yet</Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
          Once reviewer approves items, they will appear here with preview and labels.
        </Typography>
      </Paper>
    ) : (
      <Grid container spacing={2}>
        {approvedItems.map((item) => {
          const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
          const firstDataset = datasets.find((ds) => String(ds.id) === String(item.datasetId));
          const palette = typePalette[item.mediaType] || typePalette.other;
          const Icon = palette.icon;
          return (
            <Grid item xs={12} sm={6} lg={4} key={item.key}>
              <Card sx={{ ...cardSx, overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', height: 220, bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.mediaType === 'image' && item.fileUrl ? (
                    <Box component="img" src={item.fileUrl} alt={item.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Stack alignItems="center" spacing={1.2}>
                      <Icon sx={{ color: palette.color, fontSize: 40 }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>{item.fileName}</Typography>
                    </Stack>
                  )}
                  <Chip
                    icon={<Icon sx={{ color: `${palette.color} !important` }} />}
                    label={item.mediaType.toUpperCase()}
                    size="small"
                    sx={{
                      position: 'absolute', top: 12, left: 12,
                      bgcolor: '#0f172a', color: palette.color,
                      border: '1px solid #334155', fontWeight: 700,
                    }}
                  />
                </Box>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={800} noWrap>{item.fileName}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={firstDataset?.name || item.datasetId || 'Unknown dataset'} sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd' }} />
                    <Chip size="small" label={`${item.annotators.length} annotator${item.annotators.length > 1 ? 's' : ''}`} sx={{ bgcolor: 'rgba(16,185,129,0.16)', color: '#6ee7b7' }} />
                    <Chip size="small" label={`${labelSet.length} labels`} sx={{ bgcolor: 'rgba(139,92,246,0.16)', color: '#c4b5fd' }} />
                  </Stack>
                  <Box sx={{ mt: 1.2, display: 'flex', gap: 0.7, flexWrap: 'wrap', minHeight: 28 }}>
                    {labelSet.slice(0, 4).map((label) => (
                      <Chip key={label} size="small" label={label} sx={{ bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
                    ))}
                    {labelSet.length > 4 ? <Chip size="small" label={`+${labelSet.length - 4}`} sx={{ bgcolor: '#334155', color: '#e2e8f0' }} /> : null}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button fullWidth variant="contained" sx={primaryBtnSx} onClick={() => onViewDetail(item)}>
                      View detail
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    )}
  </Stack>
);

export default ItemsTab;

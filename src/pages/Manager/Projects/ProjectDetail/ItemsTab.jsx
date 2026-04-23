import React from 'react';
import {
  Box, Button, Card, Chip, Divider, Grid, Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Label as LabelIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { cardSx, panelSx, primaryBtnSx, typePalette } from './constants';
import { getLabelColor } from './utils';

const MetaStat = ({ icon, value, tooltip }) => (
  <Tooltip title={tooltip} arrow placement="top">
    <Stack direction="row" spacing={0.5} alignItems="center">
      {icon}
      <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>{value}</Typography>
    </Stack>
  </Tooltip>
);

const ItemsTab = ({ approvedItems, datasets, onViewDetail }) => (
  <Stack spacing={3}>
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 22 }} />
          <Typography variant="h6" fontWeight={800}>Approved items</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.3 }}>
          Approved output with real labels and annotator info.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Chip
          icon={<CheckCircleIcon sx={{ color: '#22c55e !important', fontSize: '16px !important' }} />}
          label={`${approvedItems.length} approved`}
          sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 700, border: '1px solid rgba(34,197,94,0.25)' }}
        />
        <Chip
          icon={<StorageIcon sx={{ color: '#93c5fd !important', fontSize: '16px !important' }} />}
          label={`${datasets.length} dataset${datasets.length !== 1 ? 's' : ''}`}
          sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontWeight: 700, border: '1px solid rgba(59,130,246,0.25)' }}
        />
      </Stack>
    </Box>

    {approvedItems.length === 0 ? (
      <Paper sx={{ ...panelSx, p: 6, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 48, color: '#334155', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#94a3b8' }}>No approved item yet</Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.8 }}>
          Once reviewers approve items, they will appear here.
        </Typography>
      </Paper>
    ) : (
      <Grid container spacing={2.5}>
        {approvedItems.map((item) => {
          const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
          const firstDataset = datasets.find((ds) => String(ds.id) === String(item.datasetId));
          const palette = typePalette[item.mediaType] || typePalette.other;
          const Icon = palette.icon;
          return (
            <Grid item xs={12} sm={6} lg={4} key={item.key}>
              <Card
                sx={{
                  ...cardSx,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
                    borderColor: '#475569',
                  },
                }}
              >
                {/* Image / preview area */}
                <Box sx={{ position: 'relative', height: 200, bgcolor: '#0b1220', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.mediaType === 'image' && item.fileUrl ? (
                    <Box component="img" src={item.fileUrl} alt={item.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Stack alignItems="center" spacing={1.5}>
                      <Box sx={{ p: 2, borderRadius: '50%', bgcolor: palette.bg }}>
                        <Icon sx={{ color: palette.color, fontSize: 36 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8', px: 2, textAlign: 'center' }} noWrap>{item.fileName}</Typography>
                    </Stack>
                  )}

                  {/* Type badge */}
                  <Chip
                    icon={<Icon sx={{ color: `${palette.color} !important`, fontSize: '13px !important' }} />}
                    label={item.mediaType.toUpperCase()}
                    size="small"
                    sx={{
                      position: 'absolute', top: 10, left: 10,
                      bgcolor: 'rgba(15,23,42,0.82)',
                      backdropFilter: 'blur(6px)',
                      color: palette.color,
                      border: `1px solid ${palette.color}40`,
                      fontWeight: 700, fontSize: '0.68rem',
                    }}
                  />

                  {/* Approved badge */}
                  <Box sx={{
                    position: 'absolute', top: 10, right: 10,
                    bgcolor: 'rgba(34,197,94,0.18)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: 99, px: 1, py: 0.2,
                    display: 'flex', alignItems: 'center', gap: 0.4,
                  }}>
                    <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 12 }} />
                    <Typography sx={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: 700 }}>Approved</Typography>
                  </Box>
                </Box>

                {/* Card body */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, gap: 1.5 }}>
                  {/* Filename */}
                  <Tooltip title={item.fileName} placement="top" arrow>
                    <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ color: '#f1f5f9', fontSize: '0.95rem' }}>
                      {item.fileName}
                    </Typography>
                  </Tooltip>

                  {/* Dataset */}
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <StorageIcon sx={{ color: '#60a5fa', fontSize: 14 }} />
                    <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 600 }} noWrap>
                      {firstDataset?.name || 'Unknown dataset'}
                    </Typography>
                  </Stack>

                  <Divider sx={{ borderColor: '#243041' }} />

                  {/* Meta stats */}
                  <Stack direction="row" spacing={2.5}>
                    <MetaStat
                      icon={<PersonIcon sx={{ color: '#6ee7b7', fontSize: 15 }} />}
                      value={`${item.annotators.length} annotator${item.annotators.length > 1 ? 's' : ''}`}
                      tooltip={item.annotators.join(', ')}
                    />
                    <MetaStat
                      icon={<LabelIcon sx={{ color: '#c4b5fd', fontSize: 15 }} />}
                      value={`${labelSet.length} label${labelSet.length !== 1 ? 's' : ''}`}
                      tooltip={labelSet.join(', ') || 'No labels'}
                    />
                  </Stack>

                  {/* Label chips */}
                  {labelSet.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                      {labelSet.slice(0, 4).map((label) => (
                        <Chip
                          key={label}
                          size="small"
                          label={label}
                          sx={{
                            bgcolor: getLabelColor(label),
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            height: 22,
                          }}
                        />
                      ))}
                      {labelSet.length > 4 && (
                        <Chip
                          size="small"
                          label={`+${labelSet.length - 4}`}
                          sx={{ bgcolor: '#2d3748', color: '#94a3b8', height: 22, fontSize: '0.68rem' }}
                        />
                      )}
                    </Box>
                  )}

                  {/* Action */}
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ ...primaryBtnSx, mt: 'auto' }}
                    onClick={() => onViewDetail(item)}
                  >
                    View detail
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    )}
  </Stack>
);

export default ItemsTab;

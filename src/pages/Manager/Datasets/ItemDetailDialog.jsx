import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Stack, Switch, Typography,
} from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import ImageViewer from '../../../components/ImageViewer';
import { getLabelColor } from '../Projects/ProjectDetail/utils';
import { TEXT, MUTED } from './constants';

const ItemDetailDialog = ({ open, onClose, item }) => {
  const [showLabels, setShowLabels] = useState(true);
  const [visibleMap, setVisibleMap] = useState({});

  const annotatorLabels = item?.annotatorLabels || [];

  useEffect(() => {
    const init = {};
    annotatorLabels.forEach(a => { init[a.name] = true; });
    setVisibleMap(init);
  }, [item]);

  const visibleAnnotations = annotatorLabels.flatMap(ann => {
    if (!showLabels || !visibleMap[ann.name]) return [];
    return (ann.annotations || []).filter(x => x?.bbox);
  });

  const formattedAnnotations = visibleAnnotations.map(ann => {
    let bbox = Array.isArray(ann.bbox) ? ann.bbox : [0, 0, 0, 0];
    if (bbox.length === 4 && bbox.every(v => v <= 1 && v >= 0)) bbox = bbox.map(v => v * 100);
    return { label: ann.label, bbox };
  });

  const uniqueLabels      = [...new Set(formattedAnnotations.map(a => a.label))];
  const labelSetForViewer = uniqueLabels.map(lbl => ({ name: lbl, color: getLabelColor(lbl) }));

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { bgcolor: '#111827', border: '1px solid #243041', borderRadius: 3, color: TEXT } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #243041', fontWeight: 800, fontSize: 16 }}>
        Approved item detail
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Box sx={{ position: 'relative', width: '100%', minHeight: 420, borderRadius: 3, overflow: 'hidden', bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageViewer imageUrl={item.fileUrl} annotations={formattedAnnotations} labelSet={labelSetForViewer} />
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>File</Typography>
                <Typography fontWeight={700}>{item.fileName || item.originalName || item.filename || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Item ID</Typography>
                <Typography sx={{ fontSize: 12, wordBreak: 'break-all' }}>{item.itemId || item._id || item.id || '—'}</Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Approved annotators</Typography>
                  <FormControlLabel
                    control={<Switch checked={showLabels} onChange={e => setShowLabels(e.target.checked)} size="small" />}
                    label="Show labels"
                    sx={{ color: '#94a3b8', mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                  />
                </Box>
                <Stack spacing={1.2}>
                  {annotatorLabels.length === 0 ? (
                    <Typography sx={{ color: MUTED, fontSize: 13 }}>Không có annotation được duyệt</Typography>
                  ) : annotatorLabels.map((ann, idx) => (
                    <Box key={`${ann.name}-${idx}`} sx={{ p: 1.2, borderRadius: 2, bgcolor: '#1f2937', border: '1px solid #334155' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={ann.isPrimary ? `${ann.name} • PRIMARY` : ann.name}
                          sx={{
                            bgcolor: ann.isPrimary ? 'rgba(245,158,11,0.22)' : 'rgba(34,197,94,0.18)',
                            color:   ann.isPrimary ? '#fbbf24' : '#22c55e',
                            fontWeight: 700, fontSize: 12,
                          }}
                        />
                        {showLabels && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={visibleMap[ann.name] ?? true}
                                onChange={e => setVisibleMap(prev => ({ ...prev, [ann.name]: e.target.checked }))}
                                size="small"
                              />
                            }
                            label="Visible"
                            sx={{ color: '#94a3b8', mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', mt: 1 }}>
                        {(ann.labels || []).length === 0 ? (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>No label</Typography>
                        ) : ann.labels.map((label, li) => (
                          <Chip key={li} label={label} size="small"
                            sx={{ bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700 }} />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #243041', px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: '#94a3b8', borderColor: '#334155', textTransform: 'none', '&:hover': { borderColor: '#64748b' } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemDetailDialog;

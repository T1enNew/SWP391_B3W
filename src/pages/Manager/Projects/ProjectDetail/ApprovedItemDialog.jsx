import React from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, Paper, Stack, Switch, Typography,
} from '@mui/material';
import ImageViewer from '../../../../components/ImageViewer';
import AudioAnnotator from '../../../../components/AudioAnnotator';
import { modalPaperSx, secondaryBtnSx, softCardSx } from './constants';
import { getLabelColor } from './utils';

const renderImageOverlay = (item, showAnnotatorLabels, showAnnotatorLabelMap) => {
  const visibleAnnotations = (item?.annotatorLabels || []).flatMap((ann) => {
    const enabled = showAnnotatorLabels ? showAnnotatorLabelMap[ann.name] ?? true : false;
    if (!enabled) return [];
    return (ann.annotations || []).filter((x) => x?.bbox);
  });

  const formattedAnnotations = visibleAnnotations.map((ann) => {
    let bbox = Array.isArray(ann.bbox) ? ann.bbox : [0, 0, 0, 0];
    // If all values are <= 1, they might be in 0-1 range (legacy), convert to percentages
    if (bbox.length === 4 && bbox.every(val => val <= 1 && val >= 0)) {
      bbox = bbox.map(v => v * 100);
    }
    return { label: ann.label, bbox };
  });

  const uniqueLabels = Array.from(new Set(formattedAnnotations.map((a) => a.label)));
  const labelSetForViewer = uniqueLabels.map((lbl) => ({ name: lbl, color: getLabelColor(lbl) }));

  return (
    <Box sx={{ position: 'relative', width: '100%', minHeight: 420, borderRadius: 3, overflow: 'hidden', bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ImageViewer imageUrl={item.fileUrl} annotations={formattedAnnotations} labelSet={labelSetForViewer} />
    </Box>
  );
};

const ApprovedItemDialog = ({
  open, onClose, selectedItem, datasets,
  showAnnotatorLabels, setShowAnnotatorLabels,
  showAnnotatorLabelMap, setShowAnnotatorLabelMap,
  textContentMap, textContentLoadingMap,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: modalPaperSx }}>
    <DialogTitle sx={{ borderBottom: '1px solid #243041', fontWeight: 800 }}>Approved item detail</DialogTitle>
    <DialogContent sx={{ pt: 3 }}>
      {!selectedItem ? null : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            {selectedItem.mediaType === 'image' ? (
              renderImageOverlay(selectedItem, showAnnotatorLabels, showAnnotatorLabelMap)
            ) : selectedItem.mediaType === 'audio' ? (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0b1220', minHeight: 420 }}>
                <AudioAnnotator
                  audioUrl={selectedItem.fileUrl}
                  labelSet={[]}
                  initialSegments={(selectedItem.annotatorLabels || []).flatMap((ann) => {
                    const enabled = showAnnotatorLabels ? showAnnotatorLabelMap[ann.name] ?? true : false;
                    if (!enabled) return [];
                    return (ann.annotations || [])
                      .filter((seg) => seg?.start !== undefined && seg?.end !== undefined)
                      .map((seg) => ({
                        id: `${ann.name}-${seg.start}-${seg.end}`,
                        start: Number(seg.start || 0),
                        end: Number(seg.end || 0),
                        label: seg.label || 'unknown',
                      }));
                  })}
                  readOnly
                  showLabelLegend={showAnnotatorLabels}
                />
                <Box component="audio" controls src={selectedItem.fileUrl} sx={{ width: '100%', mt: 2 }} />
              </Box>
            ) : selectedItem.mediaType === 'text' ? (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0b1220', minHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {textContentLoadingMap[selectedItem.key]
                  ? 'Đang tải nội dung text...'
                  : textContentMap[selectedItem.key] || 'Không có nội dung text.'}
              </Box>
            ) : (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0b1220', minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                No preview
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>File</Typography>
                <Typography fontWeight={700}>{selectedItem.fileName}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Item ID</Typography>
                <Typography>{selectedItem.itemId || selectedItem.key}</Typography>
              </Box>
              {selectedItem.datasetId ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Dataset</Typography>
                  <Typography>
                    {datasets.find((d) => String(d.id) === String(selectedItem.datasetId))?.name || selectedItem.datasetId}
                  </Typography>
                </Box>
              ) : null}

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Approved annotators</Typography>
                  <FormControlLabel
                    control={<Switch checked={showAnnotatorLabels} onChange={(e) => setShowAnnotatorLabels(e.target.checked)} size="small" />}
                    label="Show labels"
                    sx={{ color: '#94a3b8', mr: 0 }}
                  />
                </Box>
                <Stack spacing={1.2}>
                  {(selectedItem.annotatorLabels || []).map((ann, idx) => (
                    <Paper key={`${ann.name}-${idx}`} sx={{ ...softCardSx, p: 1.2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={ann.isPrimary ? `${ann.name} • PRIMARY` : ann.name}
                          sx={{
                            bgcolor: ann.isPrimary ? 'rgba(245,158,11,0.22)' : 'rgba(34,197,94,0.18)',
                            color: ann.isPrimary ? '#fbbf24' : '#22c55e',
                            fontWeight: 700,
                          }}
                        />
                        {showAnnotatorLabels ? (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={showAnnotatorLabelMap[ann.name] ?? true}
                                onChange={(e) => setShowAnnotatorLabelMap((prev) => ({ ...prev, [ann.name]: e.target.checked }))}
                                size="small"
                              />
                            }
                            label="Visible"
                            sx={{ color: '#94a3b8', mr: 0 }}
                          />
                        ) : null}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', mt: 1 }}>
                        {(ann.labels || []).length === 0 ? (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>No label</Typography>
                        ) : (
                          ann.labels.map((label, labelIdx) => (
                            <Chip
                              key={`${ann.name}-${labelIdx}`}
                              label={label}
                              size="small"
                              sx={{ bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700 }}
                            />
                          ))
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      )}
    </DialogContent>
    <DialogActions>
      <Button sx={secondaryBtnSx} onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default ApprovedItemDialog;

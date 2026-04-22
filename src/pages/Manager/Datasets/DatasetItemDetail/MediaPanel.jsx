import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import ImageViewer from '../../../../components/ImageViewer';
import AudioAnnotator from '../../../../components/AudioAnnotator';
import { getAnnotatorColor, getLabelColor, toRgba } from './utils';

const MediaPanel = ({
  item, dataType, imageUrl, visibleMergedObjects, labelSet,
  normalizedAnnotations, primaryAnnotations, visibleAnnotators, setVisibleAnnotators,
  audioPlayerRef,
}) => (
  <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#e2e8f0' }}>
        {dataType === 'audio' ? 'Audio + Nhãn' : dataType === 'text' ? 'Text + Nhãn' : 'Ảnh gốc + Nhãn'}
      </Typography>
      {normalizedAnnotations.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
          {normalizedAnnotations.map((ann) => {
            const isPrimary  = primaryAnnotations.some((a) => (a.annotator || a.annotatorId?.fullName || a.annotatorId?.username) === ann.name);
            const annColor   = getAnnotatorColor(ann.name);
            const isVisible  = visibleAnnotators[ann.id] === true;
            return (
              <Chip
                key={ann.id}
                label={`${isVisible ? 'ON' : 'OFF'} • ${isPrimary ? `★ ${ann.name}` : ann.name}`}
                size="small"
                onClick={() => setVisibleAnnotators((prev) => ({ ...prev, [ann.id]: !isVisible }))}
                sx={{
                  bgcolor: isVisible ? `${annColor}30` : 'rgba(71,85,105,0.3)',
                  color:   isVisible ? annColor         : '#94a3b8',
                  fontWeight: 700,
                  border: isPrimary ? `2px solid ${annColor}` : `1px solid ${isVisible ? `${annColor}80` : '#64748b'}`,
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </Stack>
      )}
    </Stack>

    <Box sx={{ width: '100%', minHeight: 320, borderRadius: 2, bgcolor: '#0b1220', border: '1px solid #1f2937', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {dataType === 'audio' ? (
        imageUrl ? (
          <Box sx={{ p: 2, width: '100%' }}>
            <Typography sx={{ color: '#94a3b8', mb: 1.5, textAlign: 'center', fontWeight: 600 }}>Waveform + Segments</Typography>
            <Box sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 2 }}>
              <AudioAnnotator
                audioUrl={imageUrl}
                labelSet={labelSet}
                initialSegments={visibleMergedObjects.map((seg) => ({
                  id: seg.id,
                  start: Number(seg.start || 0),
                  end: Number(seg.end || 0),
                  label: seg.label,
                  color: getLabelColor(labelSet, seg.label, '#3b82f6'),
                  annotator: seg.sourceAnnotator,
                }))}
                readOnly
              />
              {(!imageUrl || !/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(imageUrl)) && (
                <Typography sx={{ color: '#64748b', mt: 1, fontSize: '0.8rem' }}>
                  URL audio có thể chưa đúng định dạng. Link hiện tại: {imageUrl || 'N/A'}
                </Typography>
              )}
            </Box>
            <audio ref={audioPlayerRef} src={imageUrl} preload="metadata" style={{ display: 'none' }} />
            <Typography sx={{ color: '#64748b', mt: 2, fontSize: '0.875rem', textAlign: 'center' }}>
              {item?.dataItem?.filename || item?.filename || 'Unknown audio file'}
            </Typography>

            {visibleMergedObjects.length > 0 && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography sx={{ color: '#94a3b8', mb: 1, fontWeight: 600 }}>Segments theo annotator:</Typography>
                <Stack spacing={1}>
                  {visibleMergedObjects.map((seg) => {
                    const annColor = getAnnotatorColor(seg.sourceAnnotator);
                    const lblColor = getLabelColor(labelSet, seg.label, '#3b82f6');
                    return (
                      <Box key={seg.id} sx={{ p: 1.2, border: '1px solid #334155', borderRadius: 1, bgcolor: '#0f172a' }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: lblColor }} />
                            <Typography sx={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                              [{Number(seg.start || 0).toFixed(1)}s - {Number(seg.end || 0).toFixed(1)}s] {seg.label}
                            </Typography>
                            <Chip
                              size="small"
                              label={seg.sourceAnnotator}
                              sx={{ height: 22, bgcolor: `${annColor}30`, color: annColor, border: `1px solid ${annColor}80`, fontWeight: 700 }}
                            />
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: `${lblColor}88`, color: lblColor, minWidth: 76, textTransform: 'none', fontWeight: 700 }}
                            onClick={() => {
                              const audioEl = audioPlayerRef.current;
                              if (!audioEl) return;
                              const start = Number(seg.start || 0);
                              const end   = Number(seg.end   || 0);
                              audioEl.currentTime = start;
                              audioEl.play();
                              const onTimeUpdate = () => {
                                if (audioEl.currentTime >= end) {
                                  audioEl.pause();
                                  audioEl.removeEventListener('timeupdate', onTimeUpdate);
                                }
                              };
                              audioEl.addEventListener('timeupdate', onTimeUpdate);
                            }}
                          >
                            ▶ Play đoạn
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ color: '#94a3b8' }}>Không có audio để hiển thị.</Typography>
        )
      ) : dataType === 'text' ? (
        <Box sx={{ p: 3, width: '100%', maxHeight: '70vh', overflow: 'auto' }}>
          <Typography sx={{ color: '#94a3b8', mb: 2, fontWeight: 600 }}>Text Content:</Typography>
          {(() => {
            const rawText = item?.dataItem?.text || item?.text || item?.content || item?.preview || '';
            if (!rawText) {
              return (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>
                  Không có dữ liệu để hiển thị.
                </Box>
              );
            }

            const spans = visibleMergedObjects
              .filter((s) => Number.isFinite(Number(s.start)) && Number.isFinite(Number(s.end)))
              .map((s) => {
                const start = Math.max(0, Math.min(rawText.length, Number(s.start) || 0));
                const end   = Math.max(start, Math.min(rawText.length, Number(s.end) || 0));
                return { ...s, start, end };
              })
              .filter((s) => s.end > s.start)
              // dedupe span trùng hệt nhau giữa các annotator để tránh text bị render đè/lặp
              .reduce((acc, cur) => {
                const key = `${cur.start}-${cur.end}-${cur.label}`;
                if (!acc.some((x) => `${x.start}-${x.end}-${x.label}` === key)) acc.push(cur);
                return acc;
              }, [])
              .sort((a, b) => (a.start - b.start) || (b.end - a.end));

            if (!spans.length) {
              return (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#0f172a', border: '1px solid #334155', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem', color: '#e2e8f0' }}>
                  {rawText}
                </Box>
              );
            }

            const boundaries = new Set([0, rawText.length]);
            spans.forEach((s) => { boundaries.add(s.start); boundaries.add(s.end); });
            const points = Array.from(boundaries).sort((a, b) => a - b);

            const chunks = [];
            for (let i = 0; i < points.length - 1; i += 1) {
              const start = points[i];
              const end   = points[i + 1];
              if (end <= start) continue;
              const active = spans.filter((s) => s.start <= start && s.end >= end);
              chunks.push({ key: `c-${i}-${start}-${end}`, text: rawText.slice(start, end), active });
            }

            return (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#0f172a', border: '1px solid #334155', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.8 }}>
                {chunks.map((chunk) => {
                  if (!chunk.active.length) return <span key={chunk.key}>{chunk.text}</span>;
                  const top = chunk.active[0];
                  const labelColor     = getLabelColor(labelSet, top.label, '#3b82f6');
                  const annotatorColor = getAnnotatorColor(top.sourceAnnotator);
                  return (
                    <mark
                      key={chunk.key}
                      title={`${top.label} • ${top.sourceAnnotator}`}
                      style={{
                        backgroundColor: toRgba(labelColor, 0.25),
                        color: '#e2e8f0',
                        borderBottom: `1px solid ${labelColor}`,
                        padding: '0 2px',
                        borderRadius: '2px',
                      }}
                    >
                      {chunk.text}
                      <span style={{ marginLeft: 4, padding: '0 4px', borderRadius: 4, fontSize: '0.72em', fontWeight: 700, backgroundColor: toRgba(annotatorColor, 0.22), color: annotatorColor, border: `1px solid ${toRgba(annotatorColor, 0.5)}`, whiteSpace: 'nowrap' }}>
                        [{top.label} • {top.sourceAnnotator}]
                      </span>
                    </mark>
                  );
                })}
              </Box>
            );
          })()}
        </Box>
      ) : imageUrl ? (
        <ImageViewer
          imageUrl={imageUrl}
          annotations={visibleMergedObjects.map((obj) => ({
            bbox: obj.bbox,
            label: obj.isPrimary ? `${obj.label} • PRIMARY` : obj.label,
          }))}
          labelSet={labelSet}
          readOnly
          maxHeight="70vh"
        />
      ) : (
        <Typography sx={{ color: '#94a3b8' }}>Không có dữ liệu để hiển thị.</Typography>
      )}
    </Box>
  </Box>
);

export default MediaPanel;

import React from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { getLabelColor, toRgba } from './utils';

const AnnotationSidebar = ({ item, mergedObjects, uniqueLabels, baseLabels, labelSet, reviewerDisplayName }) => (
  <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid #334155', height: 'fit-content' }}>
    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#e2e8f0', mb: 2 }}>
      Thông tin nhãn
    </Typography>
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>File</Typography>
        <Typography sx={{ color: '#e2e8f0' }}>{item?.dataItem?.filename || item?.filename || 'N/A'}</Typography>
      </Box>
      <Divider sx={{ borderColor: '#334155' }} />
      <Box>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Số object</Typography>
        <Typography sx={{ color: '#e2e8f0' }}>{mergedObjects.length}</Typography>
      </Box>
      <Divider sx={{ borderColor: '#334155' }} />
      <Box>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Danh sách nhãn</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {uniqueLabels.length === 0 ? (
            <Typography sx={{ color: '#94a3b8' }}>Không có nhãn.</Typography>
          ) : (
            uniqueLabels.map((label, idx) => {
              const c = getLabelColor(labelSet, label, '#3b82f6');
              return (
                <Chip
                  key={`${label}-${idx}`}
                  label={label}
                  size="small"
                  sx={{ bgcolor: toRgba(c, 0.2), color: c, border: `1px solid ${toRgba(c, 0.45)}`, fontWeight: 700 }}
                />
              );
            })
          )}
        </Stack>
      </Box>
      <Divider sx={{ borderColor: '#334155' }} />
      <Box>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Nhãn gốc</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {baseLabels.length === 0 ? (
            <Typography sx={{ color: '#94a3b8' }}>Không có nhãn.</Typography>
          ) : (
            baseLabels.map((label, idx) => {
              const c = getLabelColor(labelSet, label, '#22c55e');
              return (
                <Chip
                  key={`base-${label}-${idx}`}
                  label={label}
                  size="small"
                  sx={{ bgcolor: toRgba(c, 0.2), color: c, border: `1px solid ${toRgba(c, 0.45)}`, fontWeight: 700 }}
                />
              );
            })
          )}
        </Stack>
      </Box>

      {/* Review Results Section */}
      {item?.status === 'approved' || item?.status === 'rejected' ? (
        <>
          <Divider sx={{ borderColor: '#334155', my: 2 }} />
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, display: 'block' }}>Kết quả Review</Typography>
            <Chip
              label={item.status === 'approved' ? '✓ Đã phê duyệt' : '✕ Đã từ chối'}
              size="small"
              sx={{
                bgcolor: item.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color:   item.status === 'approved' ? '#22c55e'               : '#ef4444',
                fontWeight: 700,
                mb: 2,
              }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>Reviewer:</Typography>
              <Typography sx={{ color: '#e2e8f0', fontSize: '0.875rem' }}>{reviewerDisplayName}</Typography>
            </Box>
            {item.reviewedAt && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Ngày review:</Typography>
                <Typography sx={{ color: '#e2e8f0', fontSize: '0.875rem' }}>
                  {new Date(item.reviewedAt).toLocaleString('vi-VN')}
                </Typography>
              </Box>
            )}
          </Box>
        </>
      ) : item?.status === 'submitted' ? (
        <>
          <Divider sx={{ borderColor: '#334155', my: 2 }} />
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, display: 'block' }}>Trạng thái</Typography>
            <Chip label="Chờ review" size="small" sx={{ bgcolor: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontWeight: 700 }} />
          </Box>
        </>
      ) : null}
    </Stack>
  </Box>
);

export default AnnotationSidebar;

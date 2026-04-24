import React, { useMemo, useState } from 'react';
import {
  Box, Button, Card, Chip, CircularProgress, Divider, Grid,
  InputAdornment, Pagination, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
  Label as LabelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { cardSx, panelSx, primaryBtnSx, secondaryBtnSx, typePalette } from './constants';
import { getLabelColor, formatDateTime } from './utils';

const PAGE_SIZE = 12;

const searchSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: '10px',
    '& fieldset': { borderColor: '#334155' },
    '&:hover fieldset': { borderColor: '#475569' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
  },
};

const MetaStat = ({ icon, value, tooltip }) => (
  <Tooltip title={tooltip} arrow placement="top">
    <Stack direction="row" spacing={0.5} alignItems="center">
      {icon}
      <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>{value}</Typography>
    </Stack>
  </Tooltip>
);

const ItemsTab = ({ approvedItems, datasets, onViewDetail }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('all');
  const [page, setPage] = useState(1);

  // Collect all unique labels + count per label
  const labelStats = useMemo(() => {
    const map = new Map();
    approvedItems.forEach((item) => {
      const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
      labelSet.forEach((label) => map.set(label, (map.get(label) || 0) + 1));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [approvedItems]);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return approvedItems.filter((item) => {
      const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
      const okSearch = !q || item.fileName.toLowerCase().includes(q);
      const okLabel = selectedLabel === 'all' || labelSet.includes(selectedLabel);
      return okSearch && okLabel;
    });
  }, [approvedItems, searchText, selectedLabel]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pagedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter = searchText.trim() !== '' || selectedLabel !== 'all';

  const handleSearch = (e) => { setSearchText(e.target.value); setPage(1); };
  const handleLabelClick = (label) => { setSelectedLabel(prev => prev === label ? 'all' : label); setPage(1); };
  const clearFilters = () => { setSearchText(''); setSelectedLabel('all'); setPage(1); };


  return (
    <Stack spacing={2.5}>
      {/* ── Header ── */}
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
        <Stack spacing={2}>
          {/* ── Label classification bar ── */}
          {labelStats.length > 0 && (
            <Paper sx={{ ...panelSx, p: 2 }}>
              <Stack spacing={1.2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LabelIcon sx={{ color: '#64748b', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Phân loại theo nhãn
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475569', ml: 'auto' }}>
                    {labelStats.length} nhãn · {approvedItems.length} items
                  </Typography>
                </Stack>

                {/* Label chips with count */}
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Tất cả (${approvedItems.length})`}
                    size="small"
                    onClick={() => handleLabelClick('all')}
                    sx={{
                      bgcolor: selectedLabel === 'all' ? '#2563eb' : 'rgba(59,130,246,0.1)',
                      color: selectedLabel === 'all' ? '#fff' : '#60a5fa',
                      border: `1px solid ${selectedLabel === 'all' ? '#2563eb' : 'rgba(59,130,246,0.3)'}`,
                      fontWeight: 700, cursor: 'pointer',
                      '&:hover': { opacity: 0.85 },
                    }}
                  />
                  {labelStats.map(({ label, count }) => {
                    const color = getLabelColor(label);
                    const isActive = selectedLabel === label;
                    return (
                      <Chip
                        key={label}
                        size="small"
                        label={`${label} (${count})`}
                        onClick={() => handleLabelClick(label)}
                        sx={{
                          bgcolor: isActive ? color : `${color}22`,
                          color: isActive ? '#fff' : color,
                          border: `1px solid ${color}55`,
                          fontWeight: 700, cursor: 'pointer',
                          '&:hover': { opacity: 0.85 },
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Label distribution mini bar */}
                <Box sx={{ display: 'flex', gap: 0.3, height: 6, borderRadius: 99, overflow: 'hidden' }}>
                  {labelStats.map(({ label, count }) => (
                    <Tooltip key={label} title={`${label}: ${count} items`} arrow>
                      <Box
                        onClick={() => handleLabelClick(label)}
                        sx={{
                          flex: count, bgcolor: getLabelColor(label),
                          opacity: selectedLabel === 'all' || selectedLabel === label ? 1 : 0.3,
                          cursor: 'pointer', transition: 'opacity 0.2s',
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Stack>
            </Paper>
          )}

          {/* ── Search + results count ── */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              placeholder="Tìm theo tên file…"
              value={searchText}
              onChange={handleSearch}
              sx={{ ...searchSx, flex: 1, maxWidth: 340 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b', fontSize: 18 }} /></InputAdornment>,
              }}
            />
            <Typography variant="caption" sx={{ color: '#475569', flexShrink: 0 }}>
              {hasFilter
                ? `${filteredItems.length} / ${approvedItems.length} items`
                : `${approvedItems.length} items`}
            </Typography>
            {hasFilter && (
              <Button size="small" onClick={clearFilters}
                sx={{ ...secondaryBtnSx, py: 0.3, px: 1.2, fontSize: '0.72rem', flexShrink: 0 }}>
                Xoá bộ lọc
              </Button>
            )}
          </Stack>

          {/* ── Grid or empty filter state ── */}
          {pagedItems.length === 0 ? (
            <Paper sx={{ ...panelSx, p: 5, textAlign: 'center' }}>
              <FilterListIcon sx={{ fontSize: 44, color: '#334155', mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#94a3b8' }}>Không có item nào khớp</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.8, mb: 2 }}>
                Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.
              </Typography>
              <Button variant="outlined" onClick={clearFilters}
                sx={{ borderColor: '#334155', color: '#94a3b8', borderRadius: 2, textTransform: 'none' }}>
                Xoá bộ lọc
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {pagedItems.map((item) => {
                const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
                const firstDataset = datasets.find((ds) => String(ds.id) === String(item.datasetId));
                const palette = typePalette[item.mediaType] || typePalette.other;
                const Icon = palette.icon;
                return (
                  <Grid item xs={12} sm={6} lg={4} key={item.key}>
                    <Card sx={{
                      ...cardSx, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 20px 45px rgba(0,0,0,0.4)', borderColor: '#475569' },
                    }}>
                      {/* Preview */}
                      <Box sx={{ position: 'relative', height: 190, bgcolor: '#0b1220', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
                        <Chip
                          icon={<Icon sx={{ color: `${palette.color} !important`, fontSize: '13px !important' }} />}
                          label={item.mediaType.toUpperCase()} size="small"
                          sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(6px)', color: palette.color, border: `1px solid ${palette.color}40`, fontWeight: 700, fontSize: '0.68rem' }}
                        />
                        <Box sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)', backdropFilter: 'blur(6px)', borderRadius: 99, px: 1, py: 0.2, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 12 }} />
                          <Typography sx={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: 700 }}>Approved</Typography>
                        </Box>
                      </Box>

                      {/* Body */}
                      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, gap: 1.2 }}>
                        <Tooltip title={item.fileName} placement="top" arrow>
                          <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ color: '#f1f5f9', fontSize: '0.95rem' }}>
                            {item.fileName}
                          </Typography>
                        </Tooltip>

                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <StorageIcon sx={{ color: '#60a5fa', fontSize: 14 }} />
                          <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 600 }} noWrap>
                            {firstDataset?.name || 'Unknown dataset'}
                          </Typography>
                        </Stack>

                        <Divider sx={{ borderColor: '#243041' }} />

                        <Stack direction="row" spacing={2.5}>
                          <MetaStat icon={<PersonIcon sx={{ color: '#6ee7b7', fontSize: 15 }} />} value={`${item.annotators.length} annotator${item.annotators.length > 1 ? 's' : ''}`} tooltip={item.annotators.join(', ')} />
                          <MetaStat icon={<LabelIcon sx={{ color: '#c4b5fd', fontSize: 15 }} />} value={`${labelSet.length} label${labelSet.length !== 1 ? 's' : ''}`} tooltip={labelSet.join(', ') || 'No labels'} />
                        </Stack>

                        {item.approvedAt && (
                          <Stack direction="row" spacing={0.6} alignItems="center">
                            <ScheduleIcon sx={{ color: '#22c55e', fontSize: 13 }} />
                            <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 600, fontSize: '0.72rem' }}>
                              Approved: {formatDateTime(item.approvedAt)}
                            </Typography>
                          </Stack>
                        )}

                        {/* Label chips — clickable to filter */}
                        {labelSet.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                            {labelSet.slice(0, 4).map((label) => (
                              <Chip key={label} size="small" label={label}
                                onClick={() => handleLabelClick(label)}
                                sx={{
                                  bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700, fontSize: '0.68rem', height: 22,
                                  cursor: 'pointer', outline: selectedLabel === label ? '2px solid #fff' : 'none',
                                  '&:hover': { opacity: 0.85 },
                                }}
                              />
                            ))}
                            {labelSet.length > 4 && (
                              <Chip size="small" label={`+${labelSet.length - 4}`} sx={{ bgcolor: '#2d3748', color: '#94a3b8', height: 22, fontSize: '0.68rem' }} />
                            )}
                          </Box>
                        )}

                        {/* Actions */}
                        <Box sx={{ mt: 'auto' }}>
                          <Button fullWidth variant="contained" sx={primaryBtnSx} onClick={() => onViewDetail(item)}>
                            View detail
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Pagination
                count={totalPages} page={page}
                onChange={(_, v) => setPage(v)}
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#94a3b8', borderColor: '#334155', borderRadius: 2,
                    '&:hover': { bgcolor: '#1f2937' },
                    '&.Mui-selected': { bgcolor: '#2563eb', color: '#fff', borderColor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } },
                  },
                }}
              />
            </Box>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default ItemsTab;

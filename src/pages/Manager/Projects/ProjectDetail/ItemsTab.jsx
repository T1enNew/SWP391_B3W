import React, { useMemo, useState } from 'react';
import {
  Box, Button, Chip,
  InputAdornment, Pagination, Paper, Stack, TextField, Tooltip, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
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
import { panelSx, secondaryBtnSx, typePalette } from './constants';
import { getLabelColor, formatDateTime } from './utils';

const PAGE_SIZE = 10;

const searchSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: '10px',
    '& fieldset': { borderColor: '#334155' },
    '&:hover fieldset': { borderColor: '#475569' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
  },
};


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

          {/* ── Table or empty filter state ── */}
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
            <TableContainer component={Paper} sx={{ ...panelSx, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#0d1829', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid #1e2d47', py: 1.2 } }}>
                    <TableCell sx={{ width: 40 }}>#</TableCell>
                    <TableCell>File</TableCell>
                    <TableCell>Dataset</TableCell>
                    <TableCell>Nhãn</TableCell>
                    <TableCell sx={{ width: 120 }}>Annotators</TableCell>
                    <TableCell sx={{ width: 160 }}>Approved at</TableCell>
                    <TableCell sx={{ width: 110 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedItems.map((item, idx) => {
                    const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
                    const firstDataset = datasets.find((ds) => String(ds.id) === String(item.datasetId));
                    const palette = typePalette[item.mediaType] || typePalette.other;
                    const Icon = palette.icon;
                    return (
                      <TableRow
                        key={item.key}
                        sx={{
                          '& td': { borderBottom: '1px solid #1e2d47', py: 1.1, color: '#e2e8f0', fontSize: '0.82rem' },
                          '&:hover': { bgcolor: 'rgba(59,130,246,0.05)' },
                        }}
                      >
                        <TableCell sx={{ color: '#475569 !important', fontWeight: 600 }}>
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              icon={<Icon sx={{ color: `${palette.color} !important`, fontSize: '11px !important' }} />}
                              label={item.mediaType.toUpperCase()} size="small"
                              sx={{ bgcolor: `${palette.color}18`, color: palette.color, border: `1px solid ${palette.color}40`, fontWeight: 700, fontSize: '0.62rem', height: 20 }}
                            />
                            <Tooltip title={item.fileName} arrow placement="top">
                              <Typography noWrap sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.82rem', maxWidth: 200 }}>
                                {item.fileName}
                              </Typography>
                            </Tooltip>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <StorageIcon sx={{ color: '#60a5fa', fontSize: 13 }} />
                            <Typography noWrap sx={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.8rem', maxWidth: 150 }}>
                              {firstDataset?.name || '—'}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {labelSet.slice(0, 3).map((label) => (
                              <Chip key={label} size="small" label={label}
                                onClick={() => handleLabelClick(label)}
                                sx={{
                                  bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700,
                                  fontSize: '0.65rem', height: 20, cursor: 'pointer',
                                  outline: selectedLabel === label ? '2px solid #fff' : 'none',
                                  '&:hover': { opacity: 0.85 },
                                }}
                              />
                            ))}
                            {labelSet.length > 3 && (
                              <Tooltip title={labelSet.slice(3).join(', ')} arrow>
                                <Chip size="small" label={`+${labelSet.length - 3}`}
                                  sx={{ bgcolor: '#2d3748', color: '#94a3b8', height: 20, fontSize: '0.65rem' }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Tooltip title={item.annotators.join(', ') || '—'} arrow>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <PersonIcon sx={{ color: '#6ee7b7', fontSize: 14 }} />
                              <Typography sx={{ color: '#6ee7b7', fontWeight: 600, fontSize: '0.8rem' }}>
                                {item.annotators.length}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        </TableCell>

                        <TableCell>
                          {item.approvedAt ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ScheduleIcon sx={{ color: '#4ade80', fontSize: 13 }} />
                              <Typography sx={{ color: '#4ade80', fontSize: '0.78rem', fontWeight: 600 }}>
                                {formatDateTime(item.approvedAt)}
                              </Typography>
                            </Stack>
                          ) : <Typography sx={{ color: '#475569', fontSize: '0.78rem' }}>—</Typography>}
                        </TableCell>

                        <TableCell align="center">
                          <Button size="small" variant="outlined"
                            onClick={() => onViewDetail(item)}
                            sx={{ borderColor: '#334155', color: '#93c5fd', borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', py: 0.3, px: 1.2, '&:hover': { bgcolor: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6' } }}>
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
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

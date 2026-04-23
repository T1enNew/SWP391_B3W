import React from 'react';
import { Box, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { FolderOpen as FolderIcon, Search as SearchIcon } from '@mui/icons-material';
import { BORDER, MUTED, PANEL, PRIMARY } from './constants';
import { coerceId } from './utils';
import { inputSx } from './constants';
import DatasetCard from './DatasetCard';

const DatasetListPanel = ({
  loading, filtered, search, setSearch,
  selectedDs, isComplete, dsItems, dsStatusMap,
  onSelect, onOpenInfo, onOpenEdit, onDeleteTarget,
}) => (
  <Box sx={{ width: 340, minWidth: 280, borderRight: `1px solid ${BORDER}`, bgcolor: PANEL, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
    <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
      <TextField fullWidth size="small" placeholder="Tìm kiếm dataset..." value={search}
        onChange={e => setSearch(e.target.value)} sx={inputSx}
        InputProps={{ startAdornment: <SearchIcon sx={{ color: MUTED, mr: 1, fontSize: 20 }} /> }} />
    </Box>

    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
          <CircularProgress size={28} sx={{ color: PRIMARY }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: MUTED }}>
          <FolderIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography>Chưa có dataset nào</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {filtered.map(ds => {
            const isSelected   = coerceId(selectedDs) === coerceId(ds);
            const total        = ds.total_items || ds.totalItems || 0;
            const mapEntry     = dsStatusMap[String(coerceId(ds))];
            const dsComplete   = isSelected ? isComplete : (mapEntry?.isComplete ?? false);
            const dsInProgress = isSelected
              ? (!isComplete && dsItems.length > 0)
              : (!dsComplete && (mapEntry?.inProgress ?? (total > 0 && !mapEntry)));
            return (
              <DatasetCard
                key={coerceId(ds)}
                ds={ds}
                isSelected={isSelected}
                dsComplete={dsComplete}
                dsInProgress={dsInProgress}
                onSelect={onSelect}
                onOpenInfo={onOpenInfo}
                onOpenEdit={onOpenEdit}
                onDeleteTarget={onDeleteTarget}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  </Box>
);

export default DatasetListPanel;

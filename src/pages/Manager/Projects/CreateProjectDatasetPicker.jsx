import React, { useMemo, useState } from 'react';
import { Box, Chip, InputAdornment, TextField, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, FolderOpen as FolderIcon, Search as SearchIcon } from '@mui/icons-material';

const CARD = '#131f35', BORDER = '#1e2d47', PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';
const coerceId = o => o?._id || o?.id || '';

const CreateProjectDatasetPicker = ({ datasets, selected, onSelect }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? datasets.filter(ds => ds.name?.toLowerCase().includes(q) || (ds.description || '').toLowerCase().includes(q))
      : datasets;
  }, [datasets, search]);

  return (
    <Box>
      {datasets.length > 3 && (
        <TextField
          size="small"
          placeholder="Tìm dataset..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{
            mb: 1.5, width: '100%',
            '& .MuiOutlinedInput-root': {
              bgcolor: '#08121f', color: TEXT, borderRadius: 2, fontSize: 13,
              '& fieldset': { borderColor: BORDER },
              '&:hover fieldset': { borderColor: '#2d4060' },
              '&.Mui-focused fieldset': { borderColor: PRIMARY },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: MUTED, fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
        />
      )}

      <Box sx={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        {datasets.length === 0 && (
          <Typography sx={{ color: MUTED, fontSize: 13, py: 2, textAlign: 'center' }}>Chưa có dataset nào</Typography>
        )}
        {filtered.length === 0 && search && (
          <Typography sx={{ color: MUTED, fontSize: 13, py: 2, textAlign: 'center' }}>
            Không tìm thấy dataset khớp "{search}"
          </Typography>
        )}
        {filtered.map(ds => {
          const isSelected = selected === coerceId(ds);
          const total = ds.total_items || ds.totalItems || 0;
          return (
            <Box key={coerceId(ds)} onClick={() => onSelect(isSelected ? '' : coerceId(ds))} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer',
              bgcolor: isSelected ? 'rgba(59,130,246,0.12)' : CARD,
              border: `1px solid ${isSelected ? PRIMARY : BORDER}`,
              transition: 'all 0.15s', '&:hover': { borderColor: '#2d4060' },
            }}>
              <FolderIcon sx={{ color: isSelected ? PRIMARY : MUTED, fontSize: 22, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{ds.name}</Typography>
                {ds.description && <Typography sx={{ color: MUTED, fontSize: 12 }}>{ds.description}</Typography>}
              </Box>
              <Chip size="small" label={`${total} ảnh`}
                sx={{ bgcolor: 'rgba(59,130,246,0.14)', color: '#93c5fd', fontWeight: 700, fontSize: 11 }} />
              {isSelected && <CheckCircleIcon sx={{ color: PRIMARY, fontSize: 20, flexShrink: 0 }} />}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CreateProjectDatasetPicker;

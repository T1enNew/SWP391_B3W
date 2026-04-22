import React from 'react';
import { Chip } from '@mui/material';
import { typePalette } from './constants';

const DatasetChip = ({ dataset }) => {
  const palette = typePalette[dataset.type] || typePalette.other;
  return (
    <Chip
      label={`${dataset.name} • ${String(dataset.type || 'image').toUpperCase()}`}
      size="small"
      sx={{
        bgcolor: palette.bg,
        color: palette.color,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    />
  );
};

export default DatasetChip;

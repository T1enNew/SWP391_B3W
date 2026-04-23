import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

const BORDER = '#1e2d47', MUTED = '#64748b';

const CreateProjectLabelPicker = ({ labels, selected, onToggle }) => (
  <Box>
    {labels.length === 0 && (
      <Typography sx={{ color: MUTED, fontSize: 13, py: 2, textAlign: 'center' }}>
        Chưa có nhãn nào. Hãy tạo nhãn ở tab Labels trước.
      </Typography>
    )}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {labels.map(l => {
        const isSelected = selected.includes(l._labelsetId || l.id);
        return (
          <Chip key={l.id} label={l.name} onClick={() => onToggle(l._labelsetId || l.id)} sx={{
            bgcolor:  isSelected ? `${l.color}33` : 'rgba(255,255,255,0.05)',
            color:    isSelected ? l.color : MUTED,
            border:  `1px solid ${isSelected ? l.color : BORDER}`,
            fontWeight: isSelected ? 700 : 500,
            cursor: 'pointer', transition: 'all 0.15s',
            '&:hover': { bgcolor: `${l.color}22`, color: l.color },
          }} />
        );
      })}
    </Box>
    {selected.length > 0 && (
      <Typography sx={{ color: '#93c5fd', fontSize: 12, mt: 1 }}>✓ Đã chọn {selected.length} nhãn</Typography>
    )}
  </Box>
);

export default CreateProjectLabelPicker;

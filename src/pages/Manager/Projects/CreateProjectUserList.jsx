import React from 'react';
import { Box, Checkbox, Stack, TextField, Typography } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const CARD = '#131f35', BORDER = '#1e2d47', PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
};

const CreateProjectUserList = ({ users, selected, onToggle, search, onSearch, placeholder }) => (
  <Stack spacing={1.5}>
    <TextField size="small" placeholder={placeholder} value={search}
      onChange={e => onSearch(e.target.value)} sx={inputSx}
      InputProps={{ startAdornment: <SearchIcon sx={{ color: MUTED, mr: 1, fontSize: 18 }} /> }} />
    <Box sx={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
      {users.length === 0 && (
        <Typography sx={{ color: MUTED, fontSize: 13, py: 2, textAlign: 'center' }}>Không có người dùng</Typography>
      )}
      {users.map(u => {
        const checked = selected.includes(u.id);
        return (
          <Box key={u.id} onClick={() => onToggle(u.id)} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer',
            bgcolor: checked ? 'rgba(59,130,246,0.12)' : CARD,
            border: `1px solid ${checked ? PRIMARY : BORDER}`,
            transition: 'all 0.15s', '&:hover': { borderColor: '#2d4060' },
          }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '50%', bgcolor: checked ? PRIMARY : '#1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: 13, fontWeight: 700, color: checked ? '#fff' : MUTED,
            }}>
              {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{u.fullName}</Typography>
              <Typography sx={{ color: MUTED, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.email}
              </Typography>
            </Box>
            <Checkbox checked={checked} size="small"
              sx={{ color: MUTED, '&.Mui-checked': { color: PRIMARY }, p: 0 }} onChange={() => {}} />
          </Box>
        );
      })}
    </Box>
    {selected.length > 0 && (
      <Typography sx={{ color: '#93c5fd', fontSize: 12 }}>✓ Đã chọn {selected.length} người</Typography>
    )}
  </Stack>
);

export default CreateProjectUserList;

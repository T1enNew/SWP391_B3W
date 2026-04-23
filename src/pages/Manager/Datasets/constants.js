/* ─── THEME TOKENS ──────────────────────────────────────── */
export const BG      = '#080f1e';
export const PANEL   = '#0f1a2e';
export const CARD    = '#131f35';
export const BORDER  = '#1e2d47';
export const PRIMARY = '#3b82f6';
export const TEXT    = '#e2e8f0';
export const MUTED   = '#64748b';
export const SUCCESS = '#22c55e';
export const DANGER  = '#ef4444';
export const WARNING = '#f59e0b';

export const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f', color: TEXT, borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputBase-input': { color: TEXT },
};

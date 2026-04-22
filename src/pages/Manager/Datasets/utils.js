import { API_URL } from '../../../config/api';

/* ─── THEME TOKENS ─────────────────────────────────────── */
export const BG      = '#080f1e';
export const PANEL   = '#0f1a2e';
export const CARD    = '#131f35';
export const BORDER  = '#1e2d47';
export const PRIMARY = '#3b82f6';
export const TEXT    = '#e2e8f0';
export const MUTED   = '#64748b';
export const SUCCESS = '#22c55e';
export const DANGER  = '#ef4444';

/* ─── HELPERS ────────────────────────────────────────────── */
export const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const coerceId = (obj) => obj?._id || obj?.id || '';

export const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const buildImageUrl = (item) => {
  if (!item) return '';
  const base = API_URL.replace(/\/+$/, '');
  const direct = item.signed_url || item.signedUrl || item.storage_url || item.storageUrl || item.url || item.imageUrl || '';
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  const filename = item.originalName || item.original_name || item.filename || '';
  const rawPath = (item.path || item.storagePath || item.storage_path || direct || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (rawPath) {
    const idx = rawPath.indexOf('uploads/');
    const rel = idx !== -1 ? rawPath.substring(idx) : rawPath;
    const last = rel.split('/').pop();
    if (/\.\w{1,10}$/i.test(last)) return `${base}/${rel.startsWith('uploads/') ? rel : `uploads/datasets/${rel}`}`;
  }
  return filename ? `${base}/uploads/datasets/${filename}` : '';
};

export const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#08121f',
    color: TEXT,
    borderRadius: '10px',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#2d4060' },
    '&.Mui-focused fieldset': { borderColor: PRIMARY },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputBase-input': { color: TEXT },
};

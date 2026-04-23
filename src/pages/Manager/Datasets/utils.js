import { API_URL } from '../../../config/api';

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

export const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const buildImageUrl = (item) => {
  if (!item) return '';
  const base = API_URL.replace(/\/+$/, '');
  const direct = item.signed_url || item.signedUrl || item.storage_url || item.storageUrl || item.url || item.imageUrl || '';
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  const rawPath = (item.path || item.storagePath || item.storage_path || direct || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (rawPath) {
    const idx = rawPath.indexOf('uploads/');
    const rel = idx !== -1 ? rawPath.substring(idx) : rawPath;
    const last = rel.split('/').pop();
    if (/\.\w{1,10}$/i.test(last)) return `${base}/${rel.startsWith('uploads/') ? rel : `uploads/datasets/${rel}`}`;
  }
  const filename = item.originalName || item.original_name || item.filename || '';
  return filename ? `${base}/uploads/datasets/${filename}` : '';
};

export const ANNOTATOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export const getAnnotatorColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ANNOTATOR_COLORS[Math.abs(hash) % ANNOTATOR_COLORS.length];
};

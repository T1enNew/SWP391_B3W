import { API_URL } from '../config/api';
import { ANNOTATOR_COLORS, ITEM_STATUS_ORDER } from '../constants/reviewer';

// Lấy JWT token từ sessionStorage (ưu tiên) hoặc localStorage
export const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token');

// Chuyển chuỗi bất kỳ (thường là annotator ID) thành màu hex nhất quán từ bảng ANNOTATOR_COLORS
export const stringToColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return ANNOTATOR_COLORS[Math.abs(hash) % ANNOTATOR_COLORS.length];
};

// Ánh xạ trạng thái task sang trạng thái submission cho reviewer: approved/rejected/pending
export const getAnnotatorStatus = (task) => {
  if (task.status === 'approved') return 'approved';
  if (task.status === 'rejected' || task.status === 'waiting_rework') return 'rejected';
  return 'pending';
};

// Tính lại trạng thái tổng của một item dựa vào các submissions con (mutates item.status)
export const updateItemStatus = (item) => {
  const subs = item.submissions || [];
  const approved = subs.filter(s => s.status === 'approved').length;
  const rejected = subs.filter(s => s.status === 'rejected').length;
  const pending  = subs.filter(s => s.status === 'pending').length;
  const reviewed = approved + rejected;
  if (reviewed === 0) {
    item.status = 'pending_review';
  } else if (reviewed === subs.length) {
    item.status = (rejected > 0 && pending === 0) ? 'waiting_rework' : 'fully_reviewed';
  } else {
    item.status = 'partially_reviewed';
  }
};

// Sắp xếp items theo thứ tự ưu tiên: pending → partially → waiting_rework → reviewed → finalized
export const sortByStatus = (items) =>
  [...items].sort((a, b) => (ITEM_STATUS_ORDER[a.status] ?? 5) - (ITEM_STATUS_ORDER[b.status] ?? 5));

// Xác định loại file của task dựa vào mimeType hoặc tên file: 'image' | 'audio' | 'text' | 'other'
export const getTaskKind = (t) => {
  const di = t?.dataItem || t?.data_item || {};
  const mt = (di.mimeType || di.mime_type || '').toLowerCase();
  const fn = (di.filename || di.original_name || di.originalName || di.path || '').toLowerCase();
  if (mt.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fn)) return 'image';
  if (mt.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fn)) return 'audio';
  if (mt.startsWith('text/')  || /\.(txt|csv|json|xml)$/i.test(fn))   return 'text';
  return 'other';
};

// Resolves the best available URL for a data item.
// Priority: signedUrl -> storageUrl -> url -> path-based fallback
export const buildFileUrl = (dataItem) => {
  if (!dataItem) return '';
  const baseUrl = API_URL.replace(/\/+$/, '');

  const directUrl =
    dataItem?.signedUrl   ||
    dataItem?.signed_url  ||
    dataItem?.storageUrl  ||
    dataItem?.storage_url ||
    dataItem?.url         ||
    dataItem?.imageUrl    ||
    '';
  if (directUrl && /^https?:\/\//i.test(directUrl)) return directUrl;

  const filename = dataItem?.originalName || dataItem?.original_name || dataItem?.filename || '';
  const rawPath = (
    dataItem?.path || dataItem?.storagePath || dataItem?.storage_path || directUrl || ''
  ).replace(/\\/g, '/').replace(/^\/+/, '');

  if (rawPath) {
    const uploadsIdx = rawPath.indexOf('uploads/');
    const relativePath = uploadsIdx !== -1 ? rawPath.substring(uploadsIdx) : rawPath;
    const last = relativePath.split('/').pop();
    if (/\.\w{1,10}$/i.test(last)) return `${baseUrl}/${relativePath}`;
    return filename ? `${baseUrl}/${relativePath}/${filename}` : `${baseUrl}/${relativePath}`;
  }

  return filename ? `${baseUrl}/uploads/datasets/${filename}` : '';
};

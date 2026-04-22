import { API_URL } from '../../../config/api';
import { statusPalette } from './constants';

export const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token') || '';

export const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
});

export const normalizeProject = (raw) => {
  const p = raw?.project || raw || {};
  return {
    ...p,
    id: p.id || p._id,
    name: p.name || 'Untitled project',
    description: p.description || '',
    guidelines: p.guidelines || '',
    deadline: p.deadline || p.due_date || '',
    status: p.status || 'draft',
    exportFormat: p.exportFormat || p.export_format || 'JSON',
    datasetIds: p.dataset_ids || p.datasetIds || (p.dataset_id ? [p.dataset_id] : []),
    reviewPolicy: p.reviewPolicy || p.review_policy || {},
  };
};

export const normalizeDataset = (ds) => ({
  ...ds,
  id: ds?.id || ds?._id,
  name: ds?.name || 'Untitled dataset',
  type: ds?.type || 'image',
  description: ds?.description || '',
});

export const normalizeTask = (task) => {
  const dataItem = task?.dataItem || task?.datasetItemId || task?.itemId || task?.data_item || {};
  const annotator = task?.annotatorId || task?.annotator || {};
  const reviewers = task?.reviewers || [];
  return {
    ...task,
    id: task?.id || task?._id,
    status: task?.status || 'assigned',
    dataItem,
    annotator,
    reviewers,
    datasetId: task?.datasetId || task?.dataset_id || dataItem?.datasetId || null,
  };
};

export const getStatusMeta = (status) => statusPalette[status] || statusPalette.draft;

export const getFullAssetUrl = (dataItem) => {
  if (!dataItem) return '';
  const baseUrl = API_URL.replace(/\/+$/, '');
  const directUrl =
    dataItem?.signedUrl ||
    dataItem?.signed_url ||
    dataItem?.storageUrl ||
    dataItem?.storage_url ||
    dataItem?.url ||
    dataItem?.imageUrl ||
    '';
  if (directUrl && /^https?:\/\//i.test(directUrl)) return directUrl;

  const filename = dataItem?.originalName || dataItem?.original_name || dataItem?.filename || '';
  const rawPath = (dataItem?.path || dataItem?.storagePath || dataItem?.storage_path || directUrl || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (rawPath) {
    const uploadsIdx = rawPath.indexOf('uploads/');
    const relativePath = uploadsIdx !== -1 ? rawPath.substring(uploadsIdx) : rawPath;
    const last = relativePath.split('/').pop();
    const hasExt = /\.\w{1,10}$/i.test(last);
    if (hasExt) {
      if (!relativePath.startsWith('uploads/')) return `${baseUrl}/uploads/datasets/${relativePath}`;
      return `${baseUrl}/${relativePath}`;
    }
    const safePath = relativePath.startsWith('uploads/') ? relativePath : `uploads/datasets/${relativePath}`;
    return filename ? `${baseUrl}/${safePath}/${filename}` : `${baseUrl}/${safePath}`;
  }
  return filename ? `${baseUrl}/uploads/datasets/${filename}` : '';
};

export const getItemMediaInfo = (dataItem = {}) => {
  const mime = String(dataItem?.mimeType || dataItem?.mime_type || '').toLowerCase();
  const fileName =
    dataItem?.originalName ||
    dataItem?.original_name ||
    dataItem?.filename ||
    dataItem?.path ||
    'Unknown item';

  let mediaType = 'other';
  if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName) || mime.startsWith('image/')) mediaType = 'image';
  else if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName) || mime.startsWith('audio/')) mediaType = 'audio';
  else if (/\.(txt|csv|json|xml)$/i.test(fileName) || mime.startsWith('text/')) mediaType = 'text';

  return { mediaType, fileName, fileUrl: getFullAssetUrl(dataItem) };
};

export const getLabelColor = (labelName = '') => {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const hash = String(labelName).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[Math.abs(hash) % colors.length];
};

export const extractAnnotations = (task) => {
  const source = task?.labels || task?.annotation_data || task?.annotationData || {};
  const raw =
    source?.bboxes || source?.objects || source?.spans ||
    source?.segments || source?.sentences || source?.label || [];
  const arr = Array.isArray(raw) ? raw : [raw];

  return arr.filter(Boolean).map((item) => ({
    label: typeof item === 'string' ? item : item.label || item.text || item.name || 'unknown',
    bbox: item?.bbox || item?.box ||
      (item?.x !== undefined ? [item.x, item.y, item.x + (item.width || 0), item.y + (item.height || 0)] : null),
    start: item?.start,
    end: item?.end,
    text: item?.text || item?.sentence || null,
    note: item?.note || '',
  }));
};

export const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

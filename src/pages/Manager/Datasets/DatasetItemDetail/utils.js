import { API_URL } from '../../../../config/api';

export const getFullImageUrl = (dataItem) => {
  if (!dataItem) return '';
  // Ưu tiên signed_url từ Supabase
  if (dataItem.signed_url) return dataItem.signed_url;

  const baseUrl = API_URL.replace(/\/+$/, '');
  const directUrl = dataItem?.url || dataItem?.imageUrl || '';
  if (directUrl && /^https?:\/\//i.test(directUrl)) return directUrl;

  const filename = dataItem?.originalName || dataItem?.filename || '';
  const rawPath = (dataItem?.path || directUrl || '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (rawPath) {
    const uploadsIdx = rawPath.indexOf('uploads/');
    const relativePath = uploadsIdx !== -1 ? rawPath.substring(uploadsIdx) : rawPath;
    const last = relativePath.split('/').pop();
    const hasExt = /\.\w{1,10}$/i.test(last);
    if (hasExt) return `${baseUrl}/${relativePath}`;
    return filename ? `${baseUrl}/${relativePath}/${filename}` : `${baseUrl}/${relativePath}`;
  }

  return filename ? `${baseUrl}/uploads/datasets/${filename}` : '';
};

export const normalizeLabelSet = (labelSet) => {
  if (!Array.isArray(labelSet)) return [];
  return labelSet.map((label) => {
    if (typeof label === 'string') return { name: label };
    if (label && typeof label === 'object') return { name: label.name || label.label || 'Unknown', color: label.color };
    return { name: 'Unknown' };
  });
};

export const hasColorInfo = (labelSet) =>
  Array.isArray(labelSet) && labelSet.some((l) => l && typeof l === 'object' && Boolean(l.color));

export const pickBestLabelSet = (...candidates) => {
  const valid = candidates.filter((c) => Array.isArray(c) && c.length > 0);
  if (!valid.length) return [];
  return valid.find((c) => hasColorInfo(c)) || valid[0];
};

export const isTextItem = (it) => {
  const mime = (it?.mimeType || it?.dataItem?.mimeType || '').toLowerCase();
  const fileName = (it?.filename || it?.dataItem?.filename || it?.path || it?.dataItem?.path || '').toLowerCase();
  return mime.startsWith('text/') || /\.(txt|csv|json|xml)$/i.test(fileName);
};

// Annotator color assignment
const annotatorColors = {};
export const annotatorColorList = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export const getAnnotatorColor = (annotatorName) => {
  if (!annotatorName) return annotatorColorList[0];
  if (!annotatorColors[annotatorName]) {
    const index = Object.keys(annotatorColors).length % annotatorColorList.length;
    annotatorColors[annotatorName] = annotatorColorList[index];
  }
  return annotatorColors[annotatorName];
};

export const normalizeLabelName = (value = '') => value.toString().trim().toLowerCase();

export const getLabelColor = (labelSet = [], label, fallback = '#3b82f6') => {
  if (!Array.isArray(labelSet) || !labelSet.length) return fallback;
  const target = normalizeLabelName(label);
  const found = labelSet.find((l) => normalizeLabelName(l?.name) === target);
  return found?.color || fallback;
};

export const toRgba = (hexColor = '#3b82f6', alpha = 0.25) => {
  const hex = (hexColor || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return `rgba(59,130,246,${alpha})`;
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

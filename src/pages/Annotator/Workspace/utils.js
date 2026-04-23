import { API_URL } from '../../../config/api';

export const getTaskDataItem = (t) => {
  return t?.dataItem || t?.data_item || t?.datasetItemId || t?.itemId || null;
};

export const buildFileUrl = (dataItem) => {
  if (!dataItem) return '';

  const directUrl =
    dataItem.signedUrl ||
    dataItem.signed_url ||
    dataItem.storageUrl ||
    dataItem.storage_url ||
    dataItem.url ||
    '';

  if (directUrl) return directUrl;

  const baseUrl = API_URL.replace(/\/+$/, '');

  const rawPath = (
    dataItem.path ||
    dataItem.storagePath ||
    dataItem.storage_path ||
    dataItem.filename ||
    dataItem.originalName ||
    dataItem.original_name ||
    ''
  ).replace(/^\/+/, '');

  if (!rawPath) return '';
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  return `${baseUrl}/${rawPath}`;
};

export const getTaskKind = (t) => {
  const item = getTaskDataItem(t);
console.log('ITEM =', item);
console.log('URL =', buildFileUrl(item));
  const mt = (item?.mimeType || item?.mime_type || '').toLowerCase();

  const fileName = (
    item?.originalName ||
    item?.original_name ||
    item?.filename ||
    item?.path ||
    ''
  ).toLowerCase();

  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('audio/')) return 'audio';
  if (mt.startsWith('text/')) return 'text';
  if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName)) return 'audio';
  if (mt === 'video/mp4' && /\.(mp4|m4a)$/i.test(fileName)) return 'audio';
  if (['application/json', 'application/xml', 'text/csv'].includes(mt)) return 'text';
  if (/\.(txt|csv|json|xml)$/i.test(fileName)) return 'text';

  return 'other';
};

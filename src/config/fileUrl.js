import API_BASE_URL from './api';

export const getFileUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
};

export default getFileUrl;

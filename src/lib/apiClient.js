import axios from 'axios';
import API_BASE_URL from '../config/api';

const AUTH_TOKEN_KEY = 'token';
export const getToken = () => sessionStorage.getItem(AUTH_TOKEN_KEY);
export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const extractList = (payload) => Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
export const getErrorMessage = (error, fallback = 'Request failed.') => error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
export const normalizeUser = (user) => {
  if (!user) return null;
  const fullName = user.full_name || user.fullName || user.username || user.email || 'User';
  return { ...user, id: user.id || user._id, _id: user._id || user.id, full_name: fullName, fullName };
};
export const signedFileUrl = (item) => item?.signed_url || item?.storage_url || item?.url || '';

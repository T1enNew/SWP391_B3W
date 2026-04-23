import axios from 'axios';
import { API_URL } from '../config/api';

const getToken = () => sessionStorage.getItem('token');

const api = axios.create({
  baseURL: API_URL + '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.response?.data?.message || err.message;
    return Promise.reject(new Error(message));
  }
);

export const getLabels  = ()         => api.get('/labels').then((r) => r.data);
export const createLabel = (data)    => api.post('/labels', data).then((r) => r.data);
export const updateLabel = (id, data) => api.put(`/labels/${id}`, data).then((r) => r.data);
export const deleteLabel = (id)      => api.delete(`/labels/${id}`).then((r) => r.data);

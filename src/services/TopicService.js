import axios from 'axios';
import { API_URL } from '../config/api';

const getToken = () => sessionStorage.getItem('token');

const api = axios.create({
  baseURL: API_URL + '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle errors consistently
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.response?.data?.message || err.message;
    return Promise.reject(new Error(message));
  }
);

// ── Topics ────────────────────────────────────────────────────
export const getTopics = () => api.get('/topics').then((r) => r.data);
export const getTopic  = (id) => api.get(`/topics/${id}`).then((r) => r.data);
export const createTopic = (data) => api.post('/topics', data).then((r) => r.data);
export const updateTopic = (id, data) => api.put(`/topics/${id}`, data).then((r) => r.data);
export const deleteTopic = (id) => api.delete(`/topics/${id}`).then((r) => r.data);

// ── Subtopics ─────────────────────────────────────────────────
export const getSubtopics  = (topicId) =>
  topicId ? api.get(`/subtopics?topicId=${topicId}`).then((r) => r.data)
          : api.get('/subtopics').then((r) => r.data);
export const getSubtopic   = (id) => api.get(`/subtopics/${id}`).then((r) => r.data);
export const createSubtopic = (data) => api.post('/subtopics', data).then((r) => r.data);
export const updateSubtopic = (id, data) => api.put(`/subtopics/${id}`, data).then((r) => r.data);
export const deleteSubtopic = (id) => api.delete(`/subtopics/${id}`).then((r) => r.data);

// ── Label Sets ────────────────────────────────────────────────
export const getLabelSets = (subtopicId) =>
  subtopicId ? api.get(`/labelsets?subtopicId=${subtopicId}`).then((r) => r.data)
              : api.get('/labelsets').then((r) => r.data);
export const getLabelSet  = (id) => api.get(`/labelsets/${id}`).then((r) => r.data);
export const createLabelSet = (data) => api.post('/labelsets', data).then((r) => r.data);
export const updateLabelSet = (id, data) => api.put(`/labelsets/${id}`, data).then((r) => r.data);
export const deleteLabelSet = (id) => api.delete(`/labelsets/${id}`).then((r) => r.data);

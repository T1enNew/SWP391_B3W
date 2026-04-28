import axios from 'axios';
import { API_URL } from '../config/api';

const getToken = () => sessionStorage.getItem('token');
const CACHE_KEY    = 'lf_labels_cache';
const TOPIC_MAP_KEY = 'lf_labels_topic_map'; // { labelId: topicId } — backend Label model không có topic_id

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

// ── Topic-map helpers ─────────────────────────────────────────
// Backend Label không có topic_id → lưu mapping riêng ở localStorage
const readTopicMap  = () => { try { const s = localStorage.getItem(TOPIC_MAP_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; } };
const writeTopicMap = (map) => { try { localStorage.setItem(TOPIC_MAP_KEY, JSON.stringify(map)); } catch {} };

export const setLabelTopic = (labelId, topicId) => {
  if (!labelId) return;
  const map = readTopicMap();
  if (topicId) map[labelId] = topicId;
  else delete map[labelId];
  writeTopicMap(map);
};

// ── Cache helpers ─────────────────────────────────────────────
const readCache  = () => { try { const s = sessionStorage.getItem(CACHE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const writeCache = (list) => { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch {} };

// Gọi sau mỗi thao tác thay đổi labels để giữ cache đồng bộ
export const syncLabelsCache = (list) => { writeCache(list); };

// ── Raw API ────────────────────────────────────────────────────
export const getLabels   = ()          => api.get('/labels').then((r) => r.data);
export const createLabel = (data)      => api.post('/labels', data).then((r) => r.data);
export const updateLabel = (id, data)  => api.put(`/labels/${id}`, data).then((r) => r.data);
export const deleteLabel = (id)        => api.delete(`/labels/${id}`).then((r) => r.data);

// ── Smart fetch: merge topic_id từ localStorage vào API response ──
// Backend đã fix GET /api/labels (không còn 500). Nhưng Label schema không có topic_id
// → ta tự lưu mapping labelId→topicId ở localStorage và merge lại khi fetch.
export const getLabelsWithFallback = async () => {
  try {
    const data = await getLabels();
    const list = Array.isArray(data) ? data : (data?.labels || data?.data || []);

    // Merge topic_id từ localStorage map
    const topicMap = readTopicMap();
    const merged = list.map(l => ({
      ...l,
      topic_id: l.topic_id || topicMap[l.id] || '',
    }));

    writeCache(merged);
    return merged;
  } catch {
    // API lỗi → dùng sessionStorage cache (có topic_id đầy đủ)
    const cached = readCache();
    return cached ?? [];
  }
};

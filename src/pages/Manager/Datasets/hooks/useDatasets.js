// useDatasets.js
// Hook trung tâm quản lý toàn bộ logic trang Datasets của Manager.
// Bao gồm: fetch danh sách dataset, xem items, upload, xóa, edit, export JSON annotation,
//   tính trạng thái hoàn thành (isComplete) và map task theo item (approvedItemsMap).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../../config/api';
import { getArray } from '../../../../utils/api';
import { getAuthHeaders, coerceId, buildImageUrl } from '../utils';

// Hook chính — trả về toàn bộ state, computed values, và handlers cần thiết cho trang Datasets
export function useDatasets() {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);

  /* ── list state ── */
  const [datasets, setDatasets]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState({ open: false, msg: '', sev: 'success' });

  /* ── create dialog ── */
  const [createOpen, setCreateOpen]   = useState(false);
  const [createForm, setCreateForm]   = useState({ name: '', description: '' });
  const [creating, setCreating]       = useState(false);

  /* ── edit dialog ── */
  const [editDs, setEditDs]     = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editing, setEditing]   = useState(false);

  /* ── detail panel ── */
  const [selectedDs, setSelectedDs]         = useState(null);
  const [dsItems, setDsItems]               = useState([]);
  const [itemsLoading, setItemsLoading]     = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkedTasks, setLinkedTasks]       = useState([]);

  /* ── delete ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  /* ── misc ── */
  const [infoDs, setInfoDs]                   = useState(null);
  const [deletingItemId, setDeletingItemId]   = useState(null);
  const [detailItem, setDetailItem]           = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [dsStatusMap, setDsStatusMap]         = useState({});

  /* ── inline viewer (3-panel) ── */
  const [viewerOpen, setViewerOpen]               = useState(false);
  const [viewerInitialItem, setViewerInitialItem] = useState(null);

  // Index task theo itemId và tên file để tra cứu nhanh khi render từng item trong grid
  const tasksByItemId = useMemo(() => {
    const byId   = new Map();
    const byName = new Map();
    linkedTasks.forEach(t => {
      const di = t.dataItem || t.data_item;
      const itemId = typeof di === 'string' ? di : (di?._id || di?.id || '');
      if (itemId) {
        if (!byId.has(itemId)) byId.set(itemId, []);
        byId.get(itemId).push(t);
      }
      const fname = typeof di === 'object' ? (di?.originalName || di?.original_name || di?.filename || '') : '';
      if (fname) {
        if (!byName.has(fname)) byName.set(fname, []);
        byName.get(fname).push(t);
      }
    });
    return { byId, byName };
  }, [linkedTasks]);

  // Tra task liên quan đến 1 item cụ thể: tìm theo id trước, fallback theo tên file, dedup kết quả
  const getTasksForItem = useCallback((item) => {
    const id    = coerceId(item);
    const fname = item?.originalName || item?.original_name || item?.filename || '';
    const byId  = id    ? (tasksByItemId.byId?.get(id)     || []) : [];
    const byN   = fname ? (tasksByItemId.byName?.get(fname) || []) : [];
    const seen  = new Set();
    return [...byId, ...byN].filter(t => {
      const k = t.id || t._id || '';
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }, [tasksByItemId]);

  // Dataset được coi là hoàn thành khi tất cả items đã có task approved.
  // Quyết định hành vi khi click item: xem annotation (isComplete) vs xem detail page
  const isComplete = useMemo(() => {
    if (dsItems.length === 0) return false;
    if (dsItems.every(i => i.status === 'approved')) return true;
    const approvedCount = linkedTasks.filter(t => t.status === 'approved').length;
    if (linkedTasks.length > 0 && approvedCount >= dsItems.length) return true;
    return false;
  }, [dsItems, linkedTasks]);

  // Đếm task theo trạng thái để hiển thị progress bar trong dataset detail panel
  const dsStats = useMemo(() => ({
    approved:   linkedTasks.filter(t => t.status === 'approved').length,
    reviewing:  linkedTasks.filter(t => t.status === 'submitted').length,
    rework:     linkedTasks.filter(t => t.status === 'rejected').length,
    annotating: linkedTasks.filter(t => !['approved', 'submitted', 'rejected'].includes(t.status)).length,
  }), [linkedTasks]);

  // Map từ itemId/filename → thông tin annotation đã approved (annotators, labels, bboxes, fileUrl).
  // Dùng khi click item trong dataset đã hoàn thành để hiển thị popup xem annotation.
  // Build URL file theo nhiều fallback: signed_url → path → tên file
  const approvedItemsMap = useMemo(() => {
    const map = new Map();
    linkedTasks.filter(t => t.status === 'approved').forEach(task => {
      const di  = task.dataItem || task.data_item || {};
      const ann = task.annotatorId || task.annotator || {};
      const name = typeof ann === 'string'
        ? ann
        : (ann?.fullName || ann?.full_name || ann?.username || 'Annotator');

      const keys = [
        typeof di === 'string' ? di : null,
        di?._id, di?.id, di?.originalName, di?.original_name, di?.filename,
      ].filter(Boolean);

      const L   = task.labels || task.annotation_data || task.annotationData || {};
      const raw = L?.bboxes || L?.objects || L?.spans || L?.segments || (Array.isArray(L) ? L : []);
      const annotations = (Array.isArray(raw) ? raw : [raw]).map(x => ({
        label: typeof x === 'string' ? x : (x?.label || x?.text || x?.name || 'unknown'),
        bbox:  x?.bbox || x?.box || (x?.x !== undefined ? [x.x, x.y, x.x + (x.width || 0), x.y + (x.height || 0)] : null),
        start: x?.start,
        end:   x?.end,
      })).filter(a => a.label && a.label !== 'unknown');
      const labels = [...new Set(annotations.map(a => a.label))];

      const primaryKey = keys[0];
      if (!primaryKey) return;

      const approvedAt = task.reviewed_at || task.updated_at || null;

      if (!map.has(primaryKey)) {
        map.set(primaryKey, {
          fileName: di?.originalName || di?.original_name || di?.filename || primaryKey,
          approvedAt,
          fileUrl: (() => {
            if (!di || typeof di === 'string') return '';
            const base    = API_URL.replace(/\/+$/, '');
            const direct  = di.signed_url || di.signedUrl || di.storage_url || di.storageUrl || di.url || '';
            if (direct && /^https?:\/\//i.test(direct)) return direct;
            const rawPath = (di.path || di.storagePath || di.storage_path || direct || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (rawPath) {
              const idx = rawPath.indexOf('uploads/');
              const rel = idx !== -1 ? rawPath.substring(idx) : rawPath;
              if (/\.\w{1,10}$/i.test(rel.split('/').pop())) return `${base}/${rel.startsWith('uploads/') ? rel : `uploads/datasets/${rel}`}`;
            }
            const fname = di.originalName || di.original_name || di.filename || '';
            return fname ? `${base}/uploads/datasets/${fname}` : '';
          })(),
          itemId: di?._id || di?.id || primaryKey,
          mediaType: 'image',
          annotatorLabels: [{ name, labels, annotations, isPrimary: false }],
          _keys: keys,
        });
      } else {
        const entry = map.get(primaryKey);
        if (!entry.annotatorLabels.find(a => a.name === name))
          entry.annotatorLabels.push({ name, labels, annotations, isPrimary: false });
      }
      keys.slice(1).forEach(k => { if (!map.has(k)) map.set(k, map.get(primaryKey)); });
    });
    return map;
  }, [linkedTasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasets.filter(ds => !q || (ds.name || '').toLowerCase().includes(q) || (ds.description || '').toLowerCase().includes(q));
  }, [datasets, search]);

  // Pre-load trạng thái hoàn thành cho tất cả dataset cards (hiển thị badge Complete/In Progress).
  // Fetch tất cả projects + tasks một lần, gom theo dataset id → không cần fetch lại khi chọn từng dataset
  const buildDsStatusMap = useCallback(async (dsList) => {
    if (!dsList?.length) return;
    try {
      const pjRes  = await axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers: getAuthHeaders() });
      const pjList = Array.isArray(pjRes.data) ? pjRes.data : pjRes.data?.data || pjRes.data?.projects || [];

      const taskResults = await Promise.allSettled(
        pjList.map(p => axios.get(`${API_URL}/api/tasks/project/${coerceId(p)}`, { headers: getAuthHeaders() }))
      );

      const tasksByDs = {};
      taskResults.forEach((r, idx) => {
        if (r.status !== 'fulfilled') return;
        const tasks = Array.isArray(r.value.data) ? r.value.data : r.value.data?.data || r.value.data?.tasks || [];
        const proj  = pjList[idx];
        const dsId  = String(
          proj.dataset?.id || proj.dataset?._id
          || (typeof proj.dataset === 'string' ? proj.dataset : null)
          || proj.dataset_id || proj.datasetId || ''
        );
        if (!dsId || dsId === 'null' || dsId === 'undefined') return;
        if (!tasksByDs[dsId]) tasksByDs[dsId] = [];
        tasksByDs[dsId].push(...tasks);
      });

      const newMap = {};
      dsList.forEach(ds => {
        const dsId     = String(coerceId(ds));
        const tasks    = tasksByDs[dsId] || [];
        const total    = ds.total_items || ds.totalItems || 0;
        const approved = tasks.filter(t => t.status === 'approved').length;
        newMap[dsId] = {
          isComplete:  total > 0 && approved >= total,
          inProgress:  !(total > 0 && approved >= total) && tasks.length > 0,
          approved, total, tasks,
        };
      });
      setDsStatusMap(newMap);
    } catch { /* silent */ }
  }, []);

  // Fetch danh sách datasets, rồi trigger buildDsStatusMap để load trạng thái cho từng card
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() });
      const list = getArray(res.data);
      setDatasets(list);
      buildDsStatusMap(list);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không tải được danh sách dataset');
    } finally {
      setLoading(false);
    }
  }, [buildDsStatusMap]);

  // Fetch danh sách items (file ảnh/text/audio) trong 1 dataset cụ thể khi user click vào dataset đó
  const fetchDatasetItems = useCallback(async (ds) => {
    if (!ds) return;
    setItemsLoading(true);
    setDsItems([]);
    try {
      const res  = await axios.get(`${API_URL}/api/datasets/${coerceId(ds)}`, { headers: getAuthHeaders() });
      const data = res.data?.dataset || res.data || {};
      const items = data.data_items || data.items || data.files || [];
      setDsItems(Array.isArray(items) ? items : []);
    } catch {
      setDsItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  // Fetch tất cả tasks liên kết với dataset đang xem (qua các project dùng dataset đó).
  // Không có API trực tiếp dataset→tasks nên phải đi qua project list → filter → fetch tasks
  const fetchLinkedTasks = useCallback(async (ds) => {
    if (!ds) return;
    setLinkedTasks([]);
    try {
      const pjRes  = await axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers: getAuthHeaders() });
      const pjList = Array.isArray(pjRes.data) ? pjRes.data : pjRes.data?.data || pjRes.data?.projects || [];
      const dsId   = coerceId(ds);
      const linked = pjList.filter(p => {
        const did = p.dataset?.id || p.dataset?._id
          || (typeof p.dataset === 'string' ? p.dataset : null)
          || p.dataset_id || p.datasetId;
        return String(did) === String(dsId);
      });
      const results = await Promise.allSettled(
        linked.map(p => axios.get(`${API_URL}/api/tasks/project/${coerceId(p)}`, { headers: getAuthHeaders() }))
      );
      const allTasks = results.flatMap(r => {
        if (r.status !== 'fulfilled') return [];
        const d = r.value.data;
        return Array.isArray(d) ? d : d?.data || d?.tasks || [];
      });
      setLinkedTasks(allTasks);
    } catch {
      setLinkedTasks([]);
    }
  }, []);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  useEffect(() => {
    if (!selectedDs) return;
    setViewerOpen(false);
    setViewerInitialItem(null);
    fetchDatasetItems(selectedDs);
    const preloaded = dsStatusMap[String(coerceId(selectedDs))]?.tasks;
    if (preloaded?.length) setLinkedTasks(preloaded);
    else fetchLinkedTasks(selectedDs);
  }, [selectedDs, fetchDatasetItems, fetchLinkedTasks, dsStatusMap]);

  /* ── handlers ── */
  const showToast = useCallback((msg, sev = 'success') => setToast({ open: true, msg, sev }), []);

  // Tạo dataset mới với type mặc định là "image"
  const handleCreate = async () => {
    if (!createForm.name.trim()) return showToast('Vui lòng nhập tên dataset', 'warning');
    setCreating(true);
    try {
      await axios.post(`${API_URL}/api/datasets`,
        { name: createForm.name.trim(), description: createForm.description.trim(), type: 'image' },
        { headers: getAuthHeaders() }
      );
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
      await fetchDatasets();
      showToast('Tạo dataset thành công');
    } catch (e) {
      const data = e?.response?.data;
      let msg = 'Tạo dataset thất bại';
      if (data?.errors?.length)   msg = data.errors.map(err => err.message || JSON.stringify(err)).join(', ');
      else if (data?.message)     msg = data.message;
      else if (data?.detail)      msg = Array.isArray(data.detail) ? data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ') : String(data.detail);
      else if (e.message)         msg = e.message;
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (e, ds) => {
    e.stopPropagation();
    setEditDs(ds);
    setEditForm({ name: ds.name || '', description: ds.description || '' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return showToast('Tên dataset không được để trống', 'warning');
    setEditing(true);
    try {
      await axios.put(`${API_URL}/api/datasets/${coerceId(editDs)}`,
        { name: editForm.name.trim(), description: editForm.description.trim() },
        { headers: getAuthHeaders() }
      );
      setEditDs(null);
      await fetchDatasets();
      if (coerceId(selectedDs) === coerceId(editDs))
        setSelectedDs(prev => ({ ...prev, name: editForm.name.trim(), description: editForm.description.trim() }));
      showToast('Cập nhật dataset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Cập nhật thất bại', 'error');
    } finally {
      setEditing(false);
    }
  };

  // Upload nhiều file vào dataset đang chọn (multipart/form-data).
  // Hiển thị progress bar trong quá trình upload, refresh item list sau khi xong.
  const handleUpload = async (files) => {
    if (!selectedDs || !files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      await axios.post(`${API_URL}/api/datasets/${coerceId(selectedDs)}/upload`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      showToast(`Upload ${files.length} ảnh thành công`);
      await fetchDatasetItems(selectedDs);
      await fetchDatasets();
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Upload thất bại', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/datasets/${coerceId(deleteTarget)}`, { headers: getAuthHeaders() });
      setDeleteTarget(null);
      if (coerceId(selectedDs) === coerceId(deleteTarget)) {
        setSelectedDs(null); setDsItems([]); setLinkedTasks([]);
      }
      await fetchDatasets();
      showToast('Xóa dataset thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa dataset thất bại', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteItem = async (e, item) => {
    e.stopPropagation();
    const itemId = coerceId(item) || item.path;
    if (!itemId || !selectedDs) return;
    setDeletingItemId(itemId);
    try {
      await axios.delete(`${API_URL}/api/datasets/${coerceId(selectedDs)}/items/${itemId}`, { headers: getAuthHeaders() });
      setDsItems(prev => prev.filter(i => (coerceId(i) || i.path) !== itemId));
      await fetchDatasets();
      showToast('Xóa ảnh thành công');
    } catch (e) {
      showToast(e?.response?.data?.message || e.message || 'Xóa ảnh thất bại', 'error');
    } finally {
      setDeletingItemId(null);
    }
  };

  // Xử lý click vào 1 item trong dataset:
  //   - Dataset đã hoàn thành (isComplete) → mở 3-panel inline viewer
  //   - Dataset chưa hoàn thành → navigate sang trang chi tiết item
  const handleItemClick = (item) => {
    if (isComplete) {
      setViewerInitialItem(item);
      setViewerOpen(true);
    } else {
      navigate(
        `/manager/datasets/${coerceId(selectedDs)}/items/${encodeURIComponent(item.id || item._id || item.path || '')}`,
        { state: { item, datasetName: selectedDs.name } }
      );
    }
  };

  // Export toàn bộ annotation đã approved của dataset ra file JSON và tải về máy.
  // Chỉ hoạt động khi isComplete = true. Format: { dataset info, summary stats, items[] }
  const handleExport = () => {
    if (!selectedDs || !isComplete) return;
    const items = dsItems.map(item => {
      const keys  = [coerceId(item), item?.originalName, item?.original_name, item?.filename].filter(Boolean);
      const entry = keys.reduce((f, k) => f || approvedItemsMap.get(k), null);
      return {
        id: coerceId(item),
        filename: item?.originalName || item?.original_name || item?.filename || coerceId(item),
        url: buildImageUrl(item),
        status: 'approved',
        annotations: (entry?.annotatorLabels || []).map(ann => ({
          annotator: ann.name,
          labels:    ann.labels,
          bboxes:    (ann.annotations || []).filter(a => a.bbox).map(a => ({ label: a.label, bbox: a.bbox })),
          spans:     (ann.annotations || []).filter(a => a.start !== undefined).map(a => ({ label: a.label, start: a.start, end: a.end })),
        })),
      };
    });
    const payload = {
      dataset: { id: coerceId(selectedDs), name: selectedDs.name, description: selectedDs.description || '', type: selectedDs.type || 'image', totalItems: dsItems.length, exportedAt: new Date().toISOString() },
      summary: { total: dsItems.length, ...dsStats },
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${selectedDs.name.replace(/\s+/g, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Xử lý kéo-thả file vào vùng upload → gọi handleUpload
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) handleUpload(files);
  };

  return {
    /* state */
    datasets, loading, search, setSearch, error, toast, setToast,
    createOpen, setCreateOpen, createForm, setCreateForm, creating,
    editDs, setEditDs, editForm, setEditForm, editing,
    selectedDs, setSelectedDs, dsItems, itemsLoading,
    uploading, uploadProgress, linkedTasks, deleteTarget, setDeleteTarget, deleting,
    infoDs, setInfoDs, deletingItemId, detailItem, detailDialogOpen, setDetailDialogOpen, setDetailItem,
    viewerOpen, setViewerOpen, viewerInitialItem,
    dsStatusMap, fileInputRef,
    /* computed */
    filtered, isComplete, dsStats, approvedItemsMap, getTasksForItem,
    /* handlers */
    fetchDatasets, handleCreate, openEdit, handleSaveEdit,
    handleUpload, handleDelete, handleDeleteItem, handleItemClick, handleExport, handleDrop, showToast,
  };
}

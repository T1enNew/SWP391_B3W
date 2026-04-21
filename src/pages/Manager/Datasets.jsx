import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { API_URL } from '../../config/api';
import ImageViewer from '../../components/ImageViewer';

const pageBg = '#081226';
const panelBg = '#111c33';
const softBg = '#0f172a';
const borderColor = '#26344f';
const primary = '#3b82f6';
const textMain = '#e2e8f0';
const textDim = '#94a3b8';

const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.datasets)) return data.datasets;
  return [];
};

const coerceId = (obj) => obj?._id || obj?.id || '';

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('vi-VN');
};

const timeAgo = (v) => {
  if (!v) return '-';
  const d = new Date(v).getTime();
  if (Number.isNaN(d)) return '-';
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const day = Math.floor(h / 24);
  return `${day} ngày trước`;
};

const TypeBadge = ({ type }) => {
  const map = {
    image: { label: 'IMAGE', bg: 'rgba(245,158,11,0.16)', color: '#f59e0b' },
    text: { label: 'TEXT', bg: 'rgba(59,130,246,0.16)', color: '#60a5fa' },
    audio: { label: 'AUDIO', bg: 'rgba(34,197,94,0.16)', color: '#22c55e' },
    video: { label: 'VIDEO', bg: 'rgba(168,85,247,0.16)', color: '#c084fc' },
  };
  const t = map[String(type || 'image').toLowerCase()] || map.image;
  return (
    <Chip
      size="small"
      label={t.label}
      sx={{
        bgcolor: t.bg,
        color: t.color,
        fontWeight: 700,
        fontSize: '0.68rem',
        borderRadius: 2,
      }}
    />
  );
};

const SummaryCard = ({ icon, title, value, color }) => (
  <Box
    sx={{
      bgcolor: softBg,
      border: `1px solid ${borderColor}`,
      borderRadius: 2.5,
      p: 2,
      minHeight: 88,
    }}
  >
    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
      <Box sx={{ color }}>{icon}</Box>
      <Typography sx={{ color: textDim, fontSize: 13 }}>{title}</Typography>
    </Stack>
    <Typography sx={{ color: textMain, fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
      {value}
    </Typography>
  </Box>
);

const Datasets = () => {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [editingDs, setEditingDs] = useState(null);
  const [detailDs, setDetailDs] = useState(null);

  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState([]);

  const [form, setForm] = useState({
    name: '',
    type: 'image',
    description: '',
  });
const [detailApprovedItems, setDetailApprovedItems] = useState([]);
const [detailApprovedLoading, setDetailApprovedLoading] = useState(false);
const [selectedApprovedItem, setSelectedApprovedItem] = useState(null);
const getArraySafe = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.tasks)) return data.tasks;
  return [];
};

const getTaskDataItem = (t) => {
  return t?.dataItem || t?.data_item || t?.datasetItem || t?.item || null;
};

const buildFileUrl = (dataItem) => {
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
  const rawPath = (dataItem?.path || dataItem?.storagePath || dataItem?.storage_path || directUrl || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (rawPath) {
    const uploadsIdx = rawPath.indexOf('uploads/');
    const relativePath = uploadsIdx !== -1 ? rawPath.substring(uploadsIdx) : rawPath;
    const parts = relativePath.split('/');
    const last = parts[parts.length - 1];
    const hasExt = /\.\w{1,10}$/i.test(last);
    if (hasExt) {
        if (!relativePath.startsWith('uploads/')) {
            return `${baseUrl}/uploads/datasets/${relativePath}`;
        }
        return `${baseUrl}/${relativePath}`;
    }
    const safePath = relativePath.startsWith('uploads/') ? relativePath : `uploads/datasets/${relativePath}`;
    return filename ? `${baseUrl}/${safePath}/${filename}` : `${baseUrl}/${safePath}`;
  }
  return filename ? `${baseUrl}/uploads/datasets/${filename}` : '';
};

const normalizeLabelEntries = (labels) => {
  const src = labels || {};
  const result = [];

  if (Array.isArray(src?.bboxes)) {
    src.bboxes.forEach((x, idx) => {
      result.push({
        id: x.id || `bbox-${idx}`,
        label: x.label || x.name || 'unknown',
        bbox: x.bbox || x.box || (x.x !== undefined ? [x.x, x.y, x.x + (x.width || 0), x.y + (x.height || 0)] : null),
      });
    });
  }

  if (Array.isArray(src?.objects)) {
    src.objects.forEach((x, idx) => {
      result.push({
        id: x.id || `obj-${idx}`,
        label: x.label || x.name || 'unknown',
        bbox: x.bbox || x.box || (x.x !== undefined ? [x.x, x.y, x.x + (x.width || 0), x.y + (x.height || 0)] : null),
      });
    });
  }

  if (Array.isArray(src?.spans)) {
    src.spans.forEach((x, idx) => {
      result.push({
        id: x.id || `span-${idx}`,
        label: x.label || x.text || 'unknown',
        span: x,
      });
    });
  }

  if (Array.isArray(src?.segments)) {
    src.segments.forEach((x, idx) => {
      result.push({
        id: x.id || `seg-${idx}`,
        label: x.label || x.name || 'unknown',
        segment: x,
      });
    });
  }

  return result;
};
const loadDatasetApprovedItems = async (ds) => {
  const datasetId = coerceId(ds);
  if (!datasetId) {
    setDetailApprovedItems([]);
    return;
  }

  setDetailApprovedLoading(true);

  try {
    const headers = getAuthHeaders();

    const projectsRes = await axios.get(`${API_URL}/api/projects`, { headers });
    const allProjects = getArraySafe(projectsRes.data);

    const matchedProjects = allProjects.filter((p) => {
      const pid =
        p?.dataset?.id ||
        p?.dataset?._id ||
        p?.dataset_id ||
        p?.datasetId ||
        '';
      return pid === datasetId;
    });

    const taskResponses = await Promise.all(
      matchedProjects.map(async (p) => {
        try {
          const projectId = coerceId(p);
          const res = await axios.get(`${API_URL}/api/tasks/project/${projectId}`, {
            headers,
          });
          return getArraySafe(res.data);
        } catch {
          return [];
        }
      })
    );

    const subtopicIds = Array.isArray(ds.subtopics) 
                        ? ds.subtopics.map(st => st?.id || st)
                        : Array.isArray(ds.subtopic_ids) ? ds.subtopic_ids 
                        : Array.isArray(ds.subtopicIds) ? ds.subtopicIds : [];
    
    let assetsMap = {};
    if (subtopicIds.length > 0) {
        const assetResponses = await Promise.allSettled(
          subtopicIds.map(subId => axios.get(`${API_URL}/api/subtopics/${subId}/assets`, { headers }))
        );
        const assetsList = assetResponses
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => Array.isArray(r.value.data) ? r.value.data : (r.value.data?.data || []));

        assetsList.forEach(a => {
          if (a.id) assetsMap[a.id] = a;
          if (a.filename) assetsMap[a.filename] = a;
          if (a.original_name) assetsMap[a.original_name] = a;
        });
    }

    const allTasks = taskResponses.flat();
    const approvedTasks = allTasks.filter((t) => t?.status === 'approved');

    const mapped = approvedTasks.map((task, idx) => {
      let dataItem = getTaskDataItem(task) || {};
      const key = dataItem.id || dataItem.filename || dataItem.original_name || dataItem.originalName;
      const matchedAsset = assetsMap[key] || assetsMap[dataItem.filename] || assetsMap[dataItem.originalName] || assetsMap[dataItem.original_name];
      if (matchedAsset) {
          dataItem = {
              ...dataItem,
              ...matchedAsset,
              originalName: matchedAsset.original_name || dataItem.originalName,
              mimeType: matchedAsset.mime_type || dataItem.mimeType,
              storageUrl: matchedAsset.storage_url || dataItem.storageUrl,
              signedUrl: matchedAsset.signed_url || dataItem.signedUrl,
          };
      }

      const labels = normalizeLabelEntries(task?.labels || task?.annotation_data || {});
      const fileUrl = buildFileUrl(dataItem);

      return {
        id: task?.id || `approved-${idx}`,
        task,
        dataItem,
        fileUrl,
        fileName:
          dataItem?.original_name ||
          dataItem?.originalName ||
          dataItem?.filename ||
          `item-${idx + 1}`,
        annotatorName:
          task?.annotator?.full_name ||
          task?.annotator?.fullName ||
          task?.annotator?.username ||
          'Unknown annotator',
        labels,
      };
    });

    setDetailApprovedItems(mapped);
  } catch (err) {
    console.error('loadDatasetApprovedItems failed:', err);
    setDetailApprovedItems([]);
  } finally {
    setDetailApprovedLoading(false);
  }
};
  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!selectedTopicId) {
      setSubtopics([]);
      setSelectedSubtopicIds([]);
      return;
    }
    fetchSubtopics(selectedTopicId);
  }, [selectedTopicId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');

      const [datasetsRes, topicsRes] = await Promise.all([
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/topics`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);

      setDatasets(getArray(datasetsRes.data));
      setTopics(getArray(topicsRes.data));
    } catch (err) {
      setError('Không tải được dữ liệu datasets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtopics = async (topicId) => {
    try {
      const res = await axios.get(`${API_URL}/api/subtopics?topic_id=${topicId}`, {
        headers: getAuthHeaders(),
      });
      setSubtopics(getArray(res.data));
    } catch {
      setSubtopics([]);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'image',
      description: '',
    });
    setSelectedTopicId('');
    setSelectedSubtopicIds([]);
    setEditingDs(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpenCreate(true);
  };

  const handleOpenEdit = (ds) => {
    setEditingDs(ds);
    setForm({
      name: ds?.name || '',
      type: ds?.type || 'image',
      description: ds?.description || '',
    });
    setSelectedTopicId('');
    setSelectedSubtopicIds(
      Array.isArray(ds?.subtopic_ids)
        ? ds.subtopic_ids
        : Array.isArray(ds?.subtopicIds)
        ? ds.subtopicIds
        : []
    );
    setOpenEdit(true);
  };

const handleOpenDetail = async (ds) => {
  setDetailDs(ds);
  setDetailOpen(true);
  setDetailApprovedItems([]);
  await loadDatasetApprovedItems(ds);
};
  const handleDelete = async (ds) => {
    const id = coerceId(ds);
    if (!id) return;
    const ok = window.confirm(`Xóa dataset "${ds?.name || ''}"?`);
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/api/datasets/${id}`, {
        headers: getAuthHeaders(),
      });
      await fetchAll();
    } catch (err) {
      alert(err?.response?.data?.message || 'Xóa dataset thất bại');
    }
  };

const handleCreate = async () => {
  if (!form.name.trim()) {
    alert('Vui lòng nhập tên dataset');
    return;
  }

  if (!selectedTopicId) {
    alert('Vui lòng chọn topic');
    return;
  }

  if (!selectedSubtopicIds.length) {
    alert('Vui lòng chọn subtopic');
    return;
  }

  try {
 const payload = {
  name: form.name.trim(),
  description: form.description.trim(),
  type: form.type || 'image',
  topic_id: selectedTopicId,
  subtopic_ids: selectedSubtopicIds,
};

    await axios.post(`${API_URL}/api/datasets`, payload, {
      headers: getAuthHeaders(),
    });

    setOpenCreate(false);
    resetForm();
    await fetchAll();
  } catch (err) {
    console.error(err?.response?.data || err);
    alert(
      err?.response?.data?.errors?.[0]?.message ||
      err?.response?.data?.message ||
      'Tạo dataset thất bại'
    );
  }
};

  const handleUpdate = async () => {
  if (!editingDs) return;

  if (!form.name.trim()) {
    alert('Vui lòng nhập tên dataset');
    return;
  }

  if (!selectedTopicId) {
    alert('Vui lòng chọn topic');
    return;
  }

  try {
const payload = {
  name: form.name.trim(),
  description: form.description?.trim() || '',
  topic_id: selectedTopicId,
  subtopic_ids: selectedSubtopicIds,
};

    await axios.put(`${API_URL}/api/datasets/${coerceId(editingDs)}`, payload, {
      headers: getAuthHeaders(),
    });

    setOpenEdit(false);
    resetForm();
    await fetchAll();
  } catch (err) {
    console.error(err?.response?.data || err);
    alert(
      err?.response?.data?.errors?.[0]?.message ||
      err?.response?.data?.message ||
      'Cập nhật dataset thất bại'
    );
  }
};

  const filtered = useMemo(() => {
    let r = [...datasets];

    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(
        (ds) =>
          (ds.name || '').toLowerCase().includes(t) ||
          (ds.description || '').toLowerCase().includes(t)
      );
    }

    if (filterType !== 'all') {
      r = r.filter((ds) => String(ds.type || '').toLowerCase() === filterType);
    }

    r.sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      return an.localeCompare(bn);
    });

    return r;
  }, [datasets, search, filterType]);

  const summary = useMemo(() => {
    return {
      totalDatasets: datasets.length,
      rawItems: 0,
      approved: 0,
      rejected: 0,
      readyAI: 0,
      annotating: 0,
      review: 0,
    };
  }, [datasets]);

  const currentSubtopicOptions = subtopics;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: pageBg, p: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box
          sx={{
            bgcolor: panelBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 3.5,
              py: 3,
              borderBottom: `1px solid ${borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ color: textMain, fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>
                Datasets
              </Typography>
              <Typography sx={{ color: textDim, mt: 1 }}>
                Quản lý bộ dữ liệu cho AI Training
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                bgcolor: primary,
                px: 2.2,
                py: 1.2,
                borderRadius: 2.5,
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#2563eb', boxShadow: 'none' },
              }}
            >
              Tạo Dataset
            </Button>
          </Box>

          <Box sx={{ px: 3, py: 2.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3} lg={1.7}>
                <SummaryCard
                  icon={<FolderOpenOutlinedIcon />}
                  title="Tổng Datasets"
                  value={summary.totalDatasets}
                  color="#60a5fa"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={1.7}>
                <SummaryCard
                  icon={<Inventory2OutlinedIcon />}
                  title="Raw Items"
                  value={summary.rawItems}
                  color="#f8fafc"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={1.7}>
                <SummaryCard
                  icon={<CategoryOutlinedIcon />}
                  title="Đã duyệt"
                  value={summary.approved}
                  color="#22c55e"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={1.7}>
                <SummaryCard
                  icon={<DeleteOutlineIcon />}
                  title="Từ chối"
                  value={summary.rejected}
                  color="#ef4444"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={1.7}>
                <SummaryCard
                  icon={<CategoryOutlinedIcon />}
                  title="Sẵn sàng AI"
                  value={summary.readyAI}
                  color="#a78bfa"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={1.7}>
                <SummaryCard
                  icon={<CategoryOutlinedIcon />}
                  title="Đang gán nhãn"
                  value={summary.annotating}
                  color="#3b82f6"
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: softBg,
                border: `1px solid ${borderColor}`,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
              }}
            >
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: textDim, mr: 1 }} />,
                }}
                sx={{
                  minWidth: 260,
                  '& .MuiOutlinedInput-root': {
                    color: textMain,
                    bgcolor: '#0b1730',
                    borderRadius: 2,
                    '& fieldset': { borderColor: borderColor },
                    '&:hover fieldset': { borderColor: '#3b4f77' },
                    '&.Mui-focused fieldset': { borderColor: primary },
                  },
                }}
              />

              <TextField
                select
                size="small"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                sx={{
                  minWidth: 170,
                  '& .MuiOutlinedInput-root': {
                    color: textMain,
                    bgcolor: '#0b1730',
                    borderRadius: 2,
                    '& fieldset': { borderColor: borderColor },
                    '&:hover fieldset': { borderColor: '#3b4f77' },
                    '&.Mui-focused fieldset': { borderColor: primary },
                  },
                }}
              >
                <MenuItem value="all">Tất cả loại</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="audio">Audio</MenuItem>
                <MenuItem value="video">Video</MenuItem>
              </TextField>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 3 }}>
              {loading ? (
                <Typography sx={{ color: textDim }}>Đang tải datasets...</Typography>
              ) : filtered.length === 0 ? (
                <Box
                  sx={{
                    py: 8,
                    textAlign: 'center',
                    border: `1px dashed ${borderColor}`,
                    borderRadius: 3,
                    bgcolor: softBg,
                  }}
                >
                  <Typography sx={{ color: textDim }}>Không có dataset nào.</Typography>
                </Box>
              ) : (
                <Grid container spacing={2.5}>
                  {filtered.map((ds) => {
                    const raw = ds.totalItems || ds.total_items || ds.files?.length || 0;

                    return (
                      <Grid item xs={12} sm={6} lg={4} key={coerceId(ds)}>
                        <Card
                          sx={{
                            bgcolor: panelBg,
                            color: textMain,
                            borderRadius: 3,
                            border: `1px solid ${borderColor}`,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                            height: '100%',
                          }}
                        >
                          <CardContent sx={{ p: 2.2 }}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="flex-start"
                              sx={{ mb: 1.5 }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                    color: textMain,
                                    mb: 0.8,
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {ds.name || 'Untitled'}
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  <TypeBadge type={ds.type} />
                                  <Chip
                                    size="small"
                                    label={`${raw} items`}
                                    sx={{
                                      bgcolor: 'rgba(34,197,94,0.12)',
                                      color: '#34d399',
                                      fontWeight: 700,
                                      fontSize: '0.68rem',
                                    }}
                                  />
                                  {ds.description ? (
                                    <Chip
                                      size="small"
                                      label="Có mô tả"
                                      sx={{
                                        bgcolor: 'rgba(168,85,247,0.14)',
                                        color: '#c084fc',
                                        fontWeight: 700,
                                        fontSize: '0.68rem',
                                      }}
                                    />
                                  ) : null}
                                </Stack>
                              </Box>

                              <IconButton
                                size="small"
                                onClick={() => handleDelete(ds)}
                                sx={{ color: '#f87171' }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Stack>

                            <Typography
                              sx={{
                                color: textDim,
                                minHeight: 42,
                                fontSize: 13,
                                mb: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {ds.description || 'Không có mô tả'}
                            </Typography>

                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 1.2,
                                mb: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  bgcolor: softBg,
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: 2,
                                  p: 1.2,
                                  textAlign: 'center',
                                }}
                              >
                                <Typography sx={{ color: '#22c55e', fontWeight: 800, fontSize: 24 }}>
                                  0
                                </Typography>
                                <Typography sx={{ color: textDim, fontSize: 12 }}>Approved</Typography>
                              </Box>
                              <Box
                                sx={{
                                  bgcolor: softBg,
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: 2,
                                  p: 1.2,
                                  textAlign: 'center',
                                }}
                              >
                                <Typography sx={{ color: '#f59e0b', fontWeight: 800, fontSize: 24 }}>
                                  0
                                </Typography>
                                <Typography sx={{ color: textDim, fontSize: 12 }}>Review</Typography>
                              </Box>
                              <Box
                                sx={{
                                  bgcolor: softBg,
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: 2,
                                  p: 1.2,
                                  textAlign: 'center',
                                }}
                              >
                                <Typography sx={{ color: '#ef4444', fontWeight: 800, fontSize: 24 }}>
                                  0
                                </Typography>
                                <Typography sx={{ color: textDim, fontSize: 12 }}>Rework</Typography>
                              </Box>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.7 }}>
                                <Typography sx={{ color: textDim, fontSize: 12 }}>Tiến độ</Typography>
                                <Typography sx={{ color: primary, fontWeight: 700, fontSize: 12 }}>
                                  0%
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  height: 8,
                                  borderRadius: 10,
                                  bgcolor: softBg,
                                  border: `1px solid ${borderColor}`,
                                  overflow: 'hidden',
                                }}
                              >
                                <Box sx={{ width: '0%', height: '100%', bgcolor: primary }} />
                              </Box>
                            </Box>

                            <Box
                              sx={{
                                mb: 2,
                                p: 1.2,
                                borderRadius: 2,
                                bgcolor: softBg,
                                border: `1px solid ${borderColor}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#64748b' }} />
                                <Typography sx={{ color: textDim, fontSize: 13, fontWeight: 600 }}>
                                  Đã tạo
                                </Typography>
                              </Stack>
                              <Typography sx={{ color: '#64748b', fontSize: 12 }}>
                                {fmtDate(ds.createdAt || ds.created_at)}
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<VisibilityOutlinedIcon />}
                                onClick={() => handleOpenDetail(ds)}
                                sx={{
                                  color: '#60a5fa',
                                  borderColor: '#2563eb',
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  borderRadius: 2,
                                }}
                              >
                                Chi tiết
                              </Button>
                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => handleOpenEdit(ds)}
                                sx={{
                                  color: '#f59e0b',
                                  borderColor: '#f59e0b',
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  borderRadius: 2,
                                }}
                              >
                                Sửa
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo Dataset Mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên Dataset"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Loại Dataset"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              fullWidth
            >
              <MenuItem value="image">Image</MenuItem>
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="video">Video</MenuItem>
            </TextField>
            <TextField
              label="Mô tả"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              select
              label="Topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              fullWidth
            >
           <MenuItem value="">-- Chọn topic --</MenuItem>
{topics.map((t) => (
  <MenuItem key={coerceId(t)} value={coerceId(t)}>
    {t.name || t.title || coerceId(t)}
  </MenuItem>
))}
            </TextField>
            <TextField
              select
              label="Subtopic"
              value={selectedSubtopicIds[0] || ''}
              onChange={(e) => setSelectedSubtopicIds(e.target.value ? [e.target.value] : [])}
              fullWidth
            >
              <MenuItem value="">-- Chọn subtopic --</MenuItem>
              {currentSubtopicOptions.map((s) => (
                <MenuItem key={coerceId(s)} value={coerceId(s)}>
                  {s.name || s.title || coerceId(s)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button onClick={handleCreate} variant="contained">
            Tạo dataset
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cập nhật Dataset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên Dataset"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Mô tả"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              select
              label="Topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              fullWidth
            >
             <MenuItem value="">-- Chọn subtopic --</MenuItem>
{currentSubtopicOptions.map((s) => (
  <MenuItem key={coerceId(s)} value={coerceId(s)}>
    {s.name || s.title || coerceId(s)}
  </MenuItem>
))}
            </TextField>
            <TextField
              select
              label="Subtopic"
              value={selectedSubtopicIds[0] || ''}
              onChange={(e) => setSelectedSubtopicIds(e.target.value ? [e.target.value] : [])}
              fullWidth
            >
              <MenuItem value="">-- Chọn subtopic --</MenuItem>
              {currentSubtopicOptions.map((s) => (
                <MenuItem key={coerceId(s)} value={coerceId(s)}>
                  {s.name || s.title || coerceId(s)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button onClick={handleUpdate} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dataset detail</DialogTitle>
  <DialogContent>
  {detailDs ? (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Box>
        <Typography><b>Tên:</b> {detailDs.name || '-'}</Typography>
        <Typography><b>Loại:</b> {detailDs.type || '-'}</Typography>
        <Typography><b>Mô tả:</b> {detailDs.description || '-'}</Typography>
        <Typography>
          <b>Items:</b> {detailDs.totalItems || detailDs.total_items || detailDs.files?.length || 0}
        </Typography>
        <Typography><b>Ngày tạo:</b> {fmtDate(detailDs.createdAt || detailDs.created_at)}</Typography>
        <Typography><b>Thời gian:</b> {timeAgo(detailDs.createdAt || detailDs.created_at)}</Typography>
      </Box>

      <Box
        sx={{
          mt: 1,
          p: 2,
          borderRadius: 2,
          bgcolor: '#0f172a',
          border: '1px solid #26344f',
        }}
      >
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
          Approved items ({detailApprovedItems.length})
        </Typography>

        {detailApprovedLoading ? (
          <Typography sx={{ color: '#94a3b8' }}>Đang tải approved items...</Typography>
        ) : detailApprovedItems.length === 0 ? (
          <Typography sx={{ color: '#94a3b8' }}>
            Chưa có item nào được duyệt cho dataset này.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {detailApprovedItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card
                  sx={{
                    bgcolor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 2,
                    color: '#e2e8f0',
                  }}
                >
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: '#020617',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {item.fileUrl ? (
                      <img
                        src={item.fileUrl}
                        alt={item.fileName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Typography sx={{ color: '#64748b' }}>No preview</Typography>
                    )}
                  </Box>

                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 1 }} noWrap>
                      {item.fileName}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={item.annotatorName}
                        sx={{
                          bgcolor: 'rgba(34,197,94,0.12)',
                          color: '#22c55e',
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        size="small"
                        label={`${item.labels.length} labels`}
                        sx={{
                          bgcolor: 'rgba(168,85,247,0.12)',
                          color: '#c084fc',
                          fontWeight: 700,
                        }}
                      />
                    </Stack>

                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setSelectedApprovedItem(item)}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: '#2563eb',
                        '&:hover': { bgcolor: '#1d4ed8' },
                      }}
                    >
                      View detail
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Stack>
  ) : null}
</DialogContent>
<Dialog
  open={!!selectedApprovedItem}
  onClose={() => setSelectedApprovedItem(null)}
  maxWidth="lg"
  fullWidth
>
  <DialogTitle>Approved item detail</DialogTitle>
  <DialogContent>
    {selectedApprovedItem ? (
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              minHeight: 420,
              bgcolor: '#020617',
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #26344f',
            }}
          >
            {selectedApprovedItem.fileUrl ? (
              <Box sx={{ position: 'relative', width: '100%', minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageViewer
                  imageUrl={selectedApprovedItem.fileUrl}
                  annotations={
                    selectedApprovedItem.labels
                      .filter(l => Boolean(l.bbox))
                      .map(l => {
                        let bbox = Array.isArray(l.bbox) ? l.bbox : [0, 0, 0, 0];
                        if (bbox.length === 4 && bbox.every(val => val <= 1 && val >= 0)) {
                           bbox = bbox.map(v => v * 100);
                        }
                        return {
                          label: l.label,
                          bbox: bbox
                        };
                      })
                  }
                  labelSet={Array.from(new Set(selectedApprovedItem.labels.map(l => l.label))).map(lblNames => ({name: lblNames}))}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  minHeight: 420,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                No preview
              </Box>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={1.5}>
            <Typography><b>File:</b> {selectedApprovedItem.fileName}</Typography>
            <Typography><b>Annotator:</b> {selectedApprovedItem.annotatorName}</Typography>
            <Typography><b>Item ID:</b> {selectedApprovedItem.id}</Typography>

            <Box
              sx={{
                mt: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#0f172a',
                border: '1px solid #26344f',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Labels</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedApprovedItem.labels.length ? (
                  selectedApprovedItem.labels.map((lb) => (
                    <Chip
                      key={lb.id}
                      size="small"
                      label={lb.label}
                      sx={{
                        bgcolor: 'rgba(59,130,246,0.14)',
                        color: '#60a5fa',
                        fontWeight: 700,
                      }}
                    />
                  ))
                ) : (
                  <Typography sx={{ color: '#94a3b8' }}>Không có labels</Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    ) : null}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setSelectedApprovedItem(null)}>Close</Button>
  </DialogActions>
</Dialog>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Datasets;
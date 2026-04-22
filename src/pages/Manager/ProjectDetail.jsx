import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  AudioFile as AudioIcon,
  Description as TextIcon,
  Image as ImageIcon,
  InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import { API_URL } from '../../config/api';
import AudioAnnotator from '../../components/AudioAnnotator';
import ImageViewer from '../../components/ImageViewer';

const pageSx = {
  minHeight: '100vh',
  background: '#0f172a',
  color: '#e2e8f0',
  px: { xs: 2, md: 4 },
  py: { xs: 2, md: 3 },
};

const panelSx = {
  background: '#111827',
  border: '1px solid #243041',
  borderRadius: 4,
  boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
};

const cardSx = {
  background: '#1f2937',
  border: '1px solid #334155',
  borderRadius: 3,
  color: '#e2e8f0',
  boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
};

const softCardSx = {
  ...cardSx,
  background: '#172132',
};

const primaryBtnSx = {
  borderRadius: 2.5,
  textTransform: 'none',
  fontWeight: 700,
  bgcolor: '#2563eb',
  color: '#fff',
  '&:hover': { bgcolor: '#1d4ed8' },
};

const secondaryBtnSx = {
  borderRadius: 2.5,
  textTransform: 'none',
  fontWeight: 700,
  bgcolor: '#1f2937',
  color: '#e2e8f0',
  border: '1px solid #334155',
  '&:hover': { bgcolor: '#273548' },
};

const modalPaperSx = {
  bgcolor: '#111827',
  color: '#e2e8f0',
  border: '1px solid #243041',
  borderRadius: '18px',
  boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
};

const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token') || '';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
});

const normalizeProject = (raw) => {
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

const normalizeDataset = (ds) => ({
  ...ds,
  id: ds?.id || ds?._id,
  name: ds?.name || 'Untitled dataset',
  type: ds?.type || 'image',
  description: ds?.description || '',
});

const normalizeTask = (task) => {
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

const statusPalette = {
  draft: { label: 'Draft', color: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
  waiting_rework: { label: 'Waiting rework', color: '#f97316', bg: 'rgba(249,115,22,0.16)' },
  submitted: { label: 'In review', color: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
  approved: { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
  rejected: { label: 'Rework', color: '#ef4444', bg: 'rgba(239,68,68,0.16)' },
  in_progress: { label: 'In progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.16)' },
  assigned: { label: 'Assigned', color: '#a78bfa', bg: 'rgba(167,139,250,0.16)' },
};

const typePalette = {
  image: { color: '#f59e0b', bg: 'rgba(245,158,11,0.16)', icon: ImageIcon },
  audio: { color: '#f472b6', bg: 'rgba(244,114,182,0.16)', icon: AudioIcon },
  text: { color: '#34d399', bg: 'rgba(52,211,153,0.16)', icon: TextIcon },
  other: { color: '#a78bfa', bg: 'rgba(167,139,250,0.16)', icon: AssignmentIcon },
};

const getStatusMeta = (status) => statusPalette[status] || statusPalette.draft;

const getFullAssetUrl = (dataItem) => {
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

const getItemMediaInfo = (dataItem = {}) => {
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

  return {
    mediaType,
    fileName,
    fileUrl: getFullAssetUrl(dataItem),
  };
};

const getLabelColor = (labelName = '') => {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const hash = String(labelName)
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[Math.abs(hash) % colors.length];
};

const extractAnnotations = (task) => {
  const source = task?.labels || task?.annotation_data || task?.annotationData || {};
  const raw =
    source?.bboxes ||
    source?.objects ||
    source?.spans ||
    source?.segments ||
    source?.sentences ||
    source?.label ||
    [];
  const arr = Array.isArray(raw) ? raw : [raw];

  return arr
    .filter(Boolean)
    .map((item) => ({
      label: typeof item === 'string' ? item : item.label || item.text || item.name || 'unknown',
      bbox: item?.bbox || item?.box || (item?.x !== undefined ? [item.x, item.y, item.x + (item.width || 0), item.y + (item.height || 0)] : null),
      start: item?.start,
      end: item?.end,
      text: item?.text || item?.sentence || null,
      note: item?.note || '',
    }));
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatCard = ({ label, value, hint, color = '#e2e8f0' }) => (
  <Card sx={softCardSx}>
    <CardContent sx={{ p: 2.2 }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          {hint}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

const DatasetChip = ({ dataset }) => {
  const palette = typePalette[dataset.type] || typePalette.other;
  return (
    <Chip
      label={`${dataset.name} • ${String(dataset.type || 'image').toUpperCase()}`}
      size="small"
      sx={{
        bgcolor: palette.bg,
        color: palette.color,
        fontWeight: 700,
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    />
  );
};

const renderImageOverlay = (item, showAnnotatorLabels, showAnnotatorLabelMap) => {
  const visibleAnnotations = (item?.annotatorLabels || []).flatMap((ann) => {
    const enabled = showAnnotatorLabels ? showAnnotatorLabelMap[ann.name] ?? true : false;
    if (!enabled) return [];
    return (ann.annotations || []).filter((x) => x?.bbox);
  });
  const formattedAnnotations = visibleAnnotations.map((ann) => {
    // ann.bbox is expected to be [x1, y1, x2, y2] in percentages (0-100)
    let bbox = Array.isArray(ann.bbox) ? ann.bbox : [0, 0, 0, 0];

    // If all values are <= 1, they might be in 0-1 range (legacy), convert to percentages
    if (bbox.length === 4 && bbox.every(val => val <= 1 && val >= 0)) {
      bbox = bbox.map(v => v * 100);
    }

    return {
      label: ann.label,
      bbox: bbox,
    };
  });

  const uniqueLabels = Array.from(new Set(formattedAnnotations.map((a) => a.label)));
  const labelSetForViewer = uniqueLabels.map((lbl) => ({
    name: lbl,
    color: getLabelColor(lbl),
  }));

  return (
    <Box sx={{ position: 'relative', width: '100%', minHeight: 420, borderRadius: 3, overflow: 'hidden', bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ImageViewer
        imageUrl={item.fileUrl}
        annotations={formattedAnnotations}
        labelSet={labelSetForViewer}
      />
    </Box>
  );
};

const ManagerProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [qualityStats, setQualityStats] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [projectInfoDialogOpen, setProjectInfoDialogOpen] = useState(false);
  const [approvedItemDialogOpen, setApprovedItemDialogOpen] = useState(false);
  const [selectedApprovedItemKey, setSelectedApprovedItemKey] = useState('');
  const [showAnnotatorLabels, setShowAnnotatorLabels] = useState(true);
  const [showAnnotatorLabelMap, setShowAnnotatorLabelMap] = useState({});
  const [textContentMap, setTextContentMap] = useState({});
  const [textContentLoadingMap, setTextContentLoadingMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectRes = await axios.get(`${API_URL}/api/projects/${id}`, { headers: getAuthHeaders() });
        const pData = projectRes.data?.project || projectRes.data || {};
        setProject(normalizeProject(pData));

        const datasetId = pData?.dataset?.id || pData?.dataset?._id || pData?.dataset_id || pData?.datasetId || null;

        const [datasetsRes, tasksRes, qualityRes] = await Promise.allSettled([
          datasetId ? axios.get(`${API_URL}/api/datasets/${datasetId}`, { headers: getAuthHeaders() }) : Promise.reject('No dataset ID'),
          axios.get(`${API_URL}/api/tasks/project/${id}`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/projects/${id}/quality`, { headers: getAuthHeaders() }),
        ]);

        let dsList = [];
        if (datasetsRes.status === 'fulfilled') {
          const dsData = datasetsRes.value.data?.dataset || datasetsRes.value.data || {};
          dsList = (dsData.id || dsData._id) ? [normalizeDataset(dsData)] : [];
          setDatasets(dsList);
        }

        if (tasksRes.status === 'fulfilled') {
          const raw = Array.isArray(tasksRes.value.data)
            ? tasksRes.value.data
            : tasksRes.value.data?.data || tasksRes.value.data?.tasks || [];

          let mappedTasks = raw.map(normalizeTask);

          // Try to enrich with assets
          try {
            const subtopicIds = dsList.flatMap(ds => {
              if (Array.isArray(ds.subtopics)) return ds.subtopics.map(st => st?.id || st);
              return ds.subtopicIds || ds.subtopic_ids || (ds.subtopicId ? [ds.subtopicId] : []) || [];
            });
            if (subtopicIds.length > 0) {
              const assetResponses = await Promise.allSettled(
                subtopicIds.map(subId => axios.get(`${API_URL}/api/subtopics/${subId}/assets`, { headers: getAuthHeaders() }))
              );
              const assetsList = assetResponses
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => Array.isArray(r.value.data) ? r.value.data : (r.value.data?.data || []));

              const assetsMap = {};
              assetsList.forEach(a => {
                if (a.id) assetsMap[a.id] = a;
                if (a.filename) assetsMap[a.filename] = a;
                if (a.original_name) assetsMap[a.original_name] = a;
              });

              mappedTasks = mappedTasks.map(t => {
                const di = t.dataItem || {};
                const key = di.id || di.filename || di.original_name || di.originalName;
                const matchedAsset = assetsMap[key] || assetsMap[di.filename] || assetsMap[di.originalName] || assetsMap[di.original_name];
                if (matchedAsset) {
                  t.dataItem = {
                    ...di,
                    ...matchedAsset,
                    originalName: matchedAsset.original_name || di.originalName,
                    mimeType: matchedAsset.mime_type || di.mimeType,
                    storageUrl: matchedAsset.storage_url || di.storageUrl,
                    signedUrl: matchedAsset.signed_url || di.signedUrl,
                  };
                }
                return t;
              });
            }
          } catch (e) {
            console.error('Assets fetch failed', e);
          }

          setTasks(mappedTasks);
        }

        if (qualityRes.status === 'fulfilled') setQualityStats(qualityRes.value.data || null);
      } catch (err) {
        console.error('Project detail fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const stats = useMemo(() => {
    const approved = tasks.filter((t) => t.status === 'approved').length;
    const inReview = tasks.filter((t) => t.status === 'submitted').length;
    const rework = tasks.filter((t) => t.status === 'rejected').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'assigned').length;
    const total = tasks.length;
    const progress = total ? Math.round((approved / total) * 100) : 0;
    const annotatorIds = new Set(tasks.map((t) => t.annotator?.id || t.annotator?.userId || t.annotator?._id).filter(Boolean));
    const reviewerIds = new Set(
      tasks.flatMap((t) => (t.reviewers || []).map((rv) => rv?.reviewerId?.id || rv?.reviewerId?._id || rv?.reviewerId).filter(Boolean))
    );
    return {
      total,
      approved,
      inReview,
      rework,
      inProgress,
      progress,
      annotators: annotatorIds.size,
      reviewers: reviewerIds.size,
    };
  }, [tasks]);

  const approvedItems = useMemo(() => {
    const approvedTasks = tasks.filter((t) => t.status === 'approved');
    const map = new Map();

    approvedTasks.forEach((task) => {
      const dataItem = task.dataItem || {};
      const key = dataItem?.id || dataItem?._id || dataItem?.filename || dataItem?.path || task.id;
      if (!key) return;

      const media = getItemMediaInfo(dataItem);
      const annotatorName =
        task.annotator?.fullName || task.annotator?.full_name || task.annotator?.username || 'Annotator';
      const annotations = extractAnnotations(task);
      const labels = Array.from(new Set(annotations.map((x) => x.label).filter(Boolean)));
      const isPrimary = Boolean(task?.primaryForItem);

      if (!map.has(key)) {
        map.set(key, {
          key,
          dataItem,
          fileName: media.fileName,
          fileUrl: media.fileUrl,
          mediaType: media.mediaType,
          datasetId: task.datasetId?.id || task.datasetId?._id || task.datasetId,
          itemId: dataItem?.id || dataItem?._id || task.id,
          annotators: [annotatorName],
          annotatorLabels: [{ name: annotatorName, labels, annotations, isPrimary }],
        });
      } else {
        const entry = map.get(key);
        if (!entry.annotators.includes(annotatorName)) entry.annotators.push(annotatorName);
        entry.annotatorLabels.push({ name: annotatorName, labels, annotations, isPrimary });
      }
    });

    return Array.from(map.values());
  }, [tasks]);

  const selectedApprovedItem = useMemo(() => {
    if (!selectedApprovedItemKey) return null;
    return approvedItems.find((x) => String(x.key) === String(selectedApprovedItemKey)) || null;
  }, [approvedItems, selectedApprovedItemKey]);

  useEffect(() => {
    const item = selectedApprovedItem;
    if (!item || item.mediaType !== 'text') return;
    const existing = textContentMap[item.key] || item.textContent || item.content || item.preview;
    if (existing || !item.fileUrl || textContentLoadingMap[item.key]) return;

    let cancelled = false;
    const run = async () => {
      try {
        setTextContentLoadingMap((prev) => ({ ...prev, [item.key]: true }));
        const resp = await axios.get(item.fileUrl, { responseType: 'text' });
        if (!cancelled) {
          setTextContentMap((prev) => ({ ...prev, [item.key]: typeof resp.data === 'string' ? resp.data : '' }));
        }
      } catch (err) {
        console.error('Load text content failed:', err);
      } finally {
        if (!cancelled) {
          setTextContentLoadingMap((prev) => ({ ...prev, [item.key]: false }));
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedApprovedItem, textContentMap, textContentLoadingMap]);

  useEffect(() => {
    if (!selectedApprovedItem) return;
    const nextMap = {};
    (selectedApprovedItem.annotatorLabels || []).forEach((ann) => {
      nextMap[ann.name] = true;
    });
    setShowAnnotatorLabelMap(nextMap);
  }, [selectedApprovedItemKey]);

  const groupedByAnnotator = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const key = task.annotator?.id || task.annotator?._id || task.annotator?.username || 'unassigned';
      const name = task.annotator?.fullName || task.annotator?.full_name || task.annotator?.username || 'Unassigned';
      if (!map.has(key)) {
        map.set(key, { id: key, name, total: 0, approved: 0, rejected: 0, inReview: 0 });
      }
      const entry = map.get(key);
      entry.total += 1;
      if (task.status === 'approved') entry.approved += 1;
      if (task.status === 'rejected') entry.rejected += 1;
      if (task.status === 'submitted') entry.inReview += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.approved - a.approved);
  }, [tasks]);

  const groupedByReviewer = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      (task.reviewers || []).forEach((rv) => {
        const rid = rv?.reviewerId?.id || rv?.reviewerId?._id || rv?.reviewerId;
        const name = rv?.reviewerId?.fullName || rv?.reviewerId?.full_name || rv?.reviewerId?.username || 'Reviewer';
        if (!rid) return;
        if (!map.has(rid)) map.set(rid, { id: rid, name, assigned: 0, approved: 0, rejected: 0, pending: 0 });
        const entry = map.get(rid);
        entry.assigned += 1;
        if (rv?.status === 'approved') entry.approved += 1;
        else if (rv?.status === 'rejected') entry.rejected += 1;
        else entry.pending += 1;
      });
    });
    return Array.from(map.values()).sort((a, b) => b.assigned - a.assigned);
  }, [tasks]);

  const renderOverview = () => (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <StatCard label="Datasets" value={datasets.length} hint="Linked to this project" color="#60a5fa" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Approved items" value={stats.approved} hint={`${stats.progress}% ready`} color="#22c55e" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="In review" value={stats.inReview} hint="Waiting reviewer" color="#f59e0b" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Rework" value={stats.rework} hint="Need correction" color="#ef4444" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>Project pipeline</Typography>
                <Chip label={`${stats.total} tasks`} sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 700 }} />
              </Box>
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>Approved progress</Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{stats.progress}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats.progress}
                    sx={{
                      height: 10,
                      borderRadius: 10,
                      bgcolor: '#0f172a',
                      '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 10 },
                    }}
                  />
                </Box>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'In progress', value: stats.inProgress, color: '#3b82f6' },
                    { label: 'In review', value: stats.inReview, color: '#f59e0b' },
                    { label: 'Approved', value: stats.approved, color: '#22c55e' },
                    { label: 'Rework', value: stats.rework, color: '#ef4444' },
                  ].map((x) => (
                    <Grid item xs={6} md={3} key={x.label}>
                      <Paper sx={{ ...softCardSx, p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>{x.label}</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: x.color }}>{x.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Datasets in this project</Typography>
              <Stack spacing={1.2}>
                {datasets.length === 0 ? (
                  <Typography sx={{ color: '#94a3b8' }}>No dataset linked.</Typography>
                ) : (
                  datasets.map((ds) => <DatasetChip key={ds.id} dataset={ds} />)
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Annotator performance</Typography>
              <Stack spacing={1.2}>
                {groupedByAnnotator.length === 0 ? (
                  <Typography sx={{ color: '#94a3b8' }}>No annotator assigned.</Typography>
                ) : (
                  groupedByAnnotator.map((ann) => {
                    const reviewed = ann.approved + ann.rejected;
                    const passRate = reviewed ? Math.round((ann.approved / reviewed) * 100) : 0;
                    return (
                      <Paper key={ann.id} sx={{ ...softCardSx, p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography fontWeight={700}>{ann.name}</Typography>
                          <Chip label={`${ann.total} tasks`} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd' }} />
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                          <Chip size="small" label={`Approved ${ann.approved}`} sx={{ bgcolor: 'rgba(34,197,94,0.16)', color: '#22c55e' }} />
                          <Chip size="small" label={`Review ${ann.inReview}`} sx={{ bgcolor: 'rgba(245,158,11,0.16)', color: '#f59e0b' }} />
                          <Chip size="small" label={`Rework ${ann.rejected}`} sx={{ bgcolor: 'rgba(239,68,68,0.16)', color: '#ef4444' }} />
                          <Chip size="small" label={`Pass ${passRate}%`} sx={{ bgcolor: 'rgba(167,139,250,0.16)', color: '#c4b5fd' }} />
                        </Stack>
                      </Paper>
                    );
                  })
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Reviewer performance</Typography>
              <Stack spacing={1.2}>
                {groupedByReviewer.length === 0 ? (
                  <Typography sx={{ color: '#94a3b8' }}>No reviewer assigned.</Typography>
                ) : (
                  groupedByReviewer.map((rev) => (
                    <Paper key={rev.id} sx={{ ...softCardSx, p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography fontWeight={700}>{rev.name}</Typography>
                        <Chip label={`${rev.assigned} assigned`} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd' }} />
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`Approved ${rev.approved}`} sx={{ bgcolor: 'rgba(34,197,94,0.16)', color: '#22c55e' }} />
                        <Chip size="small" label={`Rejected ${rev.rejected}`} sx={{ bgcolor: 'rgba(239,68,68,0.16)', color: '#ef4444' }} />
                        <Chip size="small" label={`Pending ${rev.pending}`} sx={{ bgcolor: 'rgba(245,158,11,0.16)', color: '#f59e0b' }} />
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );

  const renderItems = () => (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Approved items</Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Manager view focused on approved output, real labels, and who created each annotation.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${approvedItems.length} approved items`} sx={{ bgcolor: 'rgba(34,197,94,0.16)', color: '#22c55e', fontWeight: 700 }} />
          <Chip label={`${datasets.length} datasets`} sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd', fontWeight: 700 }} />
        </Stack>
      </Box>

      {approvedItems.length === 0 ? (
        <Paper sx={{ ...panelSx, p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#94a3b8' }}>No approved item yet</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>Once reviewer approves items, they will appear here with preview and labels.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {approvedItems.map((item) => {
            const labelSet = Array.from(new Set(item.annotatorLabels.flatMap((ann) => ann.labels).filter(Boolean)));
            const firstDataset = datasets.find((ds) => String(ds.id) === String(item.datasetId));
            const palette = typePalette[item.mediaType] || typePalette.other;
            const Icon = palette.icon;
            return (
              <Grid item xs={12} sm={6} lg={4} key={item.key}>
                <Card sx={{ ...cardSx, overflow: 'hidden' }}>
                  <Box sx={{ position: 'relative', height: 220, bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.mediaType === 'image' && item.fileUrl ? (
                      <Box component="img" src={item.fileUrl} alt={item.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Stack alignItems="center" spacing={1.2}>
                        <Icon sx={{ color: palette.color, fontSize: 40 }} />
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>{item.fileName}</Typography>
                      </Stack>
                    )}
                    <Chip
                      icon={<Icon sx={{ color: `${palette.color} !important` }} />}
                      label={item.mediaType.toUpperCase()}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        bgcolor: '#0f172a',
                        color: palette.color,
                        border: '1px solid #334155',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={800} noWrap>{item.fileName}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label={firstDataset?.name || item.datasetId || 'Unknown dataset'} sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd' }} />
                      <Chip size="small" label={`${item.annotators.length} annotator${item.annotators.length > 1 ? 's' : ''}`} sx={{ bgcolor: 'rgba(16,185,129,0.16)', color: '#6ee7b7' }} />
                      <Chip size="small" label={`${labelSet.length} labels`} sx={{ bgcolor: 'rgba(139,92,246,0.16)', color: '#c4b5fd' }} />
                    </Stack>
                    <Box sx={{ mt: 1.2, display: 'flex', gap: 0.7, flexWrap: 'wrap', minHeight: 28 }}>
                      {labelSet.slice(0, 4).map((label) => (
                        <Chip
                          key={label}
                          size="small"
                          label={label}
                          sx={{ bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      ))}
                      {labelSet.length > 4 ? <Chip size="small" label={`+${labelSet.length - 4}`} sx={{ bgcolor: '#334155', color: '#e2e8f0' }} /> : null}
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={primaryBtnSx}
                        onClick={() => {
                          setSelectedApprovedItemKey(item.key);
                          setApprovedItemDialogOpen(true);
                          setShowAnnotatorLabels(true);
                        }}
                      >
                        View detail
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );

  if (loading) {
    return (
      <Box sx={{ ...pageSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statusMeta = getStatusMeta(project?.status);

  return (
    <Box sx={pageSx}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton onClick={() => navigate('/manager/projects')} sx={{ color: '#e2e8f0', bgcolor: '#1f2937', border: '1px solid #334155' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.4rem' }, fontWeight: 900 }}>
                {project?.name}
              </Typography>
              <Typography sx={{ color: '#94a3b8', mt: 0.4 }}>
                {project?.description || 'No description'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.2} flexWrap="wrap">
            <Button sx={secondaryBtnSx} startIcon={<InfoOutlinedIcon />} onClick={() => setProjectInfoDialogOpen(true)}>
              Project info
            </Button>
            <Button sx={secondaryBtnSx} startIcon={<AssignmentIcon />} disabled>
              Analytics
            </Button>
          </Stack>
        </Box>

        <Paper sx={{ ...panelSx, p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2.2}>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <StatCard label="Team members" value={stats.annotators + stats.reviewers} hint={`${stats.annotators} annotators • ${stats.reviewers} reviewers`} color="#e2e8f0" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <StatCard label="Tasks" value={stats.total} hint={`${stats.approved} approved`} color="#e2e8f0" />
                </Grid>
                <Grid item xs={12}>
                  <Card sx={softCardSx}>
                    <CardContent sx={{ p: 2.2 }}>
                      <Typography variant="body1" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{project?.description || 'No description'}</Typography>
                      <Typography sx={{ mt: 1.2, color: '#cbd5e1' }}>
                        Deadline: <b>{formatDateTime(project?.deadline)}</b>
                      </Typography>
                      {project?.guidelines ? (
                        <Typography sx={{ mt: 0.8, color: '#93c5fd' }}>
                          Guidelines: {project.guidelines}
                        </Typography>
                      ) : null}
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {datasets.map((ds) => (
                          <DatasetChip key={ds.id} dataset={ds} />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card sx={softCardSx}>
                    <CardContent sx={{ p: 2.2 }}>
                      <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 800 }}>Project status</Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip label={statusMeta.label} sx={{ bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 800, fontSize: '0.8rem' }} />
                      </Box>
                      <Typography sx={{ mt: 2, color: '#94a3b8' }}>Approved progress</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stats.progress}
                        sx={{
                          mt: 1,
                          height: 10,
                          borderRadius: 99,
                          bgcolor: '#0f172a',
                          '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 99 },
                        }}
                      />
                      <Typography sx={{ mt: 1, color: '#e2e8f0', fontWeight: 700 }}>{stats.progress}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={panelSx}>
          <Box sx={{ borderBottom: '1px solid #243041' }}>
            <Tabs
              value={currentTab}
              onChange={(_, v) => setCurrentTab(v)}
              sx={{
                px: 2,
                '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none', fontWeight: 700 },
                '& .Mui-selected': { color: '#60a5fa' },
                '& .MuiTabs-indicator': { bgcolor: '#3b82f6' },
              }}
            >
              <Tab label="Overview" />
              <Tab label="Items" />
            </Tabs>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>{currentTab === 0 ? renderOverview() : renderItems()}</Box>
        </Paper>
      </Stack>

      <Dialog
        open={approvedItemDialogOpen}
        onClose={() => setApprovedItemDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: modalPaperSx }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #243041', fontWeight: 800 }}>Approved item detail</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {!selectedApprovedItem ? null : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                {selectedApprovedItem.mediaType === 'image' ? (
                  renderImageOverlay(selectedApprovedItem, showAnnotatorLabels, showAnnotatorLabelMap)
                ) : selectedApprovedItem.mediaType === 'audio' ? (
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0b1220', minHeight: 420 }}>
                    <AudioAnnotator
                      audioUrl={selectedApprovedItem.fileUrl}
                      labelSet={[]}
                      initialSegments={(selectedApprovedItem.annotatorLabels || []).flatMap((ann) => {
                        const enabled = showAnnotatorLabels ? showAnnotatorLabelMap[ann.name] ?? true : false;
                        if (!enabled) return [];
                        return (ann.annotations || [])
                          .filter((seg) => seg?.start !== undefined && seg?.end !== undefined)
                          .map((seg) => ({
                            id: `${ann.name}-${seg.start}-${seg.end}`,
                            start: Number(seg.start || 0),
                            end: Number(seg.end || 0),
                            label: seg.label || 'unknown',
                          }));
                      })}
                      readOnly
                      showLabelLegend={showAnnotatorLabels}
                    />
                    <Box component="audio" controls src={selectedApprovedItem.fileUrl} sx={{ width: '100%', mt: 2 }} />
                  </Box>
                ) : selectedApprovedItem.mediaType === 'text' ? (
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0b1220', minHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {textContentLoadingMap[selectedApprovedItem.key] ? 'Đang tải nội dung text...' : textContentMap[selectedApprovedItem.key] || 'Không có nội dung text.'}
                  </Box>
                ) : (
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0b1220', minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    No preview
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} md={5}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>File</Typography>
                    <Typography fontWeight={700}>{selectedApprovedItem.fileName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Item ID</Typography>
                    <Typography>{selectedApprovedItem.itemId || selectedApprovedItem.key}</Typography>
                  </Box>
                  {selectedApprovedItem.datasetId ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Dataset</Typography>
                      <Typography>{datasets.find((d) => String(d.id) === String(selectedApprovedItem.datasetId))?.name || selectedApprovedItem.datasetId}</Typography>
                    </Box>
                  ) : null}

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Approved annotators</Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showAnnotatorLabels}
                            onChange={(e) => setShowAnnotatorLabels(e.target.checked)}
                            size="small"
                          />
                        }
                        label="Show labels"
                        sx={{ color: '#94a3b8', mr: 0 }}
                      />
                    </Box>
                    <Stack spacing={1.2}>
                      {(selectedApprovedItem.annotatorLabels || []).map((ann, idx) => (
                        <Paper key={`${ann.name}-${idx}`} sx={{ ...softCardSx, p: 1.2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                            <Chip
                              label={ann.isPrimary ? `${ann.name} • PRIMARY` : ann.name}
                              sx={{
                                bgcolor: ann.isPrimary ? 'rgba(245,158,11,0.22)' : 'rgba(34,197,94,0.18)',
                                color: ann.isPrimary ? '#fbbf24' : '#22c55e',
                                fontWeight: 700,
                              }}
                            />
                            {showAnnotatorLabels ? (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={showAnnotatorLabelMap[ann.name] ?? true}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setShowAnnotatorLabelMap((prev) => ({ ...prev, [ann.name]: checked }));
                                    }}
                                    size="small"
                                  />
                                }
                                label="Visible"
                                sx={{ color: '#94a3b8', mr: 0 }}
                              />
                            ) : null}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', mt: 1 }}>
                            {(ann.labels || []).length === 0 ? (
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>No label</Typography>
                            ) : (
                              ann.labels.map((label, labelIdx) => (
                                <Chip
                                  key={`${ann.name}-${labelIdx}`}
                                  label={label}
                                  size="small"
                                  sx={{ bgcolor: getLabelColor(label), color: '#fff', fontWeight: 700 }}
                                />
                              ))
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button sx={secondaryBtnSx} onClick={() => setApprovedItemDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={projectInfoDialogOpen}
        onClose={() => setProjectInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: modalPaperSx }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #243041', fontWeight: 800 }}>Project info</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Project name</Typography>
                  <Typography fontWeight={700}>{project?.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Description</Typography>
                  <Typography>{project?.description || 'No description'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Deadline</Typography>
                  <Typography>{formatDateTime(project?.deadline)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Status</Typography>
                  <Chip label={statusMeta.label} sx={{ mt: 1, bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 800 }} />
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Datasets</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {datasets.length === 0 ? (
                      <Typography sx={{ color: '#94a3b8' }}>No dataset linked.</Typography>
                    ) : (
                      datasets.map((ds) => <DatasetChip key={ds.id} dataset={ds} />)
                    )}
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Review policy</Typography>
                  <Paper sx={{ ...softCardSx, p: 1.4, mt: 1 }}>
                    <Typography variant="body2">Mode: <b>{project?.reviewPolicy?.mode || 'full'}</b></Typography>
                    <Typography variant="body2">Reviewers/item: <b>{project?.reviewPolicy?.reviewersPerItem || project?.reviewPolicy?.reviewers_per_item || 1}</b></Typography>
                    <Typography variant="body2">Export: <b>{project?.exportFormat || 'JSON'}</b></Typography>
                  </Paper>
                </Box>
                {project?.guidelines ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Guidelines</Typography>
                    <Paper sx={{ ...softCardSx, p: 1.4, mt: 1, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>{project.guidelines}</Typography>
                    </Paper>
                  </Box>
                ) : null}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button sx={secondaryBtnSx} onClick={() => setProjectInfoDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManagerProjectDetail;
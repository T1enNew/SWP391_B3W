import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import axios from 'axios';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl, Grid,
  IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select,
  Snackbar, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  InfoOutlined as InfoOutlinedIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { API_URL } from '../../../../config/api';
import { pageSx, panelSx, cardSx, softCardSx, secondaryBtnSx } from './constants';
import {
  getAuthHeaders, normalizeProject, normalizeDataset, normalizeTask,
  getItemMediaInfo, extractAnnotations, formatDateTime,
} from './utils';
import { computeTaskStats, getDisplayStatus, getCfg } from '../projectStatusUtils';
import StatCard from './StatCard';
import DatasetChip from './DatasetChip';
import OverviewTab from './OverviewTab';
import ItemsTab from './ItemsTab';
import ApprovedItemDialog from './ApprovedItemDialog';
import ProjectInfoDialog from './ProjectInfoDialog';

const ManagerProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [tasks, setTasks] = useState([]);
  // qualityStats removed — endpoint /quality returns 500 and data is unused in UI
  const [currentTab, setCurrentTab] = useState(0);
  const [projectInfoDialogOpen, setProjectInfoDialogOpen] = useState(false);
  const [approvedItemDialogOpen, setApprovedItemDialogOpen] = useState(false);
  const [selectedApprovedItemKey, setSelectedApprovedItemKey] = useState('');
  const [showAnnotatorLabels, setShowAnnotatorLabels] = useState(true);
  const [showAnnotatorLabelMap, setShowAnnotatorLabelMap] = useState({});
  const [textContentMap, setTextContentMap] = useState({});
  const [textContentLoadingMap, setTextContentLoadingMap] = useState({});
  const [assignLoading, setAssignLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', guidelines: '', deadline: '', status: 'draft' });
  const [editSaving, setEditSaving] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [qualityStats, setQualityStats] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectRes = await axios.get(`${API_URL}/api/projects/${id}`, { headers: getAuthHeaders() });
        const pData = projectRes.data?.project || projectRes.data || {};
        setProject(normalizeProject(pData));

        const datasetId = (pData?.dataset?.id || pData?.dataset?._id) || pData?.dataset_id || pData?.datasetId || (typeof pData?.dataset === 'string' ? pData.dataset : null);

        const [datasetsRes, tasksRes] = await Promise.allSettled([
          datasetId
            ? axios.get(`${API_URL}/api/datasets/${datasetId}`, { headers: getAuthHeaders() })
            : Promise.reject('No dataset ID'),
          axios.get(`${API_URL}/api/tasks/project/${id}`, { headers: getAuthHeaders() }),
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

      } catch (err) {
        console.error('Project detail fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const stats = useMemo(() => {
    const approved   = tasks.filter((t) => t.status === 'approved').length;
    const inReview   = tasks.filter((t) => t.status === 'submitted').length;
    const rework     = tasks.filter((t) => t.status === 'rejected').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'assigned').length;
    const total      = tasks.length;
    const progress   = total ? Math.round((approved / total) * 100) : 0;
    const annotatorIds = new Set(tasks.map((t) => t.annotator?.id || t.annotator?.userId || t.annotator?._id).filter(Boolean));
    const reviewerIds  = new Set(
      tasks.flatMap((t) => (t.reviewers || []).map((rv) => rv?.reviewerId?.id || rv?.reviewerId?._id || rv?.reviewerId).filter(Boolean))
    );

    // Add project-level assigned users if tasks don't cover them all yet
    if (project?.reviewer) {
      const rid = project.reviewer.id || project.reviewer._id || project.reviewer;
      if (rid) reviewerIds.add(rid.toString());
    }
    if (Array.isArray(project?.annotators)) {
      project.annotators.forEach(id => annotatorIds.add(id.toString()));
    }

    return { total, approved, inReview, rework, inProgress, progress, annotators: annotatorIds.size, reviewers: reviewerIds.size };
  }, [tasks, project]);

  const approvedItems = useMemo(() => {
    const map = new Map();
    tasks.filter((t) => t.status === 'approved').forEach((task) => {
      const dataItem = task.dataItem || {};
      const key = dataItem?.id || dataItem?._id || dataItem?.filename || dataItem?.path || task.id;
      if (!key) return;

      const media = getItemMediaInfo(dataItem);
      const annotatorName = task.annotator?.fullName || task.annotator?.full_name || task.annotator?.username || 'Annotator';
      const annotations = extractAnnotations(task);
      const labels = Array.from(new Set(annotations.map((x) => x.label).filter(Boolean)));
      const isPrimary = Boolean(task?.primaryForItem);

      const approvedAt = task.reviewed_at || task.updated_at || null;

      const reviewers = (task.reviewers || [])
        .filter(rv => rv.status === 'approved')
        .map(rv => ({
          name: rv.reviewerId?.fullName || rv.reviewerId?.full_name || rv.reviewerId?.username || 'Reviewer',
          approvedAt: rv.reviewed_at || task.reviewed_at || null
        }));

      if (!map.has(key)) {
        map.set(key, {
          key, dataItem,
          fileName: media.fileName, fileUrl: media.fileUrl, mediaType: media.mediaType,
          datasetId: task.datasetId?.id || task.datasetId?._id || task.datasetId || datasets[0]?.id || null,
          itemId: dataItem?.id || dataItem?._id || task.id,
          taskId: task.id,
          approvedAt,
          annotators: [annotatorName],
          annotatorLabels: [{ name: annotatorName, labels, annotations, isPrimary }],
          reviewers, // Added reviewer info
        });
      } else {
        const entry = map.get(key);
        if (!entry.annotators.includes(annotatorName)) entry.annotators.push(annotatorName);
        entry.annotatorLabels.push({ name: annotatorName, labels, annotations, isPrimary });
        // Merge unique reviewers
        reviewers.forEach(r => {
          if (!entry.reviewers.some(er => er.name === r.name)) entry.reviewers.push(r);
        });
      }
    });
    return Array.from(map.values());
  }, [tasks, datasets]);

  const selectedApprovedItem = useMemo(
    () => approvedItems.find((x) => String(x.key) === String(selectedApprovedItemKey)) || null,
    [approvedItems, selectedApprovedItemKey]
  );

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
        if (!cancelled) setTextContentMap((prev) => ({ ...prev, [item.key]: typeof resp.data === 'string' ? resp.data : '' }));
      } catch (err) {
        console.error('Load text content failed:', err);
      } finally {
        if (!cancelled) setTextContentLoadingMap((prev) => ({ ...prev, [item.key]: false }));
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedApprovedItem, textContentMap, textContentLoadingMap]);

  useEffect(() => {
    if (!selectedApprovedItem) return;
    const nextMap = {};
    (selectedApprovedItem.annotatorLabels || []).forEach((ann) => { nextMap[ann.name] = true; });
    setShowAnnotatorLabelMap(nextMap);
  }, [selectedApprovedItemKey]);

  const handleReassign = async () => {
    if (!project) return;
    if (!datasets[0]) {
      setToast({ open: true, msg: 'Không tìm thấy dataset của project — vui lòng tải lại trang', severity: 'error' });
      return;
    }

    // GET /api/projects/:id không trả về annotators → fallback lấy từ tasks đã load
    let annotatorIds = (project.annotators || []).map(a => a?.id || a?._id || a).filter(Boolean);
    if (!annotatorIds.length) {
      const seen = new Set();
      tasks.forEach(t => {
        const aid = t.annotator?.id || t.annotator?._id || t.annotator?.userId;
        if (aid) seen.add(aid);
      });
      annotatorIds = Array.from(seen);
    }

    let reviewerId = project.reviewer?.id || project.reviewer?._id || project.reviewer || null;
    if (!reviewerId) {
      // Fallback: lấy reviewer đầu tiên từ tasks
      for (const t of tasks) {
        const rv = (t.reviewers || [])[0];
        const rid = rv?.reviewerId?.id || rv?.reviewerId?._id || rv?.reviewerId;
        if (rid) { reviewerId = rid; break; }
      }
    }

    if (!annotatorIds.length) {
      setToast({ open: true, msg: 'Project chưa có annotator — không thể phân công. Hãy xóa project này và tạo lại với annotator được chọn.', severity: 'warning' });
      return;
    }
    setAssignLoading(true);
    try {
      const assignPayload = {
        project_id: project.id,
        dataset_id: datasets[0].id,
        annotator_ids: annotatorIds,
        ...(reviewerId ? { reviewer_id: reviewerId } : {}),
      };
      await axios.post(`${API_URL}/api/tasks/assign`, assignPayload, { headers: getAuthHeaders() });
      setToast({ open: true, msg: 'Phân công task thành công!', severity: 'success' });
      
      // Reload data to reflect changes
      const [pRes, tRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${id}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/tasks/project/${id}`, { headers: getAuthHeaders() })
      ]);
      const pData = pRes.data?.project || pRes.data || {};
      setProject(normalizeProject(pData));
      const raw = Array.isArray(tRes.data) ? tRes.data : tRes.data?.data || tRes.data?.tasks || [];
      setTasks(raw.map(normalizeTask));
      
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Phân công task thất bại';
      if (msg.includes('No unassigned items left') || msg.includes('no unassigned items')) {
        // Thông báo chi tiết hơn để user hiểu đây không phải lỗi hệ thống mà là do dữ liệu đã hết
        setToast({ 
          open: true, 
          msg: 'Dự án đã được phân công hoàn tất! Toàn bộ dữ liệu trong dataset đã có người phụ trách. Không còn mục nào chưa gán để chia thêm cho annotator mới.', 
          severity: 'info' 
        });
      } else {
        setToast({ open: true, msg, severity: 'error' });
      }
    } finally {
      setAssignLoading(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      name: project?.name || '',
      description: project?.description || '',
      guidelines: project?.guidelines || '',
      deadline: project?.deadline ? new Date(project.deadline).toISOString().slice(0, 16) : '',
      status: project?.status || 'draft',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      setToast({ open: true, msg: 'Tên project không được để trống', severity: 'warning' }); return;
    }
    setEditSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        guidelines: editForm.guidelines.trim(),
        ...(editForm.deadline ? { deadline: new Date(editForm.deadline).toISOString() } : {}),
        status: editForm.status,
      };
      const res = await axios.put(`${API_URL}/api/projects/${id}`, payload, { headers: getAuthHeaders() });
      const updated = res.data?.project || res.data;
      setProject(prev => normalizeProject({ ...(prev || {}), ...updated }));
      setEditDialogOpen(false);
      setToast({ open: true, msg: 'Cập nhật project thành công', severity: 'success' });
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Cập nhật thất bại', severity: 'error' });
    } finally { setEditSaving(false); }
  };

  const fetchQuality = async () => {
    setQualityLoading(true);
    setQualityDialogOpen(true);
    setQualityStats(null);
    try {
      const res = await axios.get(`${API_URL}/api/projects/${id}/quality`, { headers: getAuthHeaders() });
      setQualityStats(res.data);
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Không tải được quality stats', severity: 'error' });
      setQualityDialogOpen(false);
    } finally { setQualityLoading(false); }
  };

  const handleExport = async (format = 'JSON') => {
    setExportLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/projects/${id}/export`, {
        params: { format },
        headers: getAuthHeaders(),
        responseType: 'blob',
      });
      const ext = format === 'CSV' ? 'csv' : format === 'COCO' ? 'json' : 'json';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project?.name || 'project').replace(/\s+/g, '_')}_export.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ open: true, msg: `Export ${format} thành công`, severity: 'success' });
    } catch (e) {
      setToast({ open: true, msg: e?.response?.data?.message || 'Export thất bại', severity: 'error' });
    } finally { setExportLoading(false); }
  };

  const groupedByAnnotator = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const key  = task.annotator?.id || task.annotator?._id || task.annotator?.username || 'unassigned';
      const name = task.annotator?.fullName || task.annotator?.full_name || task.annotator?.username || 'Unassigned';
      if (!map.has(key)) map.set(key, { id: key, name, total: 0, approved: 0, rejected: 0, inReview: 0 });
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
        const rid  = rv?.reviewerId?.id || rv?.reviewerId?._id || rv?.reviewerId;
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

    // Ensure project-level reviewer shows up even with 0 tasks
    if (project?.reviewer) {
      const rid = (project.reviewer.id || project.reviewer._id || project.reviewer).toString();
      if (rid && !map.has(rid)) {
        const name = project.reviewer.fullName || project.reviewer.full_name || project.reviewer.username || 'Reviewer';
        map.set(rid, { id: rid, name, assigned: 0, approved: 0, rejected: 0, pending: 0 });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.assigned - a.assigned);
  }, [tasks, project]);

  // Phải đặt trước early return để không vi phạm Rules of Hooks
  const taskStats = useMemo(() => computeTaskStats(tasks), [tasks]);
  const statusMeta = getCfg(getDisplayStatus(project ?? {}, taskStats));

  if (loading) {
    return (
      <Box sx={{ ...pageSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={pageSx}>
      <Stack spacing={3}>
        {/* ── Header ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton onClick={() => navigate('/manager/projects')} sx={{ color: '#e2e8f0', bgcolor: '#1f2937', border: '1px solid #334155' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.4rem' }, fontWeight: 900 }}>
                {project?.name}
              </Typography>
              <Typography sx={{ color: '#94a3b8', mt: 0.4 }}>{project?.description || 'No description'}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.2} flexWrap="wrap">
            <Button sx={secondaryBtnSx} startIcon={<InfoOutlinedIcon />} onClick={() => setProjectInfoDialogOpen(true)}>
              Project info
            </Button>
            <Button sx={secondaryBtnSx} startIcon={<EditIcon />} onClick={openEdit}>
              Edit
            </Button>
            <Button
              sx={secondaryBtnSx}
              startIcon={assignLoading ? <CircularProgress size={14} sx={{ color: '#e2e8f0' }} /> : <PlayArrowIcon />}
              onClick={handleReassign}
              disabled={assignLoading}
            >
              {assignLoading ? 'Đang phân công...' : 'Assign Tasks'}
            </Button>
            <Button sx={secondaryBtnSx} startIcon={<AssignmentIcon />} onClick={fetchQuality}>
              Analytics
            </Button>
            <Button
              sx={secondaryBtnSx}
              startIcon={exportLoading ? <CircularProgress size={14} sx={{ color: '#e2e8f0' }} /> : <DownloadIcon />}
              onClick={() => handleExport('JSON')}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting...' : 'Export'}
            </Button>
          </Stack>
        </Box>

        {/* ── Summary panel ── */}
        <Paper sx={{ ...panelSx, p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2.2}>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <StatCard
                    label="Team members"
                    value={stats.annotators + stats.reviewers}
                    hint={`${stats.annotators} annotators • ${stats.reviewers} reviewers`}
                    color="#e2e8f0"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <StatCard label="Tasks" value={stats.total} hint={`${stats.approved} approved`} color="#e2e8f0" />
                </Grid>
                <Grid item xs={12}>
                  <Card sx={softCardSx}>
                    <CardContent sx={{ p: 2.2 }}>
                      <Typography variant="body1" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                        {project?.description || 'No description'}
                      </Typography>
                      <Typography sx={{ mt: 1.2, color: '#cbd5e1' }}>
                        Deadline: <b>{formatDateTime(project?.deadline)}</b>
                      </Typography>
                      {project?.guidelines ? (
                        <Typography sx={{ mt: 0.8, color: '#93c5fd' }}>Guidelines: {project.guidelines}</Typography>
                      ) : null}
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {datasets.map((ds) => <DatasetChip key={ds.id} dataset={ds} />)}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
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
                    sx={{ mt: 1, height: 10, borderRadius: 99, bgcolor: '#0f172a', '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 99 } }}
                  />
                  <Typography sx={{ mt: 1, color: '#e2e8f0', fontWeight: 700 }}>{stats.progress}%</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Tabs ── */}
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
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {currentTab === 0 ? (
              <OverviewTab
                stats={stats}
                datasets={datasets}
                groupedByAnnotator={groupedByAnnotator}
                groupedByReviewer={groupedByReviewer}
              />
            ) : (
              <ItemsTab
                approvedItems={approvedItems}
                datasets={datasets}
                onViewDetail={(item) => {
                  setSelectedApprovedItemKey(item.key);
                  setApprovedItemDialogOpen(true);
                  setShowAnnotatorLabels(true);
                }}
              />
            )}
          </Box>
        </Paper>
      </Stack>

      <ApprovedItemDialog
        open={approvedItemDialogOpen}
        onClose={() => setApprovedItemDialogOpen(false)}
        selectedItem={selectedApprovedItem}
        datasets={datasets}
        showAnnotatorLabels={showAnnotatorLabels}
        setShowAnnotatorLabels={setShowAnnotatorLabels}
        showAnnotatorLabelMap={showAnnotatorLabelMap}
        setShowAnnotatorLabelMap={setShowAnnotatorLabelMap}
        textContentMap={textContentMap}
        textContentLoadingMap={textContentLoadingMap}
      />

      <ProjectInfoDialog
        open={projectInfoDialogOpen}
        onClose={() => setProjectInfoDialogOpen(false)}
        project={project}
        datasets={datasets}
        statusMeta={statusMeta}
      />

      {/* ── Edit Project Dialog ── */}
      <Dialog open={editDialogOpen} onClose={() => !editSaving && setEditDialogOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { bgcolor: '#0d1829', border: '1px solid #1e2d47', borderRadius: 3, color: '#e2e8f0' } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #1e2d47', pb: 2 }}>Chỉnh sửa project</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField fullWidth label="Tên project *" value={editForm.name}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#08121f', color: '#e2e8f0', '& fieldset': { borderColor: '#1e2d47' } }, '& .MuiInputLabel-root': { color: '#64748b' } }} />
            <TextField fullWidth label="Mô tả" multiline minRows={2} value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#08121f', color: '#e2e8f0', '& fieldset': { borderColor: '#1e2d47' } }, '& .MuiInputLabel-root': { color: '#64748b' } }} />
            <TextField fullWidth label="Guidelines" multiline minRows={2} value={editForm.guidelines}
              onChange={e => setEditForm(p => ({ ...p, guidelines: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#08121f', color: '#e2e8f0', '& fieldset': { borderColor: '#1e2d47' } }, '& .MuiInputLabel-root': { color: '#64748b' } }} />
            <TextField fullWidth type="datetime-local" label="Deadline" InputLabelProps={{ shrink: true }}
              value={editForm.deadline} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#08121f', color: '#e2e8f0', '& fieldset': { borderColor: '#1e2d47' } }, '& .MuiInputLabel-root': { color: '#64748b' } }} />
            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#08121f', color: '#e2e8f0' }, '& .MuiInputLabel-root': { color: '#64748b' } }}>
              <InputLabel>Status</InputLabel>
              <Select value={editForm.status} label="Status"
                onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                sx={{ color: '#e2e8f0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e2d47' }, '& .MuiSvgIcon-root': { color: '#64748b' } }}
                MenuProps={{ PaperProps: { sx: { bgcolor: '#0d1829', border: '1px solid #1e2d47', color: '#e2e8f0' } } }}>
                {['draft', 'active', 'in_review', 'waiting_rework', 'finalizing', 'completed', 'archived'].map(s => (
                  <MenuItem key={s} value={s} sx={{ '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' } }}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e2d47', px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editSaving} sx={{ color: '#64748b', textTransform: 'none' }}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editSaving || !editForm.name.trim()}
            startIcon={editSaving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <EditIcon />}
            sx={{ bgcolor: '#3b82f6', textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#2563eb' } }}>
            {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Quality / Analytics Dialog ── */}
      <Dialog open={qualityDialogOpen} onClose={() => setQualityDialogOpen(false)} fullWidth maxWidth="xs"
        PaperProps={{ sx: { bgcolor: '#0d1829', border: '1px solid #1e2d47', borderRadius: 3, color: '#e2e8f0' } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #1e2d47', pb: 2 }}>Quality / Analytics</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {qualityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : qualityStats ? (
            <Stack spacing={1.5}>
              {Object.entries(qualityStats).map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e2d47', pb: 1 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: 13, textTransform: 'capitalize' }}>
                    {k.replace(/_/g, ' ')}
                  </Typography>
                  <Typography sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>
                    {typeof v === 'number' && k.includes('rate') ? `${(v * 100).toFixed(1)}%` : String(v)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: '#64748b', textAlign: 'center', py: 2 }}>Không có dữ liệu</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e2d47', px: 3, py: 2 }}>
          <Button onClick={() => setQualityDialogOpen(false)} sx={{ color: '#64748b', textTransform: 'none' }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManagerProjectDetail;

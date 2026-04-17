import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  IconButton,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

const CreateProject = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    guidelines: '',
    questions: [],
    reviewPolicy: { mode: 'full', sampleRate: 1.0 },
    deadline: '',
    exportFormat: 'JSON',
  });
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [lockDatasets, setLockDatasets] = useState(false);
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [annotatorSearch, setAnnotatorSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [datasetLabelsets, setDatasetLabelsets] = useState({});
  const [loadingLabelsets, setLoadingLabelsets] = useState(false);
  const [topics, setTopics] = useState({});
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const getAuthToken = () => sessionStorage.getItem('token');
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  useEffect(() => {
    fetchUsers();
    fetchDatasets();
  }, []);

  // Refresh datasets when navigating from Datasets page
  useEffect(() => {
    if (location.state?.refreshDatasets) {
      fetchDatasets();

      if (location.state?.datasetName) {
        setFormData(prev => ({
          ...prev,
          name: location.state.datasetName,
          description: prev.description || ''
        }));
      }

      if (Array.isArray(location.state?.preselectedDatasetIds) && location.state.preselectedDatasetIds.length > 0) {
        setSelectedDatasets(location.state.preselectedDatasetIds);
        setLockDatasets(true);
      } else {
        setLockDatasets(false);
      }

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Refresh datasets when page becomes visible (user returns from Datasets page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDatasets();
      }
    };
    const handleFocus = () => {
      fetchDatasets();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Load labelsets when selectedDatasets changes
  useEffect(() => {
    if (selectedDatasets.length > 0) {
      loadDatasetLabelsets(selectedDatasets);
    } else {
      setDatasetLabelsets({});
    }
  }, [selectedDatasets]);

  const loadDatasetLabelsets = async (datasetIds) => {
    setLoadingLabelsets(true);
    console.log('loadDatasetLabelsets called with:', datasetIds);
    try {
      const results = {};
      await Promise.all(datasetIds.map(async (dsId) => {
        // Fetch fresh dataset detail to get authoritative subtopicIds
        const dsRes = await axios.get(`${API_URL}/api/datasets/${dsId}`, { headers: getAuthHeaders() });
        const ds = dsRes.data || {};
        console.log('Dataset detail:', ds.id, ds.name, 'subtopicIds:', ds.subtopicIds, 'subtopicId:', ds.subtopicId, 'topic_id:', ds.topic_id, 'subtopics:', ds.subtopics);

        // Try multiple field names for subtopic IDs
        let subtopicIds = Array.isArray(ds.subtopicIds) && ds.subtopicIds.length > 0
          ? ds.subtopicIds
          : ds.subtopicId
            ? [ds.subtopicId]
            : ds.subtopic_ids
              ? ds.subtopic_ids
              : [];

        // If still empty but topic_id exists, fetch subtopics from that topic
        if (subtopicIds.length === 0 && ds.topic_id) {
          console.log('No subtopicIds found, fetching subtopics from topic:', ds.topic_id);
          try {
            const topicRes = await axios.get(`${API_URL}/api/subtopics?topic_id=${ds.topic_id}`, { headers: getAuthHeaders() });
            const topicRaw = topicRes.data;
            const topicSubtopics = getArray(topicRaw);
            subtopicIds = topicSubtopics.map(s => s.id || s.subtopicId || s).filter(Boolean);
            console.log('Subtopics from topic:', subtopicIds);
          } catch (e) {
            console.error('Error fetching topic subtopics', ds.topic_id, e);
          }
        }

        console.log('Resolved subtopicIds:', subtopicIds);
        const subtopicInfoList = [];
        for (const stId of subtopicIds) {
          try {
            const stRes = await axios.get(`${API_URL}/api/subtopics/${stId}`, { headers: getAuthHeaders() });
            console.log('Subtopic response:', stId, stRes.data);
            // Handle both { id, name, topic: {...} } and flat response
            const stRaw = stRes.data;
            const stData = (typeof stRaw === 'object' && stRaw !== null && !Array.isArray(stRaw))
              ? stRaw
              : { id: stId, name: String(stId) };
            const topicInfo = stData.topic
              ? { id: stData.topic.id, name: stData.topic.name }
              : stData.topic_id
                ? { id: stData.topic_id, name: stData.topicName || stData.topic_name || 'Unknown Topic' }
                : null;
            const lsRes = await axios.get(`${API_URL}/api/subtopics/${stId}/labelsets`, { headers: getAuthHeaders() });
            console.log('Labelsets response for', stId, ':', lsRes.data);
            const lsRaw = lsRes.data;
            const labels = Array.isArray(lsRaw) ? lsRaw : (lsRaw?.labelsets || lsRaw?.data || []);
            subtopicInfoList.push({
              _id: stId,
              name: stData.name || stId,
              topic: topicInfo,
              labelsets: labels,
            });
          } catch (e) {
            console.error('Error loading subtopic', stId, e);
          }
        }
        results[String(dsId)] = {
          subtopicIds,
          subtopics: subtopicInfoList,
        };
      }));
      console.log('Final datasetLabelsets results:', results);
      setDatasetLabelsets(results);
    } catch (err) {
      console.error('Error loadDatasetLabelsets:', err);
      setDatasetLabelsets({});
    } finally {
      setLoadingLabelsets(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() });
      const allDatasets = getArray(res.data);
      console.log('All datasets from API:', JSON.stringify(allDatasets, null, 2));
      // Chỉ hiển thị datasets chưa có projectId (chưa được gán cho project nào)
      const unassignedDatasets = allDatasets.filter(ds => !ds.project_id || ds.project_id === null);
      console.log('Unassigned datasets:', unassignedDatasets);
      setDatasets(unassignedDatasets);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setError('Không thể tải danh sách datasets: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      const allUsers = getArray(res.data);
      setAnnotators(allUsers.filter(u => u.role === 'annotator' && u.is_active));
      setReviewers(allUsers.filter(u => u.role === 'reviewer' && u.is_active));
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Không thể tải danh sách users. Vui lòng kiểm tra kết nối.');
    }
  };


  const filteredAnnotators = annotators.filter(ann => {
    const matchSearch = annotatorSearch === '' || 
      ann.fullName?.toLowerCase().includes(annotatorSearch.toLowerCase()) ||
      ann.username?.toLowerCase().includes(annotatorSearch.toLowerCase());
    return matchSearch;
  });

  const filteredReviewers = reviewers.filter(rev => {
    const matchSearch = reviewerSearch === '' || 
      rev.fullName?.toLowerCase().includes(reviewerSearch.toLowerCase()) ||
      rev.username?.toLowerCase().includes(reviewerSearch.toLowerCase());
    return matchSearch;
  });

  const isDatasetTypeConsistent = (ds) => {
    const dsType = (ds?.type || '').toLowerCase();
    const files = Array.isArray(ds?.files) ? ds.files : [];
    if (files.length === 0) return true;

    return files.every((f) => {
      const name = (f?.originalName || f?.filename || '').toLowerCase();
      const mime = (f?.mimeType || '').toLowerCase();
      if (dsType === 'image') return mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some((ext) => name.endsWith(ext));
      if (dsType === 'audio') return mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.mp4'].some((ext) => name.endsWith(ext));
      if (dsType === 'text') return mime.startsWith('text/') || ['.txt', '.csv', '.json', '.xml'].some((ext) => name.endsWith(ext));
      return false;
    });
  };

  const validDatasets = datasets.filter((ds) => isDatasetTypeConsistent(ds));
  const selectedDatasetObjects = selectedDatasets
    .map((id) => validDatasets.find((d) => d.id === id))
    .filter(Boolean);

  const handleSaveDraft = async () => {
    if (!formData.name.trim()) {
      showNotification('Vui lòng nhập tên project', 'warning');
      return;
    }
    if (!formData.guidelines.trim()) {
      showNotification('Vui lòng nhập guidelines', 'warning');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/projects`, {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        guidelines: formData.guidelines.trim(),
        deadline: formData.deadline || undefined,
        export_format: formData.exportFormat || 'JSON',
        review_policy: {
          mode: formData.reviewPolicy?.mode || 'full',
          sample_rate: formData.reviewPolicy?.sampleRate || 1,
          reviewers_per_item: formData.reviewPolicy?.reviewersPerItem || 1,
        },
      }, { headers: getAuthHeaders() });
      showNotification('Đã lưu draft thành công!');
      navigate('/manager/projects');
    } catch (error) {
      console.error('Error saving draft:', error);
      showNotification('Lỗi khi lưu draft: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async () => {
    // Validation
    if (!formData.name.trim()) {
      showNotification('Vui lòng nhập tên project', 'warning');
      return;
    }
    if (!formData.guidelines.trim()) {
      showNotification('Vui lòng nhập guidelines', 'warning');
      return;
    }
    if (selectedDatasets.length === 0) {
      showNotification('Vui lòng chọn 1 dataset');
      return;
    }
    if (selectedAnnotators.length === 0) {
      showNotification('Vui lòng chọn ít nhất một annotator');
      return;
    }
    if (selectedAnnotators.length % 2 === 0) {
      showNotification('Số annotator phải là số lẻ (1, 3, 5, ...). Vui lòng bỏ bớt hoặc thêm 1 annotator.');
      return;
    }
    if (selectedReviewers.length === 0) {
      showNotification('Vui lòng chọn ít nhất một reviewer');
      return;
    }
    if (selectedReviewers.length % 2 === 0) {
      showNotification('Số reviewer phải là số lẻ (1, 3, 5, ...). Vui lòng bỏ bớt hoặc thêm 1 reviewer.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Step 1: Create project WITH team members AND dataset info embedded
      const projectRes = await axios.post(`${API_URL}/api/projects`, {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        guidelines: formData.guidelines.trim(),
        deadline: formData.deadline || undefined,
        export_format: formData.exportFormat || 'JSON',
        review_policy: {
          mode: formData.reviewPolicy?.mode || 'full',
          sample_rate: formData.reviewPolicy?.sampleRate || 1,
          reviewers_per_item: formData.reviewPolicy?.reviewersPerItem || 1,
        },
        // Send annotator/reviewer IDs so ProjectDetail can read them
        annotator_ids: selectedAnnotators,
        reviewer_ids: selectedReviewers,
        // Send dataset IDs for ProjectDetail to display
        dataset_ids: selectedDatasets,
      }, { headers: getAuthHeaders() });
      const projectRaw = projectRes.data;
      const projectData = projectRaw?.project || projectRaw;
      const projectId = projectData?.id;
      if (!projectId) throw new Error('Tao project that bai — server khong tra ve id');

      // Step 2: Assign tasks for each selected dataset
      for (const datasetId of selectedDatasets) {
        // Fetch dataset items to satisfy backend requirement
        let itemIds = [];
        try {
          const dsDetail = await axios.get(`${API_URL}/api/datasets/${datasetId}`, { headers: getAuthHeaders() });
          const dsData = dsDetail.data || {};
          console.log('Dataset detail for items:', JSON.stringify(dsData, null, 2));
          // Try all possible field names for items
          const rawItems =
            dsData.data_items ||
            dsData.items ||
            dsData.assets ||
            dsData.lib_data_item_list ||
            (Array.isArray(dsData) ? dsData : []) ||
            [];
          itemIds = (Array.isArray(rawItems) ? rawItems : []).map(it => {
            if (typeof it === 'string') return it;
            return it?.id || it?._id || it?.dataItemId || it?.assetId || null;
          }).filter(Boolean);
          console.log('Resolved itemIds:', itemIds);

          // If still empty, try fetching from subtopic assets
          if (!itemIds.length) {
            const subtopicId = dsData.subtopicId || (Array.isArray(dsData.subtopicIds) ? dsData.subtopicIds[0] : null);
            if (subtopicId) {
              const assetRes = await axios.get(`${API_URL}/api/subtopics/${subtopicId}/assets`, { headers: getAuthHeaders() });
              const assets = Array.isArray(assetRes.data) ? assetRes.data : [];
              itemIds = assets.map(a => a.id || a.assetId || a.dataItemId || null).filter(Boolean);
              console.log('ItemIds from subtopic assets:', itemIds);
            }
          }
        } catch (e) {
          console.error('Error fetching dataset items:', e);
        }

        // Validate annotator IDs are UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validAnnotatorIds = selectedAnnotators.filter(id => uuidRegex.test(String(id)));

        if (validAnnotatorIds.length === 0) {
          throw new Error('Annotator không hợp lệ. Vui lòng chọn annotator từ danh sách.');
        }

        if (itemIds.length === 0) {
          // No items in dataset — skip task creation but still create project
          console.warn('Dataset has no items, skipping task assignment for:', datasetId);
          continue;
        }

        // Create one task per selected annotator
        for (const annotatorId of validAnnotatorIds) {
          await axios.post(`${API_URL}/api/tasks/assign`, {
            project_id: projectId,
            dataset_id: datasetId,
            annotator_id: annotatorId,
            reviewer_ids: selectedReviewers,
            data_item_ids: itemIds,
          }, { headers: getAuthHeaders() });
        }
      }

      // Ensure project has annotator/reviewer IDs and dataset info saved
      try {
        await axios.put(`${API_URL}/api/projects/${projectId}`, {
          annotator_ids: selectedAnnotators,
          reviewer_ids: selectedReviewers,
          dataset_ids: selectedDatasets,
        }, { headers: getAuthHeaders() });
      } catch (updateErr) {
        console.warn('Could not update project with team/dataset info:', updateErr.message);
      }

      showNotification('Tạo project và phân công thành công!');
      navigate(`/manager/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
      let errorMsg = 'Có lỗi xảy ra';

      if (error.response) {
        console.error('Error response data:', error.response.data, 'Status:', error.response.status);
        if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
          errorMsg = error.response.data.errors.map(e => e.msg || e.message).join(', ');
        } else if (error.response.data?.message) {
          errorMsg = error.response.data.message;
        } else {
          errorMsg = `${error.response.statusText} (${error.response.status})`;
        }
      } else if (error.request) {
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối.';
      } else {
        errorMsg = error.message || 'Có lỗi xảy ra';
      }

      setError(`Lỗi: ${errorMsg}`);
      showNotification(`Lỗi khi tạo project: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };


  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', minHeight: '100vh', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/manager/projects')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Create New Project</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={handleSaveDraft} disabled={saving}>
            Save Draft
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {saving ? 'Đang tạo...' : 'Create Project'}
          </Button>
        </Box>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Form - All in One Page */}
      <Paper
        sx={{
          p: 4,
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 3,
          color: '#e2e8f0',
          '& .MuiTypography-root': { color: '#e2e8f0' },
          '& .MuiInputLabel-root': { color: '#94a3b8' },
          '& .MuiOutlinedInput-root': {
            color: '#e2e8f0',
            backgroundColor: '#0f172a',
            '& fieldset': { borderColor: '#475569' },
            '&:hover fieldset': { borderColor: '#64748b' },
            '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
          },
          '& .MuiSelect-icon': { color: '#94a3b8' },
          '& .MuiCard-root': {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            color: '#e2e8f0',
          },
        }}
      >
        <Grid container spacing={4}>
          {/* Left Column - Project Details & Dataset */}
          <Grid item xs={12} md={7}>
            {/* Project Basic Info */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Project Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Project Name *"
                    placeholder="e.g., Medical Image Labeling Q4"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    placeholder="Explain the objective of this project..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={5}
                    label="Guidelines *"
                    placeholder="Provide detailed guidelines for annotators..."
                    value={formData.guidelines}
                    onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    helperText="Set project deadline (optional)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Export Format</InputLabel>
                    <Select
                      value={formData.exportFormat}
                      onChange={(e) => setFormData({ ...formData, exportFormat: e.target.value })}
                      label="Export Format"
                    >
                      <MenuItem value="JSON">JSON (Default)</MenuItem>
                      <MenuItem value="YOLO">YOLO</MenuItem>
                      <MenuItem value="VOC">VOC (Pascal VOC)</MenuItem>
                      <MenuItem value="COCO">COCO</MenuItem>
                      <MenuItem value="CSV">CSV</MenuItem>
                    </Select>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      Format for exporting labeled data
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Labels Info */}
            <Box sx={{ mb: 4, p: 2, borderRadius: 2, bgcolor: 'rgba(59,130,246,0.08)', border: '1px solid #3b82f6' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#60a5fa', mb: 1.5 }}>
                Labels tu Dataset → Subtopic → LabelSet
              </Typography>
              {selectedDatasets.length === 0 ? (
                <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Chon dataset de xem thong tin labels.
                </Typography>
              ) : loadingLabelsets ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#60a5fa' }} />
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Dang tai labels...</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {selectedDatasets.map(dsId => {
                    // Normalize key — IDs might be string or number
                    const strId = String(dsId);
                    const numId = Number(dsId);
                    const info = datasetLabelsets[strId] || datasetLabelsets[numId] || datasetLabelsets[dsId] || {};
                    const ds = datasets.find(d => d.id === dsId || d.id === strId || d.id === numId);
                    return (
                      <Box key={dsId} sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #334155', bgcolor: '#0f172a' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#e2e8f0' }}>{ds?.name || dsId}</Typography>
                          <Chip label={(ds?.type || 'image').toUpperCase()} size="small" sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: '0.65rem', height: 18 }} />
                        </Box>
                        {info.subtopics && info.subtopics.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {info.subtopics.map((sub) => (
                              <Box key={sub.id} sx={{ p: 1.2, borderRadius: 1, border: '1px solid #334155', bgcolor: '#1e293b' }}>
                                {sub.topic && (
                                  <Typography variant="caption" sx={{ color: '#a78bfa', fontWeight: 600, display: 'block', mb: 0.3 }}>
                                    Topic: {sub.topic.name || sub.topic}
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                                  <Typography variant="body2" fontWeight={700} sx={{ color: '#e2e8f0' }}>{sub.name}</Typography>
                                </Box>
                                {sub.labelsets && sub.labelsets.length > 0 ? (
                                  <Box sx={{ pl: 1.5 }}>
                                    {sub.labelsets.map((ls, lsIdx) => (
                                      <Box key={ls.id || lsIdx} sx={{ mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight={600} sx={{ color: '#60a5fa' }}>
                                          LabelSet: {ls.name}
                                        </Typography>
                                        {ls.labels && ls.labels.length > 0 && (
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.3, pl: 1 }}>
                                            {ls.labels.map((lbl, lIdx) => (
                                              <Chip
                                                key={lbl.id || lIdx}
                                                label={lbl.name || lbl}
                                                size="small"
                                                sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontWeight: 600, fontSize: '0.65rem', height: 18 }}
                                              />
                                            ))}
                                          </Box>
                                        )}
                                      </Box>
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" sx={{ color: '#f87171', pl: 1.5, fontStyle: 'italic' }}>
                                    Khong co LabelSet nao
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#f87171', pl: 2 }}>
                            Khong co Subtopic nao. Dam bao Dataset da duoc gan Subtopic co LabelSet trong Topics.
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Dataset Selection */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  Chọn Dataset *
                </Typography>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={fetchDatasets}
                  variant="outlined"
                >
                  Refresh
                </Button>
              </Box>
              {lockDatasets && selectedDatasetObjects.length > 0 ? (
                <Box sx={{ mt: 1 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Datasets đã được chọn sẵn từ bước tạo dataset. Project này sẽ dùng {selectedDatasetObjects.length} dataset bên dưới.
                  </Alert>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {selectedDatasetObjects.map((ds) => (
                      <Box key={ds.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, border: '1px solid #334155', borderRadius: 2, bgcolor: '#0f172a' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{ds.name}</Typography>
                          <Chip label={(ds.type || 'unknown').toUpperCase()} size="small" sx={{ bgcolor: '#1d4ed8', color: '#dbeafe' }} />
                        </Box>
                        <Chip label={`${ds.totalItems || 0} files`} size="small" />
                      </Box>
                    ))}
                    <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                      Chi 1 dataset duoc phep chon cho 1 project.
                    </Typography>
                  </Box>
                  <Button size="small" sx={{ mt: 2, textTransform: 'none' }} onClick={() => setLockDatasets(false)}>
                    Chọn dataset khác
                  </Button>
                </Box>
              ) : (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Chọn Dataset *</InputLabel>
                    <Select
                      value={selectedDatasets[0] || ''}
                      onChange={(e) => setSelectedDatasets(e.target.value ? [e.target.value] : [])}
                      label="Chọn Dataset *"
                    >
                      {validDatasets.length === 0 ? (
                        <MenuItem disabled>
                          <Typography variant="body2" color="textSecondary">
                            Không có dataset hợp lệ để chọn.
                          </Typography>
                        </MenuItem>
                      ) : (
                        validDatasets.map((dataset) => (
                          <MenuItem key={dataset.id} value={dataset.id}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{dataset.name}</span>
                                <Chip label={(dataset.type || 'unknown').toUpperCase()} size="small" sx={{ bgcolor: '#1d4ed8', color: '#dbeafe' }} />
                              </Box>
                              <Chip label={`${dataset.totalItems || 0} files`} size="small" sx={{ ml: 1 }} />
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>

                </>
              )}
              {datasets.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Chưa có dataset nào. Vui lòng{' '}
                  <Button 
                    size="small" 
                    onClick={() => navigate('/manager/datasets')}
                    sx={{ textTransform: 'none' }}
                  >
                    tạo dataset trước
                  </Button>
                </Alert>
              )}
            </Box>
          </Grid>

          {/* Right Column - Team Assignment */}
          <Grid item xs={12} md={5}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              Team Assignment
            </Typography>
            
            <Grid container spacing={3}>
              {/* Annotators */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Annotators</Typography>
                      <Chip label={`${selectedAnnotators.length} Selected`} color="primary" size="small" />
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search by name..."
                      value={annotatorSearch}
                      onChange={(e) => setAnnotatorSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                      {filteredAnnotators.length === 0 ? (
                        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                          {annotators.length === 0 
                            ? 'Chưa có annotator nào. Vui lòng tạo annotator trước.' 
                            : 'Không tìm thấy annotator.'}
                        </Typography>
                      ) : (
                        filteredAnnotators.map((ann) => {
                          const isSelected = selectedAnnotators.includes(ann.id);
                          return (
                            <Box
                              key={ann.id}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                bgcolor: isSelected ? 'action.selected' : 'background.paper',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAnnotators(selectedAnnotators.filter(id => id !== ann.id));
                                } else {
                                  setSelectedAnnotators([...selectedAnnotators, ann.id]);
                                }
                              }}
                            >
                              <Checkbox checked={isSelected} size="small" />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2">
                                  {ann.fullName || ann.username}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {ann.email}
                                </Typography>
                              </Box>
                              <Chip label="Active" color="success" size="small" />
                            </Box>
                          );
                        })
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Reviewers */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Reviewers</Typography>
                      <Chip label={`${selectedReviewers.length} Selected`} color="success" size="small" />
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search by name..."
                      value={reviewerSearch}
                      onChange={(e) => setReviewerSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                      {filteredReviewers.length === 0 ? (
                        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                          {reviewers.length === 0 
                            ? 'Chưa có reviewer nào. Vui lòng tạo reviewer trước.' 
                            : 'Không tìm thấy reviewer.'}
                        </Typography>
                      ) : (
                        filteredReviewers.map((rev) => {
                          const isSelected = selectedReviewers.includes(rev.id);
                          return (
                            <Box
                              key={rev.id}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                bgcolor: isSelected ? 'action.selected' : 'background.paper',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedReviewers(selectedReviewers.filter(id => id !== rev.id));
                                } else {
                                  setSelectedReviewers([...selectedReviewers, rev.id]);
                                }
                              }}
                            >
                              <Checkbox checked={isSelected} size="small" />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2">
                                  {rev.fullName || rev.username}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {rev.email}
                                </Typography>
                              </Box>
                              <Chip label="Active" color="success" size="small" />
                            </Box>
                          );
                        })
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Tasks will be automatically distributed among the selected {selectedAnnotators.length} annotator(s) 
              and reviewed by {selectedReviewers.length} reviewer(s).
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%', mt: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateProject;

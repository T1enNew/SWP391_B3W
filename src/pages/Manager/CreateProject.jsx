import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

const CreateProject = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    guidelines: '',
    deadline: '',
    exportFormat: 'JSON',
    reviewPolicy: {
      mode: 'full',
      sampleRate: 1,
      reviewersPerItem: 1,
    },
  });

  const [datasets, setDatasets] = useState([]);
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers] = useState([]);

  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  const [annotatorSearch, setAnnotatorSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lockDatasets, setLockDatasets] = useState(false);
  const [error, setError] = useState('');
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
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const normalizeId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return (
      value.id ||
      value._id ||
      value.user_id ||
      value.dataset_id ||
      value.subtopic_id ||
      value.assetId ||
      value.dataItemId ||
      null
    );
  };

  const normalizeUser = (u) => ({
    ...u,
    id: u?.id || u?._id || u?.user_id,
    fullName: u?.fullName || u?.full_name || u?.name || u?.username || '',
    email: u?.email || '',
    role: u?.role || '',
    is_active:
      typeof u?.is_active === 'boolean'
        ? u.is_active
        : typeof u?.isActive === 'boolean'
        ? u.isActive
        : true,
  });

  const normalizeDataset = (d) => ({
    ...d,
    id: d?.id || d?._id || d?.dataset_id,
    name: d?.name || d?.dataset_name || 'Untitled Dataset',
    description: d?.description || '',
    type: d?.type || d?.dataset_type || '',
    project_id: d?.project_id || d?.projectId || null,
  });

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');

    try {
      const [usersRes, datasetsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/api/datasets`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const userList = getArray(usersRes.data).map(normalizeUser);
      const datasetList = getArray(datasetsRes.data).map(normalizeDataset);

      setAnnotators(
        userList.filter(
          (u) =>
            String(u.role).toLowerCase() === 'annotator' &&
            u.is_active &&
            !!u.id
        )
      );

      setReviewers(
        userList.filter(
          (u) =>
            String(u.role).toLowerCase() === 'reviewer' &&
            u.is_active &&
            !!u.id
        )
      );

      setDatasets(datasetList.filter((d) => !d.project_id && !!d.id));
    } catch (err) {
      console.error('fetchInitialData error:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không tải được dữ liệu ban đầu'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (location.state?.refreshDatasets) {
      fetchInitialData();

      if (
        Array.isArray(location.state?.preselectedDatasetIds) &&
        location.state.preselectedDatasetIds.length > 0
      ) {
        setSelectedDatasets(location.state.preselectedDatasetIds);
        setLockDatasets(true);
      } else {
        setLockDatasets(false);
      }

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const filteredAnnotators = useMemo(() => {
    const q = annotatorSearch.trim().toLowerCase();
    if (!q) return annotators;

    return annotators.filter((u) => {
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [annotatorSearch, annotators]);

  const filteredReviewers = useMemo(() => {
    const q = reviewerSearch.trim().toLowerCase();
    if (!q) return reviewers;

    return reviewers.filter((u) => {
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [reviewerSearch, reviewers]);

  const selectedDatasetObjects = useMemo(() => {
    return selectedDatasets
      .map((id) => datasets.find((d) => String(d.id) === String(normalizeId(id))))
      .filter(Boolean);
  }, [selectedDatasets, datasets]);

  const handleDatasetToggle = (dataset) => {
    if (lockDatasets) return;

    const datasetId = normalizeId(dataset);
    if (!datasetId) return;

    setSelectedDatasets((prev) => {
      const exists = prev.some((id) => String(normalizeId(id)) === String(datasetId));
      if (exists) {
        return prev.filter((id) => String(normalizeId(id)) !== String(datasetId));
      }
      return [datasetId];
    });
  };

  const handleAnnotatorToggle = (user) => {
    const userId = normalizeId(user);
    if (!userId) return;

    setSelectedAnnotators((prev) => {
      const exists = prev.some((id) => String(normalizeId(id)) === String(userId));
      if (exists) {
        return prev.filter((id) => String(normalizeId(id)) !== String(userId));
      }
      return [...prev, userId];
    });
  };

  const handleReviewerToggle = (user) => {
    const userId = normalizeId(user);
    if (!userId) return;

    setSelectedReviewers((prev) => {
      const exists = prev.some((id) => String(normalizeId(id)) === String(userId));
      if (exists) {
        return prev.filter((id) => String(normalizeId(id)) !== String(userId));
      }
      return [...prev, userId];
    });
  };

  const validateBeforeCreate = () => {
    if (!formData.name.trim()) {
      showNotification('Vui lòng nhập tên project', 'warning');
      return false;
    }

    if (!formData.guidelines.trim()) {
      showNotification('Vui lòng nhập guidelines', 'warning');
      return false;
    }

    const datasetId = normalizeId(selectedDatasets[0]);
    if (!datasetId) {
      showNotification('Vui lòng chọn 1 dataset hợp lệ', 'warning');
      return false;
    }

    const annotatorIds = selectedAnnotators.map(normalizeId).filter(Boolean);
    if (!annotatorIds.length) {
      showNotification('Vui lòng chọn ít nhất một annotator', 'warning');
      return false;
    }

    const reviewerIds = selectedReviewers.map(normalizeId).filter(Boolean);
    if (!reviewerIds.length) {
      showNotification('Vui lòng chọn ít nhất một reviewer', 'warning');
      return false;
    }

    return true;
  };

  const extractDataItemIds = async (datasetId) => {
    const dsRes = await axios.get(`${API_URL}/api/datasets/${datasetId}`, {
      headers: getAuthHeaders(),
    });

    const dsData = dsRes.data || {};
    console.log('DATASET DETAIL =', dsData);

    let rawItems =
      dsData.data_items ||
      dsData.items ||
      dsData.assets ||
      dsData.lib_data_item_list ||
      dsData.data ||
      [];

    if (!Array.isArray(rawItems) && Array.isArray(dsData)) {
      rawItems = dsData;
    }

    let dataItemIds = (Array.isArray(rawItems) ? rawItems : [])
      .map((it) => {
        if (typeof it === 'string') return it;
        return (
          it?.id ||
          it?._id ||
          it?.dataItemId ||
          it?.assetId ||
          it?.data_item_id ||
          null
        );
      })
      .filter(Boolean);

    if (!dataItemIds.length) {
      const subtopicIds =
        dsData.subtopicIds ||
        dsData.subtopic_ids ||
        (dsData.subtopicId ? [dsData.subtopicId] : []) ||
        [];

      if (Array.isArray(subtopicIds) && subtopicIds.length > 0) {
        for (const subtopicId of subtopicIds) {
          try {
            const assetRes = await axios.get(
              `${API_URL}/api/subtopics/${subtopicId}/assets`,
              {
                headers: getAuthHeaders(),
              }
            );

            const assets = Array.isArray(assetRes.data)
              ? assetRes.data
              : assetRes.data?.data || assetRes.data?.assets || [];

            const assetIds = assets
              .map((a) => a?.id || a?._id || a?.assetId || a?.dataItemId || null)
              .filter(Boolean);

            dataItemIds = [...dataItemIds, ...assetIds];
          } catch (subErr) {
            console.warn(`Cannot load assets for subtopic ${subtopicId}:`, subErr);
          }
        }
      }
    }

    dataItemIds = [...new Set(dataItemIds)];

    console.log('RESOLVED DATA ITEM IDS =', dataItemIds);

    return dataItemIds;
  };

  const handleCreateProject = async () => {
    if (!validateBeforeCreate()) return;

    setSaving(true);
    setError('');

    try {
      const datasetId = normalizeId(selectedDatasets[0]);
      const annotatorIds = selectedAnnotators.map(normalizeId).filter(Boolean);
      const reviewerIds = selectedReviewers.map(normalizeId).filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        guidelines: formData.guidelines.trim(),
        deadline: formData.deadline || undefined,
        export_format: formData.exportFormat || 'JSON',
        review_policy: {
          mode: formData.reviewPolicy?.mode || 'full',
          sample_rate: Number(formData.reviewPolicy?.sampleRate || 1),
          reviewers_per_item: Number(formData.reviewPolicy?.reviewersPerItem || 1),
        },
        dataset_id: datasetId,
        annotator_ids: annotatorIds,
        reviewer_ids: reviewerIds,
      };

      console.log('selectedDatasets raw =', selectedDatasets);
      console.log('selectedAnnotators raw =', selectedAnnotators);
      console.log('selectedReviewers raw =', selectedReviewers);
      console.log('CREATE PROJECT PAYLOAD =', payload);

      const res = await axios.post(`${API_URL}/api/projects`, payload, {
        headers: getAuthHeaders(),
      });

      console.log('CREATE PROJECT RESPONSE =', res.data);

      const raw = res.data;
      const project = raw?.project || raw;
      const projectId = project?.id || project?._id;

      if (!projectId) {
        throw new Error('Tạo project thất bại - server không trả về id');
      }

      const dataItemIds = await extractDataItemIds(datasetId);

      if (!dataItemIds.length) {
        throw new Error(
          'Project đã tạo nhưng dataset chưa có data item/image để assign task'
        );
      }

      for (const annotatorId of annotatorIds) {
        const assignPayload = {
          project_id: projectId,
          dataset_id: datasetId,
          annotator_id: annotatorId,
          reviewer_ids: reviewerIds,
          data_item_ids: dataItemIds,
        };

        console.log('ASSIGN TASK PAYLOAD =', assignPayload);

        await axios.post(`${API_URL}/api/tasks/assign`, assignPayload, {
          headers: getAuthHeaders(),
        });
      }

      showNotification('Tạo project và phân công thành công!', 'success');
      navigate(`/manager/projects/${projectId}`);
    } catch (err) {
      console.error('handleCreateProject error:', err);

      let errorMsg = 'Có lỗi xảy ra';
      if (Array.isArray(err?.response?.data?.errors)) {
        errorMsg = err.response.data.errors
          .map((e) => e?.msg || e?.message)
          .filter(Boolean)
          .join(', ');
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }

      setError(`Lỗi khi tạo project/assign task: ${errorMsg}`);
      showNotification(`Lỗi khi tạo project/assign task: ${errorMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

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
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        guidelines: formData.guidelines.trim(),
        deadline: formData.deadline || undefined,
        export_format: formData.exportFormat || 'JSON',
        review_policy: {
          mode: formData.reviewPolicy?.mode || 'full',
          sample_rate: Number(formData.reviewPolicy?.sampleRate || 1),
          reviewers_per_item: Number(formData.reviewPolicy?.reviewersPerItem || 1),
        },
      };

      await axios.post(`${API_URL}/api/projects`, payload, {
        headers: getAuthHeaders(),
      });

      showNotification('Lưu draft thành công!', 'success');
      navigate('/manager/projects');
    } catch (err) {
      console.error('handleSaveDraft error:', err);

      const errorMsg =
        err?.response?.data?.message || err?.message || 'Không thể lưu draft';

      setError(`Lỗi: ${errorMsg}`);
      showNotification(`Lỗi khi lưu draft: ${errorMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 1400,
        mx: 'auto',
        minHeight: '100vh',
        bgcolor: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => navigate('/manager/projects')}
            sx={{ color: '#e2e8f0' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>
            Create Project
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleSaveDraft}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Save Draft
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {saving ? 'Đang tạo...' : 'Create Project'}
          </Button>
        </Box>
      </Box>

      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: 4,
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 4,
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
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight={700}>
              Thông tin project
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tên project"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Deadline"
              InputLabelProps={{ shrink: true }}
              value={formData.deadline}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, deadline: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mô tả"
              multiline
              minRows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Guidelines"
              multiline
              minRows={4}
              value={formData.guidelines}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, guidelines: e.target.value }))
              }
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                label="Export Format"
                value={formData.exportFormat}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    exportFormat: e.target.value,
                  }))
                }
              >
                <MenuItem value="JSON">JSON</MenuItem>
                <MenuItem value="COCO">COCO</MenuItem>
                <MenuItem value="YOLO">YOLO</MenuItem>
                <MenuItem value="CSV">CSV</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Review Mode</InputLabel>
              <Select
                label="Review Mode"
                value={formData.reviewPolicy.mode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reviewPolicy: {
                      ...prev.reviewPolicy,
                      mode: e.target.value,
                    },
                  }))
                }
              >
                <MenuItem value="full">Full</MenuItem>
                <MenuItem value="sample">Sample</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              label="Sample Rate"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
              value={formData.reviewPolicy.sampleRate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reviewPolicy: {
                    ...prev.reviewPolicy,
                    sampleRate: e.target.value,
                  },
                }))
              }
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              label="Reviewers / item"
              inputProps={{ min: 1, step: 1 }}
              value={formData.reviewPolicy.reviewersPerItem}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reviewPolicy: {
                    ...prev.reviewPolicy,
                    reviewersPerItem: e.target.value,
                  },
                }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                mb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Chọn dataset
              </Typography>

              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchInitialData}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                Refresh
              </Button>
            </Box>

            <Grid container spacing={2}>
              {datasets.map((dataset) => {
                const checked = selectedDatasets.some(
                  (id) => String(normalizeId(id)) === String(dataset.id)
                );

                return (
                  <Grid item xs={12} md={6} lg={4} key={dataset.id}>
                    <Card
                      onClick={() => handleDatasetToggle(dataset.id)}
                      sx={{
                        cursor: lockDatasets ? 'not-allowed' : 'pointer',
                        border: checked
                          ? '1px solid #3b82f6'
                          : '1px solid #334155',
                        bgcolor: '#111827',
                        color: '#e2e8f0',
                        opacity: lockDatasets && !checked ? 0.6 : 1,
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography fontWeight={700}>
                              {dataset.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: '#94a3b8', mt: 0.5 }}
                            >
                              {dataset.description || 'Không có mô tả'}
                            </Typography>
                          </Box>
                          <Checkbox checked={checked} />
                        </Box>

                        {dataset.type ? (
                          <Chip size="small" label={dataset.type} sx={{ mt: 1 }} />
                        ) : null}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {selectedDatasetObjects.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Dataset đã chọn
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedDatasetObjects.map((dataset) => (
                  <Chip
                    key={dataset.id}
                    label={dataset.name}
                    deleteIcon={<DeleteIcon />}
                    onDelete={
                      lockDatasets
                        ? undefined
                        : () => handleDatasetToggle(dataset.id)
                    }
                  />
                ))}
              </Box>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Chọn annotator
            </Typography>

            <TextField
              fullWidth
              placeholder="Tìm annotator..."
              value={annotatorSearch}
              onChange={(e) => setAnnotatorSearch(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} />,
              }}
            />

            <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
              {filteredAnnotators.map((user) => {
                const checked = selectedAnnotators.some(
                  (id) => String(normalizeId(id)) === String(user.id)
                );

                return (
                  <Card
                    key={user.id}
                    sx={{
                      mb: 1,
                      bgcolor: '#111827',
                      border: '1px solid #334155',
                    }}
                  >
                    <CardContent
                      sx={{
                        py: '12px !important',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>
                          {user.fullName || user.username || user.email}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          {user.email}
                        </Typography>
                      </Box>

                      <Checkbox
                        checked={checked}
                        onChange={() => handleAnnotatorToggle(user.id)}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Chọn reviewer
            </Typography>

            <TextField
              fullWidth
              placeholder="Tìm reviewer..."
              value={reviewerSearch}
              onChange={(e) => setReviewerSearch(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} />,
              }}
            />

            <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
              {filteredReviewers.map((user) => {
                const checked = selectedReviewers.some(
                  (id) => String(normalizeId(id)) === String(user.id)
                );

                return (
                  <Card
                    key={user.id}
                    sx={{
                      mb: 1,
                      bgcolor: '#111827',
                      border: '1px solid #334155',
                    }}
                  >
                    <CardContent
                      sx={{
                        py: '12px !important',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>
                          {user.fullName || user.username || user.email}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          {user.email}
                        </Typography>
                      </Box>

                      <Checkbox
                        checked={checked}
                        onChange={() => handleReviewerToggle(user.id)}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() =>
          setNotification((prev) => ({ ...prev, open: false }))
        }
        message={notification.message}
      />
    </Box>
  );
};

export default CreateProject;
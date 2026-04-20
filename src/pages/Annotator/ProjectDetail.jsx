import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeTask = (t) => {
  const projectId = t?.project_id || t?.projectId || t?.project?.id || null;

  const dataItem = t?.data_item || t?.dataItem || null;

  const subtopicId =
    t?.subtopic_id ||
    t?.subtopicId ||
    dataItem?.subtopic_id ||
    dataItem?.subtopicId ||
    dataItem?.subtopic?.id ||
    dataItem?.subtopic?.subtopic_id ||
    null;

  return {
    ...t,
    id: t?.id || t?._id,
    projectId,
    dataItem,
    subtopicId,
    status: t?.status || 'assigned',
  };
};

const normalizeProject = (raw) => {
  const p = raw?.project || raw || {};

  const rawSubtopics =
    p?.subtopics ||
    p?.dataset?.subtopics ||
    p?.dataset?.subtopic_list ||
    p?.dataset?.subtopicIds ||
    p?.dataset?.subtopic_ids ||
    [];

  const subtopics = Array.isArray(rawSubtopics)
    ? rawSubtopics.map((s) => {
        if (typeof s === 'string') {
          return {
            id: s,
            subtopicId: s,
            name: s,
          };
        }

        return {
          ...s,
          id: s?.id || s?.subtopicId || s?._id,
          subtopicId: s?.id || s?.subtopicId || s?._id,
          name: s?.name || s?.title || 'Subtopic',
        };
      })
    : [];

  return {
    ...p,
    id: p?.id || p?._id,
    name: p?.name || p?.projectName || 'Untitled Project',
    description: p?.description || '',
    guidelines: p?.guidelines || '',
    deadline: p?.deadline || null,
    datasetName: p?.dataset?.name || p?.datasetName || '',
    topicName: p?.topic?.name || p?.topicName || '',
    subtopics,
  };
};

const statusLabel = (status) => {
  switch (status) {
    case 'completed':
      return 'Đã xong';
    case 'submitted':
      return 'Chờ review';
    case 'approved':
      return 'Đã duyệt';
    case 'rejected':
      return 'Bị trả lại';
    case 'in_progress':
      return 'Đang làm';
    default:
      return 'Chưa làm';
  }
};

const ProjectDetail = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [projectRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${projectId}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/api/tasks/my-tasks`, {
          headers: getAuthHeaders(),
          params: { project_id: projectId },
        }),
      ]);

      const projectData = normalizeProject(projectRes.data);

      const rawTasks = getArray(tasksRes.data);
      const normalizedTasks = rawTasks.map(normalizeTask);

      console.log('[ProjectDetail] project:', projectData);
      console.log('[ProjectDetail] tasks:', normalizedTasks);

      setProject(projectData);
      setTasks(normalizedTasks);
    } catch (err) {
      console.error('Load project detail failed:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không tải được chi tiết project'
      );
    } finally {
      setLoading(false);
    }
  };

  const subtopicCards = useMemo(() => {
    const subs = Array.isArray(project?.subtopics) ? project.subtopics : [];

    return subs.map((sub) => {
      const subId = String(sub?.id || sub?.subtopicId || '');

      const subTasks = tasks.filter((t) => {
        const sameProject = String(t.projectId) === String(projectId);
        const sameSubtopic =
          t.subtopicId && String(t.subtopicId) === String(subId);
        return sameProject && sameSubtopic;
      });

      // fallback: nếu task không có subtopicId thì vẫn cho subtopic đầu tiên/duy nhất dùng task của project
      const fallbackProjectTasks = tasks.filter(
        (t) => String(t.projectId) === String(projectId)
      );

      const effectiveTasks = subTasks.length ? subTasks : fallbackProjectTasks;

      const total = effectiveTasks.length;
      const waitingReview = effectiveTasks.filter(
        (t) => t.status === 'submitted'
      ).length;
      const rejected = effectiveTasks.filter(
        (t) => t.status === 'rejected'
      ).length;
      const inProgress = effectiveTasks.filter(
        (t) => t.status === 'in_progress'
      ).length;
      const done = effectiveTasks.filter((t) =>
        ['completed', 'submitted', 'approved'].includes(t.status)
      ).length;

      const progress = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        ...sub,
        total,
        waitingReview,
        rejected,
        inProgress,
        done,
        progress,
        effectiveTasks,
      };
    });
  }, [project, tasks, projectId]);

  const totalItems = tasks.filter(
    (t) => String(t.projectId) === String(projectId)
  ).length;

  const totalReviewing = tasks.filter(
    (t) => String(t.projectId) === String(projectId) && t.status === 'submitted'
  ).length;

  const totalRejected = tasks.filter(
    (t) => String(t.projectId) === String(projectId) && t.status === 'rejected'
  ).length;

  const totalDone = tasks.filter(
    (t) =>
      String(t.projectId) === String(projectId) &&
      ['completed', 'submitted', 'approved'].includes(t.status)
  ).length;

  const overallProgress =
    totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  const handleStartSubtopic = async (sub) => {
    try {
      const res = await axios.get(`${API_URL}/api/tasks/my-tasks`, {
        headers: getAuthHeaders(),
        params: { project_id: projectId },
      });

      const rawTasks = getArray(res.data);
      const normalizedTasks = rawTasks.map(normalizeTask);

      console.log('rawTasks:', normalizedTasks);
      console.log('clicked subtopic:', sub);

      const subId = String(sub?.id || sub?.subtopicId || '');

      let matchedTasks = normalizedTasks.filter(
        (t) =>
          String(t.projectId) === String(projectId) &&
          t.subtopicId &&
          String(t.subtopicId) === subId
      );

      if (!matchedTasks.length) {
        matchedTasks = normalizedTasks.filter(
          (t) => String(t.projectId) === String(projectId)
        );
      }

      if (!matchedTasks.length) {
        alert('Không có task nào trong project này.');
        return;
      }

      const priorityOrder = [
        'rejected',
        'in_progress',
        'assigned',
        'submitted',
        'completed',
        'approved',
      ];

      const sorted = [...matchedTasks].sort((a, b) => {
        return (
          priorityOrder.indexOf(a.status || 'assigned') -
          priorityOrder.indexOf(b.status || 'assigned')
        );
      });

      const targetTask = sorted[0];

      navigate(
        `/annotator/workspace/${sub?.id || sub?.subtopicId}?taskId=${targetTask.id}`
      );
    } catch (err) {
      console.error('handleStartSubtopic error:', err);
      alert('Không tải được task.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Không tìm thấy project.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100vh',
        bgcolor: '#020817',
        color: '#e2e8f0',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/annotator/tasks')} sx={{ color: '#cbd5e1' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ color: '#94a3b8' }}>Quay lại</Typography>
        <Typography sx={{ color: '#475569' }}>/</Typography>
        <Typography sx={{ color: '#64748b' }}>{project.name}</Typography>
      </Box>

      <Card
        sx={{
          mb: 4,
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 4,
          color: '#e2e8f0',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                {project.name}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {project.datasetName ? (
                  <Chip
                    size="small"
                    label={project.datasetName}
                    sx={{ bgcolor: '#0f172a', color: '#94a3b8' }}
                  />
                ) : null}
                {project.topicName ? (
                  <Chip
                    size="small"
                    label={project.topicName}
                    sx={{ bgcolor: '#0f172a', color: '#94a3b8' }}
                  />
                ) : null}
              </Box>
            </Box>

            {project.deadline ? (
              <Card
                sx={{
                  minWidth: 220,
                  bgcolor: '#0f172a',
                  border: '1px solid #1e3a8a',
                  color: '#e2e8f0',
                }}
              >
                <CardContent>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Deadline
                  </Typography>
                  <Typography fontWeight={700}>
                    {new Date(project.deadline).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    {new Date(project.deadline).toLocaleDateString('vi-VN')}
                  </Typography>
                </CardContent>
              </Card>
            ) : null}
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#0f172a', color: '#e2e8f0' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Tổng số item
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalItems}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#2a2f24', color: '#facc15' }}>
                <CardContent>
                  <Typography variant="body2">Đang chờ review</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalReviewing}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#2b1f2b', color: '#fb7185' }}>
                <CardContent>
                  <Typography variant="body2">Bị trả lại</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalRejected}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#0f172a', color: '#e2e8f0' }}>
                <CardContent>
                  <Typography variant="body2">Đã nộp / Đã duyệt</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalDone}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography sx={{ mb: 1 }}>Tiến độ tổng thể</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                flex: 1,
                height: 10,
                borderRadius: 999,
                bgcolor: '#334155',
              }}
            />
            <Typography fontWeight={700}>
              {overallProgress}% ({totalDone}/{totalItems} items)
            </Typography>
          </Box>

          {project.guidelines ? (
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ color: '#60a5fa', cursor: 'pointer' }}>
                Hướng dẫn ghi nhãn (Guidelines)
              </Typography>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Subtopics ({subtopicCards.length})
        </Typography>
        <Typography sx={{ color: '#64748b' }}>
          Chia nhỏ công việc theo subtopic để dễ quản lý
        </Typography>
      </Box>

      {subtopicCards.length === 0 ? (
        <Card
          sx={{
            bgcolor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 4,
            color: '#94a3b8',
          }}
        >
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Typography>Chưa có subtopic nào trong project này.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {subtopicCards.map((sub) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={sub.id || sub.subtopicId}>
              <Card
                sx={{
                  bgcolor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: 4,
                  color: '#e2e8f0',
                  height: '100%',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Typography fontWeight={700}>{sub.name}</Typography>
                    <Chip
                      size="small"
                      label={sub.total > 0 ? statusLabel(sub.effectiveTasks[0]?.status) : 'Chưa có item'}
                      sx={{
                        bgcolor: '#374151',
                        color: '#cbd5e1',
                      }}
                    />
                  </Box>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Card sx={{ bgcolor: '#0b1220', color: '#e2e8f0' }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            Tổng item
                          </Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {sub.total}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={6}>
                      <Card sx={{ bgcolor: '#2a2f24', color: '#facc15' }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="body2">Chờ review</Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {sub.waitingReview}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={6}>
                      <Card sx={{ bgcolor: '#102938', color: '#2dd4bf' }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="body2">Đã làm</Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {sub.done}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={6}>
                      <Card sx={{ bgcolor: '#2b1f2b', color: '#fb7185' }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="body2">Bị trả lại</Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {sub.rejected}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.5 }}>
                      Tiến độ
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={sub.progress}
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 999,
                          bgcolor: '#334155',
                        }}
                      />
                      <Typography variant="body2" fontWeight={700}>
                        {sub.progress}%
                      </Typography>
                    </Box>
                  </Box>

                  {project.deadline ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: '#94a3b8',
                        mb: 2,
                        mt: 2,
                      }}
                    >
                      <CalendarTodayIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        Deadline: {new Date(project.deadline).toLocaleDateString('vi-VN')}
                      </Typography>
                    </Box>
                  ) : null}

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleStartSubtopic(sub)}
                    sx={{
                      mt: 1,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 700,
                    }}
                  >
                    Bắt đầu
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ProjectDetail;
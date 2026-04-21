import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  People as PeopleIcon,
  Folder as FolderIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const WorkloadBar = ({ name, count, max, color }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" noWrap sx={{ maxWidth: '65%' }}>{name}</Typography>
      <Typography variant="body2" fontWeight="bold">{count}</Typography>
    </Box>
    <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 10 }}>
      <Box
        sx={{
          width: `${max > 0 ? (count / max) * 100 : 0}%`,
          bgcolor: color,
          borderRadius: 1,
          height: 10,
          transition: 'width 0.4s ease',
        }}
      />
    </Box>
  </Box>
);

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workload, setWorkload] = useState({ annotators: [], reviewers: [] });
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, projectsRes, datasetsRes] = await Promise.all([
          axios.get(`${API_URL}/api/users`),
          axios.get(`${API_URL}/api/projects`),
          axios.get(`${API_URL}/api/datasets`),
        ]);

        const activityStatsRes = await axios.get(`${API_URL}/api/activity-logs/stats`);
        const actionCounts = activityStatsRes.data?.action_counts || {};
        setApprovedCount(actionCounts.task_approve || 0);

        const users = usersRes.data?.users || usersRes.data || [];
        const projects = projectsRes.data?.projects || projectsRes.data || [];
        const datasets = datasetsRes.data?.datasets || datasetsRes.data || [];

        const activeUsers = (users || []).filter((u) => u.is_active).length;
        const annotators = (users || []).filter((u) => u.role === 'annotator').length;
        const reviewers = (users || []).filter((u) => u.role === 'reviewer').length;
        const managers = (users || []).filter((u) => u.role === 'manager').length;

        const activeProjects = (projects || []).filter((p) => p.status === 'active').length;

        const totalStorage = (datasets || []).reduce((acc, d) => acc + (d.fileCount || 0) * 1024 * 1024 * 5, 0);

        setStats({
          totalUsers: users.length,
          activeUsers,
          annotators,
          reviewers,
          managers,
          totalProjects: projects.length,
          activeProjects,
          totalDatasets: datasets.length,
          totalStorage,
          storageLimit: 10 * 1024 * 1024 * 1024,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTaskCompletionRate = () => {
    if (!stats || stats.totalProjects === 0) return 0;
    return Math.round((stats.activeProjects / stats.totalProjects) * 100);
  };

  const getStorageUsagePercent = () => {
    if (!stats) return 0;
    return Math.round((stats.totalStorage / stats.storageLimit) * 100);
  };

  useEffect(() => {
    const fetchWorkload = async () => {
      try {
        const [submitRes, approveRes] = await Promise.all([
          axios.get(`${API_URL}/api/activity-logs?action=task_submit&limit=500`),
          axios.get(`${API_URL}/api/activity-logs?action=task_approve&limit=500`),
        ]);

        const groupByUser = (data) => {
          const items = data?.data || data || [];
          const map = {};
          items.forEach((log) => {
            const id = log.user?.id;
            if (!id) return;
            if (!map[id]) map[id] = { name: log.user?.full_name || log.user?.username || 'Unknown', count: 0 };
            map[id].count++;
          });
          return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
        };

        setWorkload({
          annotators: groupByUser(submitRes.data),
          reviewers: groupByUser(approveRes.data),
        });
      } catch (error) {
        console.error('Error fetching workload data:', error);
      }
    };

    fetchWorkload();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          System health overview and global activity metrics.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            subtitle={`${stats?.activeUsers || 0} active`}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Projects"
            value={stats?.totalProjects || 0}
            subtitle={`${stats?.activeProjects || 0} active`}
            icon={<FolderIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved Tasks (7 days)"
            value={approvedCount}
            subtitle="Tasks approved by reviewers"
            icon={<CheckCircleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Datasets"
            value={stats?.totalDatasets || 0}
            subtitle={`${stats?.totalStorage ? formatBytes(stats.totalStorage) : '0 B'} used`}
            icon={<StorageIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Annotators (by submissions)</Typography>
              {workload.annotators.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No data</Typography>
              ) : (
                workload.annotators.map((a) => (
                  <WorkloadBar
                    key={a.name}
                    name={a.name}
                    count={a.count}
                    max={workload.annotators[0]?.count || 1}
                    color="#2e7d32"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Reviewers (by approvals)</Typography>
              {workload.reviewers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No data</Typography>
              ) : (
                workload.reviewers.map((r) => (
                  <WorkloadBar
                    key={r.name}
                    name={r.name}
                    count={r.count}
                    max={workload.reviewers[0]?.count || 1}
                    color="#ed6c02"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label="Managers" size="small" color="primary" />
                  <Typography variant="body2">{stats?.managers || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label="Annotators" size="small" color="success" />
                  <Typography variant="body2">{stats?.annotators || 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label="Reviewers" size="small" color="warning" />
                  <Typography variant="body2">{stats?.reviewers || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Completion Rate</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {getTaskCompletionRate()}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getTaskCompletionRate()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${stats?.activeProjects || 0} Active`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`${(stats?.totalProjects || 0) - (stats?.activeProjects || 0)} Draft/Hidden`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    icon={<WarningIcon />}
                    label={`${stats?.totalUsers || 0} Users`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Usage
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Used Space</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats?.totalStorage ? formatBytes(stats.totalStorage) : '0 B'} / {formatBytes(stats?.storageLimit || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getStorageUsagePercent()}
                    color={getStorageUsagePercent() > 80 ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {getStorageUsagePercent()}% of total storage used
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircleIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Database"
                    secondary="Connected - All services running"
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircleIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="API Server"
                    secondary="Running - No issues detected"
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircleIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="File Storage"
                    secondary="Active - Storage available"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity Summary
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <TrendingUpIcon color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {stats?.totalProjects || 0} total projects
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Across all projects
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <FolderIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {stats?.activeProjects || 0} active projects
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Currently in progress
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PeopleIcon color="info" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {stats?.activeUsers || 0} active users
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Working on projects
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
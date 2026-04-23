import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, CircularProgress, Paper, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getTaskKind } from './auditUtils';
import AuditFiltersBar from './AuditFiltersBar';
import AuditTaskTable from './AuditTaskTable';
import AuditTaskDetailPanel from './AuditTaskDetailPanel';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AnnotatorAuditDetail = () => {
  const { projectId, annotatorId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]           = useState(true);
  const [annotator, setAnnotator]       = useState(null);
  const [tasks, setTasks]               = useState([]);
  const [project, setProject]           = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [textContent, setTextContent]   = useState('');

  useEffect(() => { fetchData(); }, [projectId, annotatorId]);

  useEffect(() => {
    if (selectedTask && getTaskKind(selectedTask) === 'text' && selectedTask.dataItem?.path)
      fetchTextContent(selectedTask.dataItem.path);
    else
      setTextContent('');
  }, [selectedTask]);

  const fetchTextContent = async (path) => {
    try {
      const response = await axios.get(`${API_URL}/${path}`, { responseType: 'text' });
      setTextContent(response.data);
    } catch {
      setTextContent('Không thể tải nội dung file.');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, annotatorRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${projectId}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/users/${annotatorId}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/tasks/project/${projectId}`, { headers: getAuthHeaders() }),
      ]);
      setProject(projectRes.data?.project || projectRes.data);
      setAnnotator(annotatorRes.data?.user || annotatorRes.data);
      const rawTasks = Array.isArray(tasksRes.data)
        ? tasksRes.data
        : (tasksRes.data?.data || tasksRes.data?.tasks || []);
      setTasks(rawTasks.filter(t => (t.annotator?.id || t.annotatorId || t.annotator?._id) === annotatorId));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (reviewFilter !== 'all') {
      if (reviewFilter === 'approved' && task.status !== 'approved') return false;
      if (reviewFilter === 'rejected' && task.status !== 'rejected') return false;
      if (reviewFilter === 'pending' && !['submitted', 'pending'].includes(task.status)) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (task.id?.toLowerCase() || '').includes(term)
        || (task.dataItem?.filename || '').toLowerCase().includes(term);
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><CircularProgress /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 bg-slate-800">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(`/manager/projects/${projectId}`)} className="p-2 hover:bg-slate-700 rounded-lg">
            <ArrowBackIcon />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Projects</span><span>/</span>
              <span>{project?.name || 'Project'}</span><span>/</span>
              <span className="text-slate-200 font-medium">Annotator Audit</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              Annotator Audit: {annotator?.fullName || annotator?.username || 'Unknown'}
            </h1>
          </div>
        </div>
        <Paper className="p-4" sx={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}>
          <div className="flex items-center gap-4">
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              {(annotator?.fullName || annotator?.username || 'A')[0].toUpperCase()}
            </Avatar>
            <div>
              <Typography variant="h6">{annotator?.fullName || annotator?.username || 'Unknown'}</Typography>
              <Typography variant="body2" color="#94a3b8">Task count: {tasks.length}</Typography>
            </div>
          </div>
        </Paper>
      </div>

      {/* Content */}
      <div className="p-6">
        <AuditFiltersBar
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          reviewFilter={reviewFilter} setReviewFilter={setReviewFilter}
        />
        <AuditTaskTable
          filteredTasks={filteredTasks}
          onViewDetail={task => { setSelectedTask(task); setQuickViewOpen(true); }}
        />
      </div>

      {/* Slide-out detail panel */}
      {quickViewOpen && selectedTask && (
        <AuditTaskDetailPanel
          task={selectedTask}
          textContent={textContent}
          onClose={() => { setQuickViewOpen(false); setSelectedTask(null); }}
        />
      )}
    </div>
  );
};

export default AnnotatorAuditDetail;

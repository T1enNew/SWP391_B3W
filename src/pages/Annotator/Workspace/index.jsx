import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { normalizeTask } from '../../../utils/taskAdapter';
import { getAuthHeaders } from '../../../utils/auth';
import { TASK_STATUS } from './constants';
import { getTaskDataItem, getTaskKind, buildFileUrl } from './utils';
import TaskListPanel from './TaskListPanel';
import AnnotationArea from './AnnotationArea';
import InfoPanel from './InfoPanel';

// ===== MAIN WORKSPACE COMPONENT =====
const Workspace = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTaskId = searchParams.get('taskId');

  // REFS: MUST be declared BEFORE useCallback
  const isMountedRef = useRef(true);
  const currentTaskIdRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [task, setTask] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [labels, setLabels] = useState({});
  const [textSpans, setTextSpans] = useState([]);
  const [annotationNote, setAnnotationNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [projectInfo, setProjectInfo] = useState({ name: '', id: '' });
  const [textContent, setTextContent] = useState('');
  const [projectLabels, setProjectLabels] = useState([]);
  // Local status overrides: takes priority over backend status for display
  // Resets on page reload (intended - backend is source of truth on reload)
  const [statusOverrides, setStatusOverrides] = useState({});
  const [projectDeadline, setProjectDeadline] = useState(null);

  // Bulk AI state
  const [bulkAiDialog, setBulkAiDialog] = useState(false);
  const [bulkAiLoading, setBulkAiLoading] = useState(false);
  const [bulkAiProgress, setBulkAiProgress] = useState({ done: 0, total: 0 });
  const [bulkAiDone, setBulkAiDone] = useState(false);
  const [bulkAiCount, setBulkAiCount] = useState(0);
  const [bulkAiError, setBulkAiError] = useState('');

  // Mount lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Keep currentTaskIdRef in sync
  useEffect(() => { currentTaskIdRef.current = currentTaskId; }, [currentTaskId]);

  // Load tasks list
  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // Fetch tasks and project detail in parallel
      const [tasksRes, projectRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/tasks/my-tasks`, {
          params: { project_id: projectId },
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/api/projects/${projectId}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!isMountedRef.current) return;

      // Extract project labels
      if (projectRes.status === 'fulfilled') {
        const pData = projectRes.value.data?.project || projectRes.value.data || {};
        const pName = pData.name || '';
        const pId = pData._id || pData.id || projectId;
        setProjectInfo({ name: pName, id: pId });
        setProjectDeadline(pData.deadline || null);

        // Labels can live at various paths depending on backend populate depth
        const rawLabels =
          pData.labels ||
          pData.labelsets ||
          pData.label_ids ||
          pData.labelIds ||
          [];
        const normalizedPLabels = Array.isArray(rawLabels)
          ? rawLabels.map((l) => ({
              id: l._id || l.id || l,
              name: l.name || String(l),
              color: l.color || '#3b82f6',
              description: l.description || '',
              shortcut: l.shortcut || '',
            }))
          : [];
        setProjectLabels(normalizedPLabels);
      }

      if (tasksRes.status === 'fulfilled') {
        const rawTasks = Array.isArray(tasksRes.value.data)
          ? tasksRes.value.data
          : tasksRes.value.data?.data || tasksRes.value.data?.tasks || [];
        const taskList = rawTasks.map(normalizeTask);
        setTasks(taskList);
        if (taskList.length > 0 && !projectRes.status === 'fulfilled') {
          const first = taskList[0];
          setProjectInfo((prev) => prev.name ? prev : { name: first.projectId?.name || first.project?.name || '', id: first.projectId?.id || first.project?.id || '' });
        }
        if (initialTaskId) {
          setCurrentTaskId(initialTaskId);
        } else if (taskList.length > 0) {
          const priorityOrder = ['rejected', 'revised', 'in_progress', 'assigned', 'completed', 'submitted', 'resubmitted'];
          const next = taskList.find((t) => priorityOrder.includes(t.status));
          setCurrentTaskId(next?.id || taskList[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [projectId, initialTaskId]);

  // Load task detail
  const loadTaskDetail = useCallback(async (taskId) => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/tasks/${taskId}`, { headers: getAuthHeaders() });
      const taskData = normalizeTask(res.data);
      if (!isMountedRef.current) return;

      // Fetch signed URL to replace storageUrl (Supabase public URLs may return 400)
      const di = taskData.dataItem;
      const datasetId = taskData.datasetId?.id || taskData.dataset?.id ||
        (typeof taskData.datasetId === 'string' ? taskData.datasetId : null);
      const dataItemId = di?.id || di?._id;
      if (di && datasetId && dataItemId) {
        try {
          const signedRes = await axios.get(
            `${API_URL}/api/datasets/${datasetId}/signed-url/${dataItemId}`,
            { headers: getAuthHeaders() }
          );
          const url = signedRes.data?.signedUrl || signedRes.data?.signed_url ||
            signedRes.data?.url || signedRes.data?.data?.signedUrl || '';
          if (url) taskData.dataItem = { ...di, signedUrl: url };
        } catch {}
      }

      setTask({
        ...taskData,
        availableLabels: taskData.availableLabels?.length
          ? taskData.availableLabels
          : projectLabels,
      });

      const initialLabels = taskData.labels || taskData.annotation_data || {};

      setLabels(initialLabels);
      const kind = getTaskKind(taskData);

      if (kind === 'text') {
        try {
const textRes = await axios.get(
  buildFileUrl(getTaskDataItem(taskData)),
  { responseType: 'text' }
);
          if (isMountedRef.current) { setTextContent(textRes.data || ''); taskData._textContent = textRes.data || ''; }
        } catch { if (isMountedRef.current) setTextContent(''); }
        if (isMountedRef.current) {
          if (initialLabels?.spans && Array.isArray(initialLabels.spans)) {
            setTextSpans(initialLabels.spans.map((span, idx) => ({ ...span, id: span.id || `span-${idx}` })));
          } else { setTextSpans([]); }
          setAnnotationNote(initialLabels?.note || '');
        }
      } else {
        if (isMountedRef.current) { setTextSpans([]); setAnnotationNote(initialLabels?.note || ''); }
      }

      if (isMountedRef.current) {
        if (kind === 'image' && initialLabels?.objects && Array.isArray(initialLabels.objects)) {
          setAnnotations(initialLabels.objects.map((obj, idx) => ({
            id: Date.now() + idx, label: obj.label, bbox: obj.bbox || [0, 0, 10, 10],
            confidence: obj.confidence || 1.0, type: 'bbox', answer: obj.answer || null,
          })));
        } else { setAnnotations([]); }
      }
    } catch (err) {
      console.error('Error loading task detail:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [projectLabels]);

  // Sync project labels to task if task loaded without labels
  useEffect(() => {
    if (task && projectLabels.length > 0 && (!task.availableLabels || task.availableLabels.length === 0)) {
      setTask(prev => ({
        ...prev,
        availableLabels: projectLabels
      }));
    }
  }, [task?.id, projectLabels]);

  // Load tasks on mount/projectId change
  useEffect(() => {
    setCurrentTaskId(null);
    setTask(null);
    loadTasks();
  }, [loadTasks]);

  // Load task detail when currentTaskId changes
  useEffect(() => {
    if (currentTaskId) loadTaskDetail(currentTaskId);
  }, [currentTaskId, loadTaskDetail]);

  // Persist statusOverrides to localStorage so ProjectDetail can read them
  useEffect(() => {
    if (!projectId || Object.keys(statusOverrides).length === 0) return;
    const key = `taskStatus_${projectId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...existing, ...statusOverrides }));
  }, [statusOverrides, projectId]);

  // When a task finishes loading: set in_progress override + call start API
  // Only runs when task.id changes (i.e., different task loaded), not on every re-render
  useEffect(() => {
    if (!task?.id) return;
    const TERMINAL = ['completed', 'submitted', 'resubmitted', 'approved'];
    setStatusOverrides((prev) => {
      if (TERMINAL.includes(prev[task.id]) || TERMINAL.includes(task.status)) return prev;
      return { ...prev, [task.id]: 'in_progress' };
    });
    // Call start API for backend if needed (fire and forget)
    if (['assigned', 'rejected'].includes(task.status)) {
      axios.put(`${API_URL}/api/tasks/${task.id}/start`, {}, { headers: getAuthHeaders() }).catch(() => {});
    }
  }, [task?.id]); // only re-run when task ID changes, not on statusOverrides update

  // Poll for status updates when submitted
  useEffect(() => {
    if (!task || !['submitted', 'resubmitted'].includes(task?.status)) return;
    const interval = setInterval(() => {
      if (isMountedRef.current && currentTaskIdRef.current) loadTaskDetail(currentTaskIdRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, [task?.status, loadTaskDetail]);

  // Handlers
  const handleAnnotationsChange = useCallback((newAnnotations) => { setAnnotations(newAnnotations); }, []);
  const handleLabelsChange = useCallback((newLabels) => { setLabels(newLabels); }, []);

  const hasCurrentAnnotations = useCallback(() => {
    if (!task) return false;
    const kind = getTaskKind(task);
    if (kind === 'image') return annotations.length > 0;
    if (kind === 'text') return textSpans.length > 0 || !!annotationNote?.trim();
    if (kind === 'audio') return !!(labels.segments?.length);
    return false;
  }, [task, annotations, textSpans, annotationNote, labels]);

const handleSave = useCallback(async () => {
  if (!task || ['submitted', 'resubmitted', 'approved'].includes(task?.status)) return;

  try {
    const kind = getTaskKind(task);
    let labelsPayload = {};

    if (kind === 'image') {
      labelsPayload = {
        objects: annotations.map((ann) => ({
          label: ann.label,
          bbox: ann.bbox,
          confidence: ann.confidence,
          answer: ann.answer || null,
        })),
      };
    } else if (kind === 'text') {
      labelsPayload = {
        spans: textSpans.map(({ id, ...rest }) => rest),
        note: annotationNote?.trim() || '',
      };
    } else if (kind === 'audio') {
      labelsPayload = {
        segments: labels.segments || [],
        note: annotationNote?.trim() || '',
      };
    } else {
      labelsPayload = {
        note: annotationNote?.trim() || '',
        label: labels.label || '',
      };
    }

    await axios.put(
      `${API_URL}/api/tasks/${task.id}/save`,
      { annotation_data: labelsPayload },
      { headers: getAuthHeaders() }
    );
  } catch (err) {
    console.error('Save failed:', err?.response?.data || err);
  }
}, [task, annotations, labels, textSpans, annotationNote]);

  const handleReset = useCallback(() => {
    if (!task || ['submitted', 'resubmitted', 'approved'].includes(task?.status)) return;
    const kind = getTaskKind(task);
    if (kind === 'image') setAnnotations([]);
    if (kind === 'text') { setTextSpans([]); setAnnotationNote(''); }
    if (kind === 'audio') setLabels({});
    handleSave();
  }, [task, handleSave]);

  const handleTaskSelect = useCallback(async (taskId) => {
    if (taskId === currentTaskId) return;
    // Handle leaving current task
    if (task && !['submitted', 'resubmitted', 'approved'].includes(task?.status)) {
      if (hasCurrentAnnotations()) {
        // Has annotations → save + mark completed
        try { await handleSave(); } catch {}
        setStatusOverrides((prev) => ({ ...prev, [task.id]: 'completed' }));
      } else {
        // No annotations → revert to "Chưa làm"
        setStatusOverrides((prev) => ({ ...prev, [task.id]: 'assigned' }));
      }
    }
    setCurrentTaskId(taskId);
    navigate(`/annotator/workspace/${projectId}?taskId=${taskId}`, { replace: true });
  }, [currentTaskId, task, hasCurrentAnnotations, handleSave, projectId, navigate]);

  const handleNavigateTask = useCallback((direction) => {
    const currentIdx = tasks.findIndex((t) => t.id === currentTaskId);
    if (direction === 'prev' && currentIdx > 0) handleTaskSelect(tasks[currentIdx - 1].id);
    else if (direction === 'next' && currentIdx < tasks.length - 1) handleTaskSelect(tasks[currentIdx + 1].id);
  }, [tasks, currentTaskId, handleTaskSelect]);

  const handleSubmitProject = useCallback(async () => {
    const toSubmit = tasks.filter((t) => (statusOverrides[t.id] ?? t.status) === 'completed');
    if (!toSubmit.length) return;
    setSaving(true);
    try {
      for (const t of toSubmit) {
        await axios.post(`${API_URL}/api/tasks/${t.id}/submit`, {}, { headers: getAuthHeaders() });
      }
      navigate(`/annotator/projects/${projectId}`);
    } catch (err) {
      alert('Nộp bài thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }, [tasks, statusOverrides, projectId, navigate]);

  const handleBulkAiLabel = useCallback(async () => {
    // Only image tasks that aren't already submitted/approved
    const targetTasks = tasks.filter((t) =>
      !['submitted', 'resubmitted', 'approved'].includes(t.status)
    );
    setBulkAiLoading(true);
    setBulkAiError('');
    setBulkAiProgress({ done: 0, total: targetTasks.length });
    let successCount = 0;
    let lastError = '';

    for (let i = 0; i < targetTasks.length; i++) {
      const t = targetTasks[i];
      try {
        // apply=true → backend saves suggestions to annotation_data automatically
        const res = await axios.post(
          `${API_URL}/api/ai/pre-label/${t.id}?apply=true`,
          {},
          { headers: getAuthHeaders() }
        );
        const applied = res.data?.applied;
        const suggestions = res.data?.suggestions || [];
        if (applied || suggestions.length > 0) {
          if (!applied && suggestions.length > 0) {
            // Fallback: backend didn't auto-save, save manually with placeholder bboxes
            const count = suggestions.length;
            const objects = suggestions.map((s, idx) => {
              const colW = 90 / count;
              const x1 = 5 + idx * colW;
              return { label: s.name || s.label || String(s), bbox: [x1, 5, x1 + colW - 2, 95], confidence: s.confidence || 1.0, answer: null };
            });
            await axios.put(`${API_URL}/api/tasks/${t.id}/save`, { annotation_data: { objects } }, { headers: getAuthHeaders() });
          }
          successCount++;
        }
      } catch (err) {
        const serverMsg = err?.response?.data?.message || '';
        const serverErr = err?.response?.data?.error || '';
        const combined = serverErr ? `${serverMsg} — ${serverErr}` : serverMsg;
        if (combined.includes('GoogleGenerativeAI') || combined.includes('generativelanguage')) {
          lastError = 'Gemini API bị giới hạn tốc độ (rate limit). Thử lại sau vài phút.';
        } else {
          lastError = combined || `Lỗi server (${err?.response?.status || 'unknown'})`;
        }
        console.error(`AI pre-label failed for task ${t.id}:`, err?.response?.data || err.message);
      }
      setBulkAiProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      // Delay between tasks to avoid Gemini rate limit (free tier ~2 req/min)
      if (i < targetTasks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    setBulkAiCount(successCount);
    if (lastError && successCount === 0) setBulkAiError(lastError);
    setBulkAiLoading(false);
    setBulkAiDone(true);
    if (currentTaskId) loadTaskDetail(currentTaskId);
  }, [tasks, currentTaskId, loadTaskDetail]);

  // Keyboard shortcuts
  useEffect(() => {
    if (loading) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') handleNavigateTask('prev');
      if (e.key === 'ArrowRight') handleNavigateTask('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, handleNavigateTask]);

  // Apply local status overrides for display (takes priority over backend status)
  const effectiveTasks = tasks.map((t) => ({ ...t, status: statusOverrides[t.id] ?? t.status }));
  const effectiveTask = task ? { ...task, status: statusOverrides[task.id] ?? task.status } : null;

  const currentIdx = effectiveTasks.findIndex((t) => t.id === currentTaskId);
  const labeledCount = effectiveTasks.filter((t) => ['in_progress', 'submitted', 'resubmitted', 'approved', 'completed'].includes(t.status)).length;
  const allTasksDone = effectiveTasks.length > 0 && effectiveTasks.every((t) => ['completed', 'submitted', 'resubmitted', 'approved'].includes(t.status));
  const hasPendingSubmit = effectiveTasks.some((t) => t.status === 'completed');
  const showSubmitButton = allTasksDone && hasPendingSubmit;
  const pct = effectiveTasks.length > 0 ? Math.round(((currentIdx + 1) / effectiveTasks.length) * 100) : 0;
  const taskWithContent = effectiveTask ? { ...effectiveTask, _textContent: textContent } : null;

  const isOverdue = projectDeadline && new Date(projectDeadline) < new Date();

  if (!loading && isOverdue) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
            <svg className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-rose-400 mb-2">Project đã quá hạn</h2>
          <p className="text-gray-400 text-sm mb-1">Deadline của project <span className="font-semibold text-gray-200">{projectInfo.name}</span> đã kết thúc.</p>
          <p className="text-gray-500 text-xs mb-6">Bạn không thể tiếp tục làm việc trên project này.</p>
          <button onClick={() => navigate('/annotator/projects')}
            className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-all">
            Quay lại danh sách project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <div className="w-72 shrink-0">
        <TaskListPanel tasks={effectiveTasks} currentTaskId={currentTaskId} onSelect={handleTaskSelect} projectName={projectInfo.name} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 border-b border-gray-700 bg-gray-900/80 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-200 truncate">{projectInfo.name} — Item {currentIdx + 1}/{effectiveTasks.length}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Đã gán nhãn: {labeledCount}/{effectiveTasks.length} items</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleNavigateTask('prev')} disabled={currentIdx <= 0}
                className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:text-gray-200 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-gray-500 font-mono w-12 text-center">{currentIdx + 1}/{tasks.length}</span>
              <button onClick={() => handleNavigateTask('next')} disabled={currentIdx >= tasks.length - 1}
                className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:text-gray-200 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-24">
                <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button
                onClick={() => { setBulkAiDialog(true); setBulkAiDone(false); setBulkAiError(''); }}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all whitespace-nowrap"
                title="AI tự động gán nhãn toàn bộ project"
              >
                ✨ AI gán nhãn tất cả
              </button>
            </div>
          </div>
          {effectiveTask && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TASK_STATUS[effectiveTask.status]?.color || 'bg-gray-600'} ${TASK_STATUS[effectiveTask.status]?.textColor || 'text-gray-300'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${TASK_STATUS[effectiveTask.status]?.dotColor || 'bg-gray-400'}`} />
                {TASK_STATUS[effectiveTask.status]?.label || effectiveTask.status}
              </span>
              {effectiveTask.status === 'rejected' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/30">Có phản hồi từ reviewer</span>
              )}
              {effectiveTask.status === 'approved' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">Đã duyệt</span>
              )}
              {['submitted', 'resubmitted'].includes(effectiveTask.status) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400 border border-yellow-500/30">Đang chờ review</span>
              )}
            </div>
          )}
        </div>
        <AnnotationArea task={taskWithContent} onAnnotationsChange={handleAnnotationsChange} onLabelsChange={handleLabelsChange}
          annotations={annotations} labels={labels} textSpans={textSpans} setTextSpans={setTextSpans}
          annotationNote={annotationNote} setAnnotationNote={setAnnotationNote} />
      </div>
      {bulkAiDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-700/60">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">✨</span>
                <h3 className="text-base font-bold text-gray-100">AI hỗ trợ gán nhãn tự động</h3>
              </div>
              <p className="text-xs text-gray-500 ml-9">Google Gemini</p>
            </div>
            <div className="p-6 space-y-4">
              {!bulkAiLoading && !bulkAiDone && (
                <>
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
                    <p className="text-sm text-purple-200 leading-relaxed">
                      AI sẽ tự động phân tích và gán nhãn cho tất cả <span className="font-bold text-purple-100">{tasks.filter(t => !['submitted','resubmitted','approved'].includes(t.status)).length} task</span> chưa hoàn thành trong project này.
                    </p>
                    <p className="text-xs text-purple-400/70 mt-2">Sau khi hoàn thành, nhãn sẽ tự động hiển thị khi bạn chuyển sang từng task. Bạn vẫn có thể chỉnh sửa lại.</p>
                  </div>
                  <p className="text-sm text-gray-400">Bạn có muốn AI hỗ trợ gán nhãn toàn bộ project này không?</p>
                </>
              )}
              {bulkAiLoading && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300 font-medium">Đang xử lý...</p>
                  <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-300"
                      style={{ width: bulkAiProgress.total > 0 ? `${Math.round((bulkAiProgress.done / bulkAiProgress.total) * 100)}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">{bulkAiProgress.done}/{bulkAiProgress.total} tasks</p>
                  <p className="text-xs text-gray-500 italic">Vui lòng không đóng trang trong lúc AI đang xử lý.</p>
                </div>
              )}
              {bulkAiDone && bulkAiError && bulkAiCount === 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-4">
                    <p className="text-sm text-rose-300 font-semibold mb-1">AI gặp lỗi</p>
                    <p className="text-sm text-rose-200">{bulkAiError}</p>
                    <p className="text-xs text-rose-400/70 mt-2">Vui lòng kiểm tra kết nối server và thử lại.</p>
                  </div>
                </div>
              )}
              {bulkAiDone && !bulkAiError && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <p className="text-sm text-emerald-300 font-semibold mb-1">Hoàn thành!</p>
                  <p className="text-sm text-emerald-200">AI đã gán nhãn thành công <span className="font-bold">{bulkAiCount}</span> task. Nhãn sẽ tự động hiện khi bạn chuyển sang từng task.</p>
                </div>
              )}
              {bulkAiDone && bulkAiError && bulkAiCount > 0 && (
                <div className="space-y-2">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                    <p className="text-sm text-emerald-200">Gán nhãn thành công <span className="font-bold">{bulkAiCount}</span> task.</p>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
                    <p className="text-xs text-yellow-300">Một số task gặp lỗi: {bulkAiError}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              {!bulkAiLoading && !bulkAiDone && (
                <>
                  <button
                    onClick={() => setBulkAiDialog(false)}
                    className="rounded-lg border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 px-4 py-2 text-sm font-medium transition-all"
                  >
                    Không
                  </button>
                  <button
                    onClick={handleBulkAiLabel}
                    className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 text-sm font-semibold transition-all flex items-center gap-2"
                  >
                    ✨ Có, bắt đầu
                  </button>
                </>
              )}
              {bulkAiDone && (
                <button
                  onClick={() => setBulkAiDialog(false)}
                  className="rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 px-5 py-2 text-sm font-semibold transition-all"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="w-80 shrink-0">
        <InfoPanel task={effectiveTask}
          onReset={handleReset}
          saving={saving}
          allDone={showSubmitButton} onSubmitProject={handleSubmitProject}
          annotations={annotations} textSpans={textSpans} audioLabels={labels}
          onApplyAiSuggestions={(suggestions) => {
            if (!suggestions?.length) return;
            // Convert label suggestions into placeholder bboxes spread across image
            const count = suggestions.length;
            const newAnns = suggestions.map((s, i) => {
              const colW = 90 / count;
              const x1 = 5 + i * colW;
              const x2 = x1 + colW - 2;
              return {
                id: Date.now() + i,
                label: s.name,
                bbox: [x1, 5, x2, 95],
                confidence: s.confidence || 1.0,
                type: 'bbox',
                answer: null,
              };
            });
            setAnnotations(newAnns);
          }}
          onApplyAiBboxes={(bboxes) => {
            if (!bboxes?.length) return;
            // API trả về {label, x, y, width, height, confidence} trong không gian 0-100 (%)
            const newAnns = bboxes.map((b, i) => ({
              id: Date.now() + i,
              label: b.label,
              bbox: [b.x, b.y, b.x + b.width, b.y + b.height],
              confidence: b.confidence || 1.0,
              type: 'bbox',
              answer: null,
            }));
            setAnnotations(newAnns);
          }}
        />
      </div>
    </div>
  );
};

export default Workspace;

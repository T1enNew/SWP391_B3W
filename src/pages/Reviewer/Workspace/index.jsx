import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { API_URL } from '../../../config/api';
import { normalizeTask } from '../../../utils/taskAdapter';
import {
  getAuthToken,
  buildFileUrl,
  getTaskKind,
  stringToColor,
  getAnnotatorStatus,
  updateItemStatus,
  sortByStatus,
} from '../../../utils/reviewerUtils';
import ReviewQueueFlatPanel from './ReviewQueueFlatPanel';
import ImageViewPanel       from './ImageViewPanel';
import ReviewPanel          from './ReviewPanel';

const ReviewerWorkspace = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');

  const [items, setItems]                   = useState([]);
  const [currentItemId, setCurrentItemId]   = useState(null);
  const [currentItem, setCurrentItem]       = useState(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [savingMsg, setSavingMsg]           = useState('');
  const [feedback, setFeedback]             = useState('');
  const [errorCategory, setErrorCategory]   = useState('');
  const [visibleAnnotators, setVisibleAnnotators] = useState([]);
  const [activeAnnotatorId, setActiveAnnotatorId] = useState(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [fetchError, setFetchError]         = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setItems([]);
    setCurrentItemId(null);
    setCurrentItem(null);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const params = { limit: 1000 };

      const [pendingRes, reviewedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/reviews/pending`, { headers, params }),
        axios.get(`${API_URL}/api/reviews/reviewed`, { headers, params }),
      ]);

      const extractList = (res) => {
        if (res.status !== 'fulfilled') return [];
        const d = res.value.data;
        return Array.isArray(d) ? d : Array.isArray(d?.reviews) ? d.reviews : Array.isArray(d?.data) ? d.data : [];
      };

      const pending  = extractList(pendingRes);
      const reviewed = extractList(reviewedRes);
      const combined = [...pending, ...reviewed];

      const filtered = projectId
        ? combined.filter(t => {
            const pid = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
            return String(pid) === String(projectId);
          })
        : combined;

      const taskList = filtered.map(normalizeTask);
      const itemList = buildItemList(taskList, projectId);
      setItems(itemList);
      if (itemList.length > 0) selectItem(itemList[0]);
    } catch (err) {
      setFetchError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchReviewedTask = useCallback(async (taskId) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await axios.get(`${API_URL}/api/reviews/task/${taskId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const task = normalizeTask(res.data);
      if (!task) { setFetchError('Task not found'); return; }

      const di         = task.dataItem || {};
      const itemKey    = di.filename || di.original_name || task.id;
      const color      = stringToColor(task.annotator?.id || task.annotatorId?.id || task.id);
      const reviewStatus = getAnnotatorStatus(task);
      const datasetId  = task.datasetId?.id || task.dataset?.id ||
        (typeof task.datasetId === 'string' ? task.datasetId : null);
      const dataItemId = di.id || di._id || null;

      const item = {
        itemId:    itemKey,
        filename:  di.originalName || di.original_name || di.filename || itemKey,
        imageUrl:  buildFileUrl(di),
        datasetId,
        dataItemId,
        kind:      getTaskKind(task),
        status:    task.status === 'approved' ? 'fully_reviewed' : (task.status === 'rejected' ? 'waiting_rework' : 'pending_review'),
        projectName:     task.project?.name || task.projectId?.name || '',
        projectId:       task.project?.id   || task.projectId?.id   || projectId,
        guideline:       task.project?.guidelines || task.projectId?.guidelines || '',
        availableLabels: task.labelSet?.labels || task.availableLabels || [],
        submissions: [{
          submissionId:  task.id,
          annotatorId:   task.annotator?.id   || task.annotatorId?.id   || task.annotatorId,
          annotatorName: task.annotator?.full_name || task.annotator?.fullName || task.annotator?.username || 'Annotator',
          status:        reviewStatus,
          labels:        task.annotation_data || task.labels || {},
          feedback:      task.review_comments || '',
          color,
          task,
        }],
      };
      updateItemStatus(item);

      setItems([item]);
      selectItem(item);
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Khong tai duoc task');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (taskIdFromUrl) fetchReviewedTask(taskIdFromUrl);
    else               fetchQueue();
  }, [projectId]);

  const selectItem = (item) => {
    setCurrentItemId(item.itemId);
    setCurrentItem(item);
    const firstPend = item.submissions.find(s => s.status === 'pending');
    if (firstPend) { setActiveAnnotatorId(firstPend.annotatorId); setVisibleAnnotators([firstPend.annotatorId]); }
    else           { setActiveAnnotatorId(null); setVisibleAnnotators([]); }
  };

  const handleItemSelect = (item) => { setFeedback(''); setErrorCategory(''); selectItem(item); };

  const handleAnnotatorSelect = (sub) => {
    setActiveAnnotatorId(sub.annotatorId);
    setFeedback(sub.feedback || '');
    setErrorCategory('');
  };

  const handleAnnotatorToggle = (annotatorId) =>
    setVisibleAnnotators(prev =>
      prev.includes(annotatorId) ? prev.filter(id => id !== annotatorId) : [...prev, annotatorId]
    );

  const doUpdateItem = useCallback((updatedSub, newStatus, newFeedback) => {
    const applyUpdate = (item) => {
      const subs    = item.submissions.map(s =>
        s.submissionId === updatedSub.submissionId ? { ...s, status: newStatus, feedback: newFeedback } : s
      );
      const updated = { ...item, submissions: subs };
      updateItemStatus(updated);
      return updated;
    };
    setItems(prev => prev.map(applyUpdate));
    if (currentItem?.itemId) setCurrentItem(prev => applyUpdate(prev));
  }, [currentItem]);

  const handleApprove = async (submission) => {
    if (!submission?.task) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/reviews/${submission.submissionId}/approve`,
        { review_comments: feedback },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      doUpdateItem(submission, 'approved', '');
      setFeedback(''); setErrorCategory('');
      setSavingMsg('Approved!');
      setTimeout(() => setSavingMsg(''), 3000);
    } catch (err) { alert('Loi: ' + (err.response?.data?.message || err.message)); }
    finally       { setSaving(false); }
  };

  const handleReject = (submission) => {
    if (!feedback.trim()) { alert('Vui long nhap feedback khi reject.'); return; }
    setShowRejectConfirm(true);
  };

  const confirmReject = async (submission) => {
    setShowRejectConfirm(false);
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/reviews/${submission.submissionId}/reject`,
        { review_comments: feedback, error_category: errorCategory || 'other' },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      doUpdateItem(submission, 'rejected', feedback);
      setFeedback(''); setErrorCategory('');
      setSavingMsg('Rejected!');
      setTimeout(() => setSavingMsg(''), 3000);
    } catch (err) { alert('Loi: ' + (err.response?.data?.message || err.message)); }
    finally       { setSaving(false); }
  };

  const handleQuickApprove = async (item, submission) => {
    if (!submission?.task) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/reviews/${submission.submissionId}/approve`,
        { review_comments: '' },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      const applyUpdate = (i) => {
        if (i.itemId !== item.itemId) return i;
        const subs = i.submissions.map(s =>
          s.submissionId === submission.submissionId ? { ...s, status: 'approved' } : s
        );
        const updated = { ...i, submissions: subs };
        updateItemStatus(updated);
        return updated;
      };
      setItems(prev => prev.map(applyUpdate));
      if (currentItem?.itemId === item.itemId) setCurrentItem(prev => applyUpdate(prev));
      setSavingMsg('Approved!');
      setTimeout(() => setSavingMsg(''), 2000);
    } catch (err) { alert('Loi: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const handleQuickReject = async (item, submission) => {
    if (!submission?.task) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/reviews/${submission.submissionId}/reject`,
        { review_comments: 'Rejected', error_category: 'other' },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      const applyUpdate = (i) => {
        if (i.itemId !== item.itemId) return i;
        const subs = i.submissions.map(s =>
          s.submissionId === submission.submissionId ? { ...s, status: 'rejected' } : s
        );
        const updated = { ...i, submissions: subs };
        updateItemStatus(updated);
        return updated;
      };
      setItems(prev => prev.map(applyUpdate));
      if (currentItem?.itemId === item.itemId) setCurrentItem(prev => applyUpdate(prev));
      setSavingMsg('Rejected!');
      setTimeout(() => setSavingMsg(''), 2000);
    } catch (err) { alert('Loi: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const handleNextAnnotator = () => {
    if (!currentItem) return;
    const pending = currentItem.submissions.filter(s => s.status === 'pending');
    if (pending.length === 0) return;
    const idx  = pending.findIndex(s => s.annotatorId === activeAnnotatorId);
    const next = pending[(idx + 1) % pending.length];
    handleAnnotatorSelect(next);
    setVisibleAnnotators([next.annotatorId]);
  };

  const activeSubmission = currentItem?.submissions?.find(s => s.annotatorId === activeAnnotatorId);
  const pendingCount     = items.filter(i => i.status === 'pending_review' || i.status === 'partially_reviewed').length;
  const reviewedCount    = items.filter(i => i.status === 'fully_reviewed'  || i.status === 'finalized').length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-gray-700 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-400 text-xs">Dang tai...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center max-w-xs p-4">
          <p className="text-rose-400 text-xs font-semibold mb-2">{fetchError}</p>
          <button onClick={fetchQueue} className="rounded bg-violet-600 px-3 py-1.5 text-xs text-white">Thu lai</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <div className="w-60 shrink-0">
        <ReviewQueueFlatPanel
          items={items}
          currentItemId={currentItemId}
          onSelect={handleItemSelect}
          onQuickApprove={handleQuickApprove}
          onQuickReject={handleQuickReject}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 border-b border-gray-700 bg-gray-900/80 px-3 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all shrink-0"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-gray-200 truncate">{currentItem?.filename || 'Chon item'}</h2>
              <p className="text-[10px] text-gray-500">
                {items.length} item &mdash; {pendingCount} can review &mdash; {reviewedCount} da xong
              </p>
            </div>
            {currentItem && (
              <div className="flex items-center gap-1 shrink-0">
                {currentItem.submissions?.map((sub) => (
                  <button
                    key={sub.submissionId || sub.annotatorId}
                    onClick={() => { handleAnnotatorSelect(sub); handleAnnotatorToggle(sub.annotatorId); }}
                    className="w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center text-[9px] font-bold text-white transition-all hover:scale-110"
                    style={{ backgroundColor: sub.color || '#3b82f6', opacity: visibleAnnotators.includes(sub.annotatorId) ? 1 : 0.4 }}
                    title={`${sub.annotatorName} (${visibleAnnotators.includes(sub.annotatorId) ? 'hien' : 'an'})`}
                  >
                    {(sub.annotatorName || '?')[0].toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            {savingMsg && <span className="text-[10px] text-violet-400 font-medium">{savingMsg}</span>}
          </div>
        </div>

        {currentItem ? (
          currentItem.kind === 'image' ? (
            <ImageViewPanel
              item={currentItem}
              availableLabels={currentItem.availableLabels}
              visibleAnnotators={visibleAnnotators}
              activeAnnotatorId={activeAnnotatorId}
              datasetId={currentItem.datasetId}
              dataItemId={currentItem.dataItemId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-800">
              <p className="text-gray-500 text-xs">"{currentItem.kind}" chua ho tro</p>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <p className="text-gray-500 text-xs">Chon item tu danh sach</p>
          </div>
        )}
      </div>

      <div className="w-72 shrink-0">
        <ReviewPanel
          item={currentItem}
          activeSubmission={activeSubmission}
          submissions={currentItem?.submissions || []}
          visibleAnnotators={visibleAnnotators}
          onAnnotatorToggle={handleAnnotatorToggle}
          onAnnotatorSelect={handleAnnotatorSelect}
          feedback={feedback}           setFeedback={setFeedback}
          errorCategory={errorCategory} setErrorCategory={setErrorCategory}
          onApprove={handleApprove}
          onReject={handleReject}
          onNextAnnotator={handleNextAnnotator}
          saving={saving}
          isReadOnly={activeSubmission?.status === 'approved' || activeSubmission?.status === 'rejected'}
        />
      </div>

      <Dialog
        open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)}
        maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontSize: '14px', fontWeight: 700 }}>Xac nhan Reject</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '12px' }}>
            Annotator se nhan thong bao va can sua lai bai.
          </Typography>
          {feedback && (
            <div className="mt-2 rounded bg-rose-500/10 border border-rose-500/20 p-2">
              <p className="text-[11px] text-rose-300">"{feedback}"</p>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button onClick={() => setShowRejectConfirm(false)} size="small" sx={{ color: '#94a3b8', fontSize: '11px' }}>Huy</Button>
          <Button
            onClick={() => confirmReject(activeSubmission)}
            variant="contained" size="small" disabled={saving}
            sx={{ bgcolor: '#dc2626', fontSize: '11px' }}
          >
            {saving ? '...' : 'Xac nhan'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ReviewerWorkspace;

function buildItemList(taskList, projectId) {
  const itemMap = new Map();
  taskList.forEach((task) => {
    const di          = task.dataItem || {};
    const itemKey     = di.filename || di.original_name || di.originalName || task.id;
    if (!itemKey) return;

    const annotatorId   = task.annotator?.id || task.annotatorId?.id || task.annotatorId;
    const annotatorName = task.annotator?.full_name || task.annotator?.fullName || task.annotator?.username || 'Annotator';
    const color         = stringToColor(annotatorId || task.id);
    const reviewStatus  = getAnnotatorStatus(task);

    if (!itemMap.has(itemKey)) {
      const datasetId = task.datasetId?.id || task.dataset?.id ||
        (typeof task.datasetId === 'string' ? task.datasetId : null);
      const dataItemId = di.id || di._id || null;

      itemMap.set(itemKey, {
        itemId:          itemKey,
        filename:        di.originalName || di.original_name || di.filename || itemKey,
        imageUrl:        buildFileUrl(di),
        datasetId,
        dataItemId,
        kind:            getTaskKind(task),
        status:          'pending_review',
        projectName:     task.project?.name || task.projectId?.name || '',
        projectId:       task.project?.id   || task.projectId?.id   || projectId,
        guideline:       task.project?.guidelines || task.projectId?.guidelines || '',
        availableLabels: task.labelSet?.labels || task.availableLabels || [],
        submissions:     [],
      });
    }

    itemMap.get(itemKey).submissions.push({
      submissionId:  task.id,
      annotatorId,
      annotatorName,
      status:   reviewStatus,
      labels:   task.annotation_data || task.labels || {},
      feedback: task.review_comments || '',
      color,
      task,
    });
    updateItemStatus(itemMap.get(itemKey));
  });

  return sortByStatus(Array.from(itemMap.values()));
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage, signedFileUrl } from '../../lib/apiClient';
import {
  page,
  card,
  input,
  button,
  buttonSecondary,
  SectionTitle,
  StatusBadge,
} from '../_fixedShared';

const pretty = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export default function ReviewerTask() {
  const navigate = useNavigate();
  const { subtopicId: taskId } = useParams();

  const [task, setTask] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [errorCategory, setErrorCategory] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/api/tasks/${taskId}`);
      setTask(data);
      setReviewComments(data?.review_comments || '');
      setErrorCategory(data?.error_category || '');
      setImageUrl('');
      setMessage('');
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  useEffect(() => {
    load();
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;

    const resolveImageUrl = async () => {
      const directUrl = signedFileUrl(task?.data_item);
      if (directUrl) {
        setImageUrl(directUrl);
        return;
      }

      const datasetId = task?.dataset?.id || task?.project?.dataset_id || task?.data_item?.dataset_id;
      const itemId = task?.data_item?.id;
      const isImage = task?.data_item?.mime_type?.startsWith('image/');

      if (!datasetId || !itemId || !isImage) {
        setImageUrl('');
        return;
      }

      try {
        const { data } = await api.get(`/api/datasets/${datasetId}/signed-url/${itemId}`);
        if (!cancelled) {
          setImageUrl(data?.signed_url || data?.url || '');
        }
      } catch (_) {
        if (!cancelled) {
          setImageUrl('');
        }
      }
    };

    resolveImageUrl();

    return () => {
      cancelled = true;
    };
  }, [task]);

  const approve = async () => {
    try {
      await api.post(`/api/reviews/${taskId}/approve`, {
        review_comments: reviewComments || undefined,
      });
      setMessage('Đã approve task.');
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const reject = async () => {
    try {
      await api.post(`/api/reviews/${taskId}/reject`, {
        review_comments: reviewComments,
        error_category: errorCategory,
      });
      setMessage('Đã reject task.');
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const previewFallback = useMemo(() => {
    if (task?.data_item?.mime_type?.startsWith('image/')) {
      return imageUrl
        ? ''
        : 'Ảnh đang ở private storage nên FE cần signed URL. Nếu vẫn không hiện, kiểm tra endpoint /api/datasets/:id/signed-url/:itemId.';
    }
    return task?.data_item?.mime_type || 'Không có preview ảnh.';
  }, [task, imageUrl]);

  return (
    <div className={page}>
      <SectionTitle
        title={task?.data_item?.filename || 'Review Task'}
        subtitle={task?.project?.name || ''}
        right={
          <button className={buttonSecondary} onClick={() => navigate(-1)}>
            Back
          </button>
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <StatusBadge value={task?.status} />
          </div>

          {task?.data_item?.mime_type?.startsWith('image/') && imageUrl ? (
            <img
              src={imageUrl}
              alt={task?.data_item?.filename || 'preview'}
              className="max-h-[65vh] w-full rounded-xl object-contain"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-sm text-slate-400">
              {previewFallback}
            </div>
          )}

          <div className="mt-4 text-sm text-slate-400">
            Annotator: {task?.annotator?.full_name || task?.annotator?.username || '—'}
          </div>
        </div>

        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Annotation data</h2>

          <pre className="max-h-[20rem] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200">
            {pretty(task?.annotation_data) || 'No annotation data'}
          </pre>

          <div className="mt-4 space-y-3">
            <textarea
              className={`${input} min-h-[8rem]`}
              placeholder="Review comments"
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
            />

            <input
              className={input}
              placeholder="Error category"
              value={errorCategory}
              onChange={(e) => setErrorCategory(e.target.value)}
            />

            <div className="flex gap-3">
              <button type="button" className={button} onClick={approve}>
                Approve
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                onClick={reject}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
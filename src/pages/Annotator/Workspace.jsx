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
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export default function AnnotatorWorkspace() {
  const navigate = useNavigate();
  const params = useParams();
  const taskId = params?.taskId || params?.id || params?.subtopicId;

  const [task, setTask] = useState(null);
  const [annotationText, setAnnotationText] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const load = async () => {
    if (!taskId) {
      setMessage('Không tìm thấy taskId từ route.');
      return;
    }

    try {
      const { data } = await api.get(`/api/tasks/${taskId}`);
      setTask(data);
      setAnnotationText(pretty(data?.annotation_data));
      setImageUrl('');
      setMessage('');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Không tải được task.'));
    }
  };

  useEffect(() => {
    load();
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;

    const resolveImageUrl = async () => {
      const item = task?.data_item;
      const directUrl = signedFileUrl(item);

      if (directUrl) {
        setImageUrl(directUrl);
        return;
      }

      const isImage = item?.mime_type?.startsWith('image/');
      if (!isImage) {
        setImageUrl('');
        return;
      }

      const itemId = item?.id || item?._id || item?.item_id || null;
      const datasetId =
        item?.dataset_id ||
        task?.dataset_id ||
        task?.dataset?.id ||
        task?.dataset?._id ||
        task?.project?.dataset_id ||
        task?.project?.dataset?.id ||
        task?.project?.dataset?._id;

      if (!datasetId || !itemId) {
        if (!cancelled) {
          setImageUrl('');
          setMessage('Task chưa trả đủ dataset_id hoặc item_id để lấy ảnh.');
        }
        return;
      }

      try {
  const { data } = await api.get(`/api/datasets/${datasetId}`);

  const items =
    Array.isArray(data?.data_items) ? data.data_items :
    Array.isArray(data?.items) ? data.items :
    Array.isArray(data?.data?.data_items) ? data.data.data_items :
    [];

  const found = items.find(
    (x) =>
      String(x?.id) === String(itemId) ||
      String(x?._id) === String(itemId) ||
      String(x?.filename) === String(item?.filename) ||
      String(x?.original_name) === String(item?.original_name)
  );

  const foundUrl =
    found?.signed_url ||
    found?.storage_url ||
    found?.url ||
    '';

  if (foundUrl) {
    if (!cancelled) setImageUrl(foundUrl);
    return;
  }
} catch (_) {
  // bỏ qua để thử signed-url
}

      try {
        // 2) fallback signed-url nếu BE support
        const { data } = await api.get(`/api/datasets/${datasetId}/signed-url/${itemId}`);
        if (!cancelled) {
          setImageUrl(data?.signed_url || data?.url || '');
        }
      } catch (error) {
        if (!cancelled) {
          setImageUrl('');
          setMessage(getErrorMessage(error, 'File not found.'));
        }
      }
    };

    resolveImageUrl();

    return () => {
      cancelled = true;
    };
  }, [task]);

  const buildAnnotationPayload = () => {
    try {
      return annotationText ? JSON.parse(annotationText) : {};
    } catch {
      return { notes: annotationText };
    }
  };

  const saveDraft = async () => {
    try {
      await api.patch(`/api/tasks/${taskId}/annotation`, {
        annotation_data: buildAnnotationPayload(),
        status: 'in_progress',
      });
      setMessage('Đã lưu draft.');
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Lưu draft thất bại.'));
    }
  };

  const submitForReview = async () => {
    try {
      await api.patch(`/api/tasks/${taskId}/annotation`, {
        annotation_data: buildAnnotationPayload(),
        status: 'submitted',
      });
      setMessage('Đã submit for review.');
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Submit thất bại.'));
    }
  };

  const previewFallback = useMemo(() => {
    if (task?.data_item?.mime_type?.startsWith('image/')) {
      return imageUrl ? '' : 'Không lấy được URL ảnh từ dataset item hoặc signed-url.';
    }
    return task?.data_item?.mime_type || 'Không có preview ảnh.';
  }, [task, imageUrl]);

  return (
    <div className={page}>
      <SectionTitle
        title={task?.data_item?.filename || 'Workspace'}
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
            Label set: {task?.label_set?.name || task?.label_set_name || task?.label_set_id || '—'}
          </div>

          {Array.isArray(task?.label_set?.labels) && task.label_set.labels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.label_set.labels.map((label, index) => {
                const labelText =
                  typeof label === 'string'
                    ? label
                    : label?.name || label?.shortcut || `Label ${index + 1}`;

                return (
                  <span
                    key={label?.id || `${labelText}-${index}`}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                    title={typeof label === 'object' ? label?.description || '' : ''}
                  >
                    {labelText}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Annotation data</h2>

          <textarea
            className={`${input} min-h-[26rem] font-mono text-sm`}
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Nhập JSON annotation hoặc text notes..."
          />

          <div className="mt-4 flex gap-3">
            <button type="button" className={buttonSecondary} onClick={saveDraft}>
              Save draft
            </button>
            <button type="button" className={button} onClick={submitForReview}>
              Submit for review
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-400">
            Màn này chấp nhận JSON hợp lệ hoặc text notes. Nếu parse JSON fail, FE sẽ gửi notes để tránh crash.
          </div>
        </div>
      </div>
    </div>
  );
}
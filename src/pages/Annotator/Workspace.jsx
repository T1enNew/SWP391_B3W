import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) return [];
  return labels.map((label, index) => {
    if (typeof label === 'string') {
      return {
        id: `label-${index}`,
        name: label,
        color: null,
        description: '',
      };
    }
    return {
      id: label?.id || `label-${index}`,
      name: label?.name || label?.shortcut || `Label ${index + 1}`,
      color: label?.color || null,
      description: label?.description || '',
    };
  });
};

const parseBoxesFromAnnotation = (annotation) => {
  if (!annotation || typeof annotation !== 'object') return [];

  const candidates = [
    annotation?.boxes,
    annotation?.annotations,
    annotation?.bounding_boxes,
    annotation?.objects,
  ];

  const arr = candidates.find((x) => Array.isArray(x));
  if (!arr) return [];

  return arr
    .map((box, index) => {
      const x = Number(box?.x ?? box?.left ?? 0);
      const y = Number(box?.y ?? box?.top ?? 0);
      const width = Number(box?.width ?? box?.w ?? 0);
      const height = Number(box?.height ?? box?.h ?? 0);

      if (width <= 0 || height <= 0) return null;

      return {
        id: box?.id || `box-${index}-${Date.now()}`,
        labelId: box?.labelId || box?.label_id || box?.label?.id || null,
        labelName: box?.labelName || box?.label_name || box?.label?.name || 'Unlabeled',
        x,
        y,
        width,
        height,
      };
    })
    .filter(Boolean);
};

const getTaskItem = (task) => {
  return task?.data_item || task?.dataItem || null;
};

const getItemFilename = (item) => {
  return item?.filename || item?.original_name || item?.originalName || '';
};

const getItemMimeType = (item) => {
  return item?.mime_type || item?.mimeType || '';
};

const looksLikeImage = (item) => {
  const mime = (getItemMimeType(item) || '').toLowerCase();
  const filename = (getItemFilename(item) || '').toLowerCase();

  if (mime.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);
};

export default function AnnotatorWorkspace() {
  const navigate = useNavigate();
  const params = useParams();
  const taskId = params?.taskId || params?.id || params?.subtopicId;

  const [task, setTask] = useState(null);
  const [annotationText, setAnnotationText] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [boxes, setBoxes] = useState([]);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [draftBox, setDraftBox] = useState(null);

  const previewRef = useRef(null);

  const item = useMemo(() => getTaskItem(task), [task]);

  const labels = useMemo(() => normalizeLabels(task?.label_set?.labels), [task]);

  const selectedLabel = useMemo(() => {
    return labels.find((x) => String(x.id) === String(selectedLabelId)) || null;
  }, [labels, selectedLabelId]);

  const buildAnnotationPayload = (nextBoxes = boxes) => ({
    type: 'bounding_boxes',
    boxes: nextBoxes.map((box) => ({
      id: box.id,
      label_id: box.labelId,
      label_name: box.labelName,
      x: Number(box.x.toFixed(4)),
      y: Number(box.y.toFixed(4)),
      width: Number(box.width.toFixed(4)),
      height: Number(box.height.toFixed(4)),
    })),
  });

  const syncAnnotationText = (nextBoxes) => {
    setAnnotationText(JSON.stringify(buildAnnotationPayload(nextBoxes), null, 2));
  };

  const load = async () => {
    if (!taskId) {
      setMessage('Không tìm thấy taskId từ route.');
      return;
    }

    try {
      const { data } = await api.get(`/api/tasks/${taskId}`);
      setTask(data);
      setImageUrl('');
      setMessage('');

      const parsedBoxes = parseBoxesFromAnnotation(data?.annotation_data);
      setBoxes(parsedBoxes);

      if (parsedBoxes.length > 0) {
        setAnnotationText(JSON.stringify(buildAnnotationPayload(parsedBoxes), null, 2));
      } else {
        setAnnotationText(pretty(data?.annotation_data));
      }
    } catch (error) {
      setMessage(getErrorMessage(error, 'Không tải được task.'));
    }
  };

  useEffect(() => {
    load();
  }, [taskId]);

  useEffect(() => {
    if (!selectedLabelId && labels.length > 0) {
      setSelectedLabelId(labels[0].id);
    }
  }, [labels, selectedLabelId]);

  useEffect(() => {
    let cancelled = false;

    const resolveImageUrl = async () => {
      const directUrl = signedFileUrl(item);
      if (directUrl) {
        setImageUrl(directUrl);
        return;
      }

      if (!looksLikeImage(item)) {
        setImageUrl('');
        return;
      }

      const datasetId =
        item?.dataset_id ||
        item?.datasetId ||
        task?.dataset_id ||
        task?.dataset?.id ||
        task?.dataset?._id ||
        task?.project?.dataset_id ||
        task?.project?.dataset?.id ||
        task?.project?.dataset?._id;

      const itemId = item?.id || item?._id || item?.item_id || item?.itemId || null;
      const itemFilename = getItemFilename(item);

      if (!datasetId) {
        if (!cancelled) {
          setImageUrl('');
          setMessage('Task chưa trả đủ dataset_id để lấy ảnh.');
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

        const found = items.find((x) => {
          const xId = x?.id || x?._id || x?.item_id || x?.itemId || null;
          const xFilename = x?.filename || x?.original_name || x?.originalName || '';

          if (itemId && xId && String(xId) === String(itemId)) return true;
          if (itemFilename && xFilename && String(xFilename) === String(itemFilename)) return true;
          return false;
        });

        const foundUrl =
          found?.signed_url ||
          found?.storage_url ||
          found?.url ||
          found?.file_url ||
          found?.public_url ||
          '';

        if (foundUrl) {
          if (!cancelled) {
            setImageUrl(foundUrl);
            setMessage('');
          }
          return;
        }

        const fallbackDirect =
          item?.storage_url ||
          item?.url ||
          item?.file_url ||
          item?.public_url ||
          '';

        if (fallbackDirect) {
          if (!cancelled) {
            setImageUrl(fallbackDirect);
            setMessage('');
          }
          return;
        }

        if (!cancelled) {
          setImageUrl('');
          setMessage('Không lấy được URL ảnh từ dataset detail.');
        }
      } catch (error) {
        if (!cancelled) {
          setImageUrl('');
          setMessage(getErrorMessage(error, 'File not found.'));
        }
      }
    };

    if (task) {
      resolveImageUrl();
    }

    return () => {
      cancelled = true;
    };
  }, [task, item]);

  const getRelativePoint = (event) => {
    const container = previewRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    return { x, y };
  };

  const handleMouseDown = (event) => {
    if (!imageUrl) return;
    if (!selectedLabel) {
      setMessage('Hãy chọn một label trước khi khoanh vùng.');
      return;
    }

    const point = getRelativePoint(event);
    if (!point) return;

    setDraftBox({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    });
  };

  const handleMouseMove = (event) => {
    if (!draftBox) return;
    const point = getRelativePoint(event);
    if (!point) return;

    setDraftBox((prev) => ({
      ...prev,
      currentX: point.x,
      currentY: point.y,
    }));
  };

  const handleMouseUp = () => {
    if (!draftBox || !selectedLabel) return;

    const x = Math.min(draftBox.startX, draftBox.currentX);
    const y = Math.min(draftBox.startY, draftBox.currentY);
    const width = Math.abs(draftBox.currentX - draftBox.startX);
    const height = Math.abs(draftBox.currentY - draftBox.startY);

    setDraftBox(null);

    if (width < 0.01 || height < 0.01) return;

    const nextBoxes = [
      ...boxes,
      {
        id: `box-${Date.now()}`,
        labelId: selectedLabel.id,
        labelName: selectedLabel.name,
        x,
        y,
        width,
        height,
      },
    ];

    setBoxes(nextBoxes);
    syncAnnotationText(nextBoxes);
  };

  const handleMouseLeave = () => {
    if (draftBox) handleMouseUp();
  };

  const removeBox = (boxId) => {
    const nextBoxes = boxes.filter((x) => x.id !== boxId);
    setBoxes(nextBoxes);
    syncAnnotationText(nextBoxes);
  };

  const clearBoxes = () => {
    setBoxes([]);
    syncAnnotationText([]);
  };

  const undoLastBox = () => {
    const nextBoxes = boxes.slice(0, -1);
    setBoxes(nextBoxes);
    syncAnnotationText(nextBoxes);
  };

  const saveDraft = async () => {
    try {
      let payload;

      try {
        payload = annotationText ? JSON.parse(annotationText) : buildAnnotationPayload();
      } catch {
        payload = buildAnnotationPayload();
      }

      await api.patch(`/api/tasks/${taskId}/annotation`, {
        annotation_data: payload,
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
      let payload;

      try {
        payload = annotationText ? JSON.parse(annotationText) : buildAnnotationPayload();
      } catch {
        payload = buildAnnotationPayload();
      }

      await api.patch(`/api/tasks/${taskId}/annotation`, {
        annotation_data: payload,
        status: 'submitted',
      });

      setMessage('Đã submit for review.');
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Submit thất bại.'));
    }
  };

  const previewFallback = useMemo(() => {
    if (looksLikeImage(item)) {
      return imageUrl ? '' : 'Không lấy được URL ảnh từ dataset detail.';
    }
    return getItemMimeType(item) || 'Không có preview ảnh.';
  }, [item, imageUrl]);

  const draftStyle = useMemo(() => {
    if (!draftBox) return null;

    const left = Math.min(draftBox.startX, draftBox.currentX) * 100;
    const top = Math.min(draftBox.startY, draftBox.currentY) * 100;
    const width = Math.abs(draftBox.currentX - draftBox.startX) * 100;
    const height = Math.abs(draftBox.currentY - draftBox.startY) * 100;

    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  }, [draftBox]);

  return (
    <div className={page}>
      <SectionTitle
        title={getItemFilename(item) || 'Workspace'}
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

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <StatusBadge value={task?.status} />
          </div>

          {looksLikeImage(item) && imageUrl ? (
            <>
              <div
                ref={previewRef}
                className="relative inline-block max-w-full select-none overflow-hidden rounded-xl border border-slate-700"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={imageUrl}
                  alt={getItemFilename(item) || 'preview'}
                  className="block max-h-[65vh] w-full rounded-xl object-contain"
                  draggable={false}
                />

                {boxes.map((box) => (
                  <div
                    key={box.id}
                    className="absolute border-2 border-cyan-400 bg-cyan-400/10"
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.width * 100}%`,
                      height: `${box.height * 100}%`,
                    }}
                  >
                    <div className="absolute left-0 top-0 -translate-y-full rounded bg-cyan-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {box.labelName}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBox(box.id);
                      }}
                      className="absolute right-0 top-0 -translate-y-full rounded bg-rose-500 px-1.5 py-0.5 text-[10px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {draftStyle ? (
                  <div
                    className="absolute border-2 border-dashed border-amber-400 bg-amber-300/10"
                    style={draftStyle}
                  />
                ) : null}
              </div>

              <div className="mt-4 text-xs text-slate-400">
                Chọn label bên dưới, rồi kéo chuột trên ảnh để tạo bounding box.
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-sm text-slate-400">
              {previewFallback}
            </div>
          )}

          <div className="mt-4 text-sm text-slate-400">
            Label set: {task?.label_set?.name || task?.label_set_name || task?.label_set_id || '—'}
          </div>

          {labels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {labels.map((label) => {
                const active = String(label.id) === String(selectedLabelId);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => setSelectedLabelId(label.id)}
                    title={label.description || ''}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      active
                        ? 'border-blue-400 bg-blue-500/20 text-white'
                        : 'border-slate-700 text-slate-200'
                    }`}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={buttonSecondary}
              onClick={undoLastBox}
              disabled={boxes.length === 0}
            >
              Undo
            </button>
            <button
              type="button"
              className={buttonSecondary}
              onClick={clearBoxes}
              disabled={boxes.length === 0}
            >
              Clear all
            </button>
          </div>
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
            Màn này hỗ trợ bounding box cơ bản. Chọn label rồi kéo chuột trên ảnh để khoanh vùng.
          </div>
        </div>
      </div>
    </div>
  );
}
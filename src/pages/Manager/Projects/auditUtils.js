import React from 'react';
import { CheckCircle as CheckCircleIcon, Cancel as CancelIcon, Pending as PendingIcon } from '@mui/icons-material';
import { API_URL } from '../../../config/api';

export const getStatusIcon = (status) => {
  switch (status) {
    case 'approved': return <CheckCircleIcon className="text-green-600" fontSize="small" />;
    case 'rejected': return <CancelIcon className="text-red-600" fontSize="small" />;
    case 'submitted':
    case 'pending':  return <PendingIcon className="text-yellow-600" fontSize="small" />;
    default:         return null;
  }
};

export const getTaskKind = (task) => {
  const mimeType = (task.dataItem?.mimeType || '').toLowerCase();
  const filename  = (task.dataItem?.filename || '').toLowerCase();
  const path      = (task.dataItem?.path || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';

  const source = `${filename} ${path}`;
  if (/\.(png|jpe?g|jfif|gif|webp|bmp|svg)$/.test(source)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(source))        return 'audio';
  if (/\.(txt|json|csv|md|log|xml)$/.test(source))          return 'text';
  return 'other';
};

export const getDataItemUrl = (task) => {
  const p = task?.dataItem?.path;
  if (!p) return '';
  return `${API_URL}/${String(p).replace(/^\/+/, '')}`;
};

export const getAnnotatorImageObjects = (task) => {
  const objects = task?.labels?.objects;
  if (!Array.isArray(objects)) return [];
  return objects
    .map((obj, idx) => ({
      id: obj?.id || idx,
      label: obj?.label || '-',
      bbox: Array.isArray(obj?.bbox) ? obj.bbox.map(v => Number(v)) : null,
      confidence: obj?.confidence,
    }))
    .filter(obj => Array.isArray(obj.bbox) && obj.bbox.length === 4 && obj.bbox.every(v => Number.isFinite(v)));
};

export const getLabelColor = (label = '') => {
  const palette = ['#1976d2', '#16a34a', '#ea580c', '#9333ea', '#0f766e', '#dc2626', '#2563eb'];
  const key = String(label);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
};

export const getNormalizedAudioSegments = (task) => {
  const segments = task?.labels?.segments;
  if (!Array.isArray(segments)) return [];
  return segments
    .map((seg, idx) => ({
      id:    seg?.id || `segment_${idx + 1}`,
      start: Number(seg?.start ?? seg?.startTime ?? 0),
      end:   Number(seg?.end   ?? seg?.endTime   ?? 0),
      label: seg?.label || 'unknown',
      note:  seg?.note  || '',
    }))
    .filter(seg => Number.isFinite(seg.start) && Number.isFinite(seg.end) && seg.end > seg.start);
};

export const getSpanText = (span, textContent) => {
  if (span?.text) return span.text;
  if (!textContent) return '';
  if (typeof span?.start !== 'number' || typeof span?.end !== 'number') return '';
  return textContent.slice(span.start, span.end);
};

export const renderAnnotatorLabels = (task, textContent, getNormAudio) => {
  const labels = task?.labels;
  if (!labels || (typeof labels === 'object' && Object.keys(labels).length === 0))
    return <div className="text-sm text-gray-500">Annotator chưa khoanh/gán label.</div>;

  if (getTaskKind(task) === 'audio') {
    const segments = getNormAudio(task);
    return (
      <div className="space-y-3">
        {segments.length > 0 ? segments.map((seg, idx) => (
          <div key={seg.id || idx} className="text-sm text-gray-800 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <div><strong>Segment:</strong> #{idx + 1}</div>
            <div><strong>Label:</strong> {seg.label}</div>
            <div><strong>Range:</strong> {seg.start.toFixed(2)}s - {seg.end.toFixed(2)}s</div>
            {!!seg.note && <div><strong>Note:</strong> {seg.note}</div>}
          </div>
        )) : <div className="text-sm text-gray-500">Không có segment audio.</div>}
        {!!labels.note && <div className="text-sm text-gray-700"><strong>Note:</strong> {labels.note}</div>}
      </div>
    );
  }

  if (Array.isArray(labels.spans) && labels.spans.length > 0) {
    return (
      <div className="space-y-2">
        {labels.spans.map((span, idx) => (
          <div key={idx} className="text-sm text-gray-800 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <div><strong>Label:</strong> {span?.label || '-'}</div>
            {typeof span?.start === 'number' && typeof span?.end === 'number' && (
              <div><strong>Range:</strong> {span.start} - {span.end}</div>
            )}
            {!!getSpanText(span, textContent) && <div><strong>Text:</strong> {getSpanText(span, textContent)}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (typeof labels.label === 'string')
    return <div className="text-sm text-gray-800"><strong>Label:</strong> {labels.label}</div>;

  return <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(labels, null, 2)}</pre>;
};

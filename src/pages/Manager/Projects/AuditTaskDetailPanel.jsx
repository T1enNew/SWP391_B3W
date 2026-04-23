import React from 'react';
import { Chip, IconButton, Paper, Typography } from '@mui/material';
import AudioAnnotator from '../../../components/AudioAnnotator';
import {
  getTaskKind, getDataItemUrl, getAnnotatorImageObjects,
  getLabelColor, getNormalizedAudioSegments, renderAnnotatorLabels,
} from './auditUtils';

const AuditTaskDetailPanel = ({ task, textContent, onClose }) => {
  if (!task) return null;
  const kind = getTaskKind(task);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-100 w-full max-w-2xl h-full overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chi tiết task #{task.id.slice(-6)} ({kind.toUpperCase()})
            </h2>
            <p className="text-xs text-gray-500 mt-1">Hiển thị đầy đủ kết quả reviewer đã chấm: vote, comment và lỗi.</p>
          </div>
          <IconButton onClick={onClose}>✕</IconButton>
        </div>

        <div className="p-6 space-y-6">
          {/* Media preview */}
          <div className="bg-white rounded-lg p-4 min-h-[180px] flex items-center justify-center">
            {kind === 'image' && task.dataItem?.path ? (
              <div className="relative inline-block max-h-[520px] max-w-full overflow-auto border border-gray-200 rounded">
                <img
                  src={getDataItemUrl(task)}
                  alt={task.dataItem?.filename || 'Task preview'}
                  className="max-h-[500px] w-auto max-w-full object-contain block"
                />
                {getAnnotatorImageObjects(task).map(obj => {
                  const [x1, y1, x2, y2] = obj.bbox;
                  const left   = Math.min(x1, x2);
                  const top    = Math.min(y1, y2);
                  const width  = Math.max(Math.abs(x2 - x1), 1);
                  const height = Math.max(Math.abs(y2 - y1), 1);
                  const color  = getLabelColor(obj.label);
                  return (
                    <div key={obj.id} className="absolute" style={{
                      left: `${left}%`, top: `${top}%`,
                      width: `${width}%`, height: `${height}%`,
                      border: `2px solid ${color}`,
                      backgroundColor: `${color}22`,
                      boxSizing: 'border-box',
                    }}>
                      <div className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-semibold text-white whitespace-nowrap"
                        style={{ backgroundColor: color }}>
                        {obj.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : kind === 'audio' && task.dataItem?.path ? (
              <div className="w-full">
                <AudioAnnotator
                  audioUrl={getDataItemUrl(task)}
                  labelSet={task?.availableLabels || []}
                  initialSegments={getNormalizedAudioSegments(task)}
                  readOnly
                />
              </div>
            ) : kind === 'text' ? (
              <div className="w-full text-sm text-gray-700 whitespace-pre-wrap">{textContent || 'No content'}</div>
            ) : (
              <div className="text-gray-500">Không có preview cho loại dữ liệu này.</div>
            )}
          </div>

          {/* Annotator results */}
          <div>
            <div className="mb-2 inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 border border-slate-700 shadow-sm">
              <Typography variant="subtitle2" className="!text-slate-100 !font-bold tracking-wide">Annotator Results</Typography>
            </div>
            <Paper className="p-4 bg-gray-50 space-y-3 mb-4">
              <div className="rounded border border-gray-200 bg-white p-3">
                {renderAnnotatorLabels(task, textContent, getNormalizedAudioSegments)}
              </div>
            </Paper>

            {/* Reviewer results */}
            <div className="mb-2 inline-flex items-center rounded-md bg-blue-700 px-3 py-1.5 border border-blue-600 shadow-sm">
              <Typography variant="subtitle2" className="!text-white !font-bold tracking-wide">Reviewer Results (chi tiết chấm bài)</Typography>
            </div>
            <Paper className="p-4 bg-gray-50 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Chip size="small"
                  label={task.status?.toUpperCase() || 'ASSIGNED'}
                  color={task.status === 'approved' ? 'success' : task.status === 'rejected' ? 'error' : 'warning'}
                />
                <span className="text-xs text-gray-500">
                  Reviewed at: {task.reviewedAt ? new Date(task.reviewedAt).toLocaleString('vi-VN') : 'Chưa review'}
                </span>
              </div>

              <div className="rounded border border-gray-200 bg-white p-3">
                <div className="text-xs font-semibold text-gray-500 mb-1">Overall Reviewer Comment</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{task.reviewComments || 'Không có comment tổng quan.'}</div>
              </div>

              <div className="rounded border border-gray-200 bg-white p-3">
                <div className="text-xs font-semibold text-gray-500 mb-1">Reviewer Votes</div>
                {Array.isArray(task.reviewers) && task.reviewers.length > 0 ? (
                  <div className="space-y-2">
                    {task.reviewers.map((rv, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div>
                          <div className="font-medium text-gray-800">{rv.reviewerId?.fullName || rv.reviewerId?.username || 'Reviewer'}</div>
                          <div className="text-xs text-gray-500">{rv.reviewedAt ? new Date(rv.reviewedAt).toLocaleString('vi-VN') : 'Pending'}</div>
                          {!!rv.comment && <div className="text-xs text-gray-600 mt-1">{rv.comment}</div>}
                        </div>
                        <Chip size="small"
                          label={(rv.status || 'pending').toUpperCase()}
                          color={rv.status === 'approved' ? 'success' : rv.status === 'rejected' ? 'error' : 'warning'}
                        />
                      </div>
                    ))}
                  </div>
                ) : <div className="text-sm text-gray-500">Chưa có reviewer votes.</div>}
              </div>

              <div className="rounded border border-gray-200 bg-white p-3">
                <div className="text-xs font-semibold text-gray-500 mb-1">Issue Category</div>
                <div className="text-sm text-gray-800">{task.errorCategory || 'Không có phân loại lỗi.'}</div>
              </div>

              {Array.isArray(task.reviewNotes) && task.reviewNotes.length > 0 && (
                <div className="rounded border border-gray-200 bg-white p-3">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Object / Segment Notes</div>
                  <div className="space-y-2">
                    {task.reviewNotes.map((note, idx) => (
                      <div key={idx} className="text-sm text-gray-800 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div><strong>Label:</strong> {note.label || '-'}</div>
                        {Array.isArray(note.bbox) && <div><strong>BBox:</strong> [{note.bbox.join(', ')}]</div>}
                        <div><strong>Comment:</strong> {note.comment || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Paper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTaskDetailPanel;

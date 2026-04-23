import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { normalizeTask } from '../../utils/taskAdapter';
import ImageAnnotator from '../../components/ImageAnnotator';
import AudioAnnotator from '../../components/AudioAnnotator';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { getAuthHeaders } from '../../utils/auth';

const getTaskDataItem = (t) => {
  return t?.dataItem || t?.data_item || t?.datasetItemId || t?.itemId || null;
};

const getTaskKind = (t) => {
  const item = getTaskDataItem(t);
console.log('ITEM =', item);
console.log('URL =', buildFileUrl(item));
  const mt = (item?.mimeType || item?.mime_type || '').toLowerCase();

  const fileName = (
    item?.originalName ||
    item?.original_name ||
    item?.filename ||
    item?.path ||
    ''
  ).toLowerCase();

  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('audio/')) return 'audio';
  if (mt.startsWith('text/')) return 'text';
  if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName)) return 'audio';
  if (mt === 'video/mp4' && /\.(mp4|m4a)$/i.test(fileName)) return 'audio';
  if (['application/json', 'application/xml', 'text/csv'].includes(mt)) return 'text';
  if (/\.(txt|csv|json|xml)$/i.test(fileName)) return 'text';

  return 'other';
};

const buildFileUrl = (dataItem) => {
  if (!dataItem) return '';

  const directUrl =
    dataItem.signedUrl ||
    dataItem.signed_url ||
    dataItem.storageUrl ||
    dataItem.storage_url ||
    dataItem.url ||
    '';

  if (directUrl) return directUrl;

  const baseUrl = API_URL.replace(/\/+$/, '');

  const rawPath = (
    dataItem.path ||
    dataItem.storagePath ||
    dataItem.storage_path ||
    dataItem.filename ||
    dataItem.originalName ||
    dataItem.original_name ||
    ''
  ).replace(/^\/+/, '');

  if (!rawPath) return '';
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  return `${baseUrl}/${rawPath}`;
};

// Status configuration
const TASK_STATUS = {
  assigned: { label: 'Chưa làm', color: 'bg-gray-600', textColor: 'text-gray-300', dotColor: 'bg-gray-400' },
  in_progress: { label: 'Đang làm', color: 'bg-blue-600', textColor: 'text-blue-300', dotColor: 'bg-blue-400' },
  completed: { label: 'Đã xong', color: 'bg-emerald-600', textColor: 'text-emerald-300', dotColor: 'bg-emerald-400' },
  submitted: { label: 'Đã nộp', color: 'bg-orange-600', textColor: 'text-orange-300', dotColor: 'bg-orange-400' },
  resubmitted: { label: 'Đã nộp lại', color: 'bg-orange-700', textColor: 'text-orange-200', dotColor: 'bg-orange-500' },
  approved: { label: 'Đã duyệt', color: 'bg-emerald-600', textColor: 'text-emerald-300', dotColor: 'bg-emerald-400' },
  rejected: { label: 'Bị trả lại', color: 'bg-rose-600', textColor: 'text-rose-300', dotColor: 'bg-rose-400' },
  revised: { label: 'Đang sửa', color: 'bg-amber-600', textColor: 'text-amber-300', dotColor: 'bg-amber-400' },
};

// ===== LEFT PANEL: Task List =====
const TaskListPanel = ({ tasks, currentTaskId, onSelect, projectName }) => {
  const statusCounts = tasks.reduce((acc, t) => {
    const s = t.status || 'assigned';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const getStatusConfig = (status) => TASK_STATUS[status] || TASK_STATUS.assigned;

  const priorityOrder = ['rejected', 'revised', 'in_progress', 'assigned', 'completed', 'submitted', 'resubmitted', 'approved'];
  const sortedTasks = [...tasks].sort((a, b) => {
    const aP = priorityOrder.indexOf(a.status);
    const bP = priorityOrder.indexOf(b.status);
    if (aP !== bP) return aP - bP;
    return 0;
  });

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700 shrink-0">
        <h3 className="text-sm font-bold text-gray-200 mb-1">Danh sach Item</h3>
        <p className="text-xs text-gray-500 truncate">{projectName}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(statusCounts).map(([status, count]) => {
            const cfg = getStatusConfig(status);
            return (
              <span key={status} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color} ${cfg.textColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                {count} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedTasks.map((task, idx) => {
          const cfg = getStatusConfig(task.status);
          const isActive = task.id === currentTaskId;
          const filename = task.dataItem?.originalName || task.dataItem?.filename || `Item ${idx + 1}`;
          const kind = getTaskKind(task);
          return (
            <div
              key={task.id}
              onClick={() => onSelect(task.id)}
              className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-2 ${
                isActive ? 'bg-blue-600/15 border-blue-500' : 'border-transparent hover:bg-gray-800/60 hover:border-gray-600'
              }`}
            >
              {task.status === 'completed' ? (
                <span className="w-5 h-5 rounded-full shrink-0 bg-emerald-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotColor} ${task.status === 'rejected' ? 'animate-pulse' : ''}`} />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-300' : 'text-gray-300 group-hover:text-gray-100'}`}>{filename}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {kind === 'image' && 'Hinh anh'}
                  {kind === 'audio' && 'Audio'}
                  {kind === 'text' && 'Van ban'}
                  {kind === 'other' && 'File'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color} ${cfg.textColor}`}>{cfg.label}</span>
            </div>
          );
        })}
        {sortedTasks.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">Khong co item nao trong project nay</div>
        )}
      </div>
    </div>
  );
};

// ===== RIGHT PANEL: Info & Actions =====
const InfoPanel = ({ task, onReset, saving, allDone, onSubmitProject, annotations, textSpans, audioLabels, onApplyAiSuggestions }) => {
  const [rightTab, setRightTab] = useState('info');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiApplied, setAiApplied] = useState(false);
  const labels = task?.availableLabels || [];
  const isReadOnly = ['submitted', 'resubmitted', 'approved'].includes(task?.status);
  const hasFeedback = task?.status === 'rejected' && (task?.reviewComments || task?.rejectionReason);
  const feedback = task?.reviewComments || task?.rejectionReason || '';
  const kind = getTaskKind(task);

  const handleAiPreLabel = async (apply = false) => {
    if (!task?.id) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await axios.post(
        `${API_URL}/api/ai/pre-label/${task.id}?apply=${apply}`,
        {},
        { headers: getAuthHeaders() }
      );
      setAiSuggestions(res.data);
      if (apply) {
        setAiApplied(true);
        if (onApplyAiSuggestions && res.data?.suggestions) {
          onApplyAiSuggestions(res.data.suggestions);
        }
      }
    } catch (err) {
      setAiError(err?.response?.data?.message || 'AI gặp lỗi, vui lòng thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  // Reset AI state when task changes
  React.useEffect(() => {
    setAiSuggestions(null);
    setAiError('');
    setAiApplied(false);
  }, [task?.id]);

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      <div className="flex border-b border-gray-700 shrink-0">
        {[
          { key: 'info', label: 'Thông tin' },
          { key: 'labels', label: 'Nhãn' },
          { key: 'coords', label: 'Tọa độ' },
          { key: 'guide', label: 'Hướng dẫn' },
          ...(kind === 'image' ? [{ key: 'ai', label: '✨ AI' }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRightTab(tab.key)}
            className={`flex-1 px-2 py-3 text-xs font-semibold transition-all border-b-2 ${
              rightTab === tab.key
                ? tab.key === 'ai'
                  ? 'text-purple-400 border-purple-500 bg-purple-500/5'
                  : 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {rightTab === 'coords' && (
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tọa độ Gán nhãn</h4>
            {kind === 'image' && (
              annotations.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Chưa có vùng nào được khoanh.</p>
              ) : (
                <div className="space-y-2">
                  {annotations.map((ann, i) => (
                    <div key={ann.id || i} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: task?.availableLabels?.find(l => l.name === ann.label)?.color || '#3b82f6' }} />
                        <span className="text-xs font-semibold text-gray-200">{ann.label || 'Không có nhãn'}</span>
                        <span className="ml-auto text-xs text-gray-500">#{i + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-400 font-mono">
                        <span>x1: {ann.bbox?.[0]?.toFixed(2)}%</span>
                        <span>y1: {ann.bbox?.[1]?.toFixed(2)}%</span>
                        <span>x2: {ann.bbox?.[2]?.toFixed(2)}%</span>
                        <span>y2: {ann.bbox?.[3]?.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {kind === 'text' && (
              textSpans.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Chưa có vùng văn bản nào được chọn.</p>
              ) : (
                <div className="space-y-2">
                  {textSpans.map((span, i) => (
                    <div key={span.id || i} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-gray-200">{span.label || 'Không có nhãn'}</span>
                        <span className="ml-auto text-xs text-gray-500">#{i + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-400 font-mono">
                        <span>Bắt đầu: {span.start}</span>
                        <span>Kết thúc: {span.end}</span>
                      </div>
                      {span.text && <p className="text-xs text-gray-500 mt-1 truncate">"{span.text}"</p>}
                    </div>
                  ))}
                </div>
              )
            )}
            {kind === 'audio' && (
              !(audioLabels?.segments?.length) ? (
                <p className="text-sm text-gray-500 italic">Chưa có đoạn âm thanh nào được chọn.</p>
              ) : (
                <div className="space-y-2">
                  {audioLabels.segments.map((seg, i) => (
                    <div key={seg.id || i} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-gray-200">{seg.label || 'Không có nhãn'}</span>
                        <span className="ml-auto text-xs text-gray-500">#{i + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-400 font-mono">
                        <span>Bắt đầu: {typeof seg.start === 'number' ? seg.start.toFixed(2) : seg.start}s</span>
                        <span>Kết thúc: {typeof seg.end === 'number' ? seg.end.toFixed(2) : seg.end}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {kind !== 'image' && kind !== 'text' && kind !== 'audio' && (
              <p className="text-sm text-gray-500 italic">Không hỗ trợ hiển thị tọa độ cho loại file này.</p>
            )}
          </div>
        )}
        {rightTab === 'info' && (
          <div className="p-4 space-y-4">
            {task?.projectId?.name && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project</h4>
                <p className="text-sm font-semibold text-gray-200">{task.projectId.name}</p>
                {task?.projectId?.deadline && (
                  <p className="text-xs text-gray-500 mt-0.5">Deadline: {new Date(task.projectId.deadline).toLocaleString('vi-VN')}</p>
                )}
              </div>
            )}
            {task?.datasetId?.name && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dataset</h4>
                <p className="text-sm font-semibold text-gray-200">{task.datasetId.name}</p>
              </div>
            )}
            {task?.dataItem && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">File</h4>
                <p className="text-sm text-gray-300 break-all">{task.dataItem.originalName || task.dataItem.filename || 'Khong co ten'}</p>
                {task.dataItem.mimeType && <p className="text-xs text-gray-500 mt-0.5">{task.dataItem.mimeType}</p>}
              </div>
            )}
            {hasFeedback && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Phan hoi tu Reviewer
                </h4>
                <p className="text-sm text-rose-300 leading-relaxed">{feedback}</p>
                <p className="text-xs text-rose-500/70 mt-2">Vui long doc phan hoi va chinh sua truoc khi nop lai.</p>
              </div>
            )}
            {task?.status && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trang thai</h4>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TASK_STATUS[task.status]?.color || 'bg-gray-600'} ${TASK_STATUS[task.status]?.textColor || 'text-gray-300'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${TASK_STATUS[task.status]?.dotColor || 'bg-gray-400'}`} />
                  {TASK_STATUS[task.status]?.label || task.status}
                </span>
              </div>
            )}
            {labels.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nhan co san ({labels.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((lbl) => (
                    <span key={lbl.name} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: (lbl.color || '#3b82f6') + '20', color: lbl.color || '#3b82f6', border: `1px solid ${(lbl.color || '#3b82f6')}40` }}>
                      {lbl.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {rightTab === 'labels' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Danh sach Nhan</h4>
              {labels.length === 0 ? (
                <p className="text-sm text-gray-500">Khong co nhan nao duoc dinh nghia.</p>
              ) : (
                <div className="space-y-2">
                  {labels.map((lbl) => (
                    <div key={lbl.name} className="flex items-start gap-3 rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                      <div className="w-4 h-4 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: lbl.color || '#3b82f6' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-200">{lbl.name}</p>
                        {lbl.description && <p className="text-xs text-gray-500 mt-0.5">{lbl.description}</p>}
                        {lbl.shortcut && <p className="text-xs text-gray-600 mt-0.5">Shortcut: {lbl.shortcut}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {rightTab === 'guide' && (
          <div className="p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Huong dan</h4>
            <p className="text-sm text-gray-500 italic">Khong co huong dan.</p>
            {task?.projectId?.questions && task.projectId.questions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cau hoi</h4>
                <div className="space-y-2">
                  {task.projectId.questions.map((q, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                      <p className="text-sm font-medium text-gray-200">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {rightTab === 'ai' && kind === 'image' && (
          <div className="p-4 space-y-4">
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3">
              <p className="text-xs text-purple-300 font-semibold mb-0.5">AI Gợi ý nhãn (Google Gemini)</p>
              <p className="text-xs text-purple-400/70">AI phân tích ảnh và gợi ý nhãn phù hợp từ bộ nhãn của task.</p>
            </div>
            {isReadOnly ? (
              <p className="text-xs text-gray-500 italic">Task đã nộp, không thể dùng AI gợi ý.</p>
            ) : (
              <>
                <button
                  onClick={() => handleAiPreLabel(false)}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-all"
                >
                  {aiLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Hỏi AI gợi ý nhãn
                    </>
                  )}
                </button>
                {aiError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3">
                    <p className="text-xs text-rose-400">{aiError}</p>
                  </div>
                )}
                {aiSuggestions && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kết quả gợi ý</p>
                      <span className="text-xs text-purple-400/70">{aiSuggestions.model || 'Gemini'}</span>
                    </div>
                    {aiSuggestions.suggestions?.length === 0 && (
                      <p className="text-sm text-gray-500 italic">AI không tìm thấy nhãn phù hợp.</p>
                    )}
                    <div className="space-y-2">
                      {aiSuggestions.suggestions?.map((s, i) => {
                        const labelInfo = labels.find(l => l.name === s.name);
                        const pct = Math.round((s.confidence || 0) * 100);
                        return (
                          <div key={i} className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              {labelInfo && (
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: labelInfo.color || '#a855f7' }} />
                              )}
                              <span className="text-sm font-semibold text-gray-200 flex-1">{s.name}</span>
                              <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-gray-500'}`}>{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden mb-2">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-gray-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {s.reasoning && (
                              <p className="text-xs text-gray-500 leading-relaxed">{s.reasoning}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {!aiApplied && aiSuggestions.suggestions?.length > 0 && (
                      <button
                        onClick={() => {
                          if (onApplyAiSuggestions) onApplyAiSuggestions(aiSuggestions.suggestions);
                          setAiApplied(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-semibold text-white transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Áp dụng nhãn lên ảnh
                      </button>
                    )}
                    {aiApplied && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-center">
                        <p className="text-xs text-emerald-400 font-medium">Đã lưu gợi ý AI vào task</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-gray-700 p-4 space-y-2 shrink-0 bg-gray-900/80">
        {!isReadOnly && (
          <button onClick={onReset} disabled={saving}
            className="w-full rounded-lg border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 px-4 py-2 text-xs font-medium transition-all disabled:opacity-30">
            Reset nhãn
          </button>
        )}
        {['submitted', 'resubmitted'].includes(task?.status) && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-center">
            <p className="text-xs text-yellow-400 font-medium">Project đã nộp, chờ reviewer duyệt</p>
          </div>
        )}
        {task?.status === 'approved' && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
            <p className="text-xs text-emerald-400 font-medium">Task đã được reviewer duyệt</p>
          </div>
        )}
        <button onClick={() => window.history.back()}
          className="w-full rounded-lg border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300 px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2 mt-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay về Project
        </button>
      </div>
    </div>
  );
};

// ===== MIDDLE PANEL: Annotation Area =====
const AnnotationArea = ({ task, onAnnotationsChange, onLabelsChange, annotations, labels, textSpans, setTextSpans, annotationNote, setAnnotationNote }) => {
  const kind = getTaskKind(task);
  const textContainerRef = useRef(null);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  const renderTextWithSpans = () => {
    if (!task) return null;
    const textContent = task._textContent || '';
    if (!textContent) return <p className="text-gray-500 text-sm">Khong co noi dung van ban.</p>;
    if (textSpans.length === 0) return <pre className="whitespace-pre-wrap text-gray-300 text-sm">{textContent}</pre>;
    const sortedSpans = [...textSpans].sort((a, b) => a.start - b.start);
    const parts = [];
    let lastIndex = 0;
    sortedSpans.forEach((span) => {
      if (span.start > lastIndex) parts.push({ text: textContent.substring(lastIndex, span.start), isSpan: false });
      const labelInfo = task?.availableLabels?.find((l) => l.name === span.label);
      parts.push({ text: textContent.substring(span.start, span.end), isSpan: true, spanId: span.id, label: span.label, color: labelInfo?.color || '#3b82f6' });
      lastIndex = span.end;
    });
    if (lastIndex < textContent.length) parts.push({ text: textContent.substring(lastIndex), isSpan: false });
    return (
      <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
        {parts.map((part, idx) => {
          if (part.isSpan) return (
            <mark key={`span-${part.spanId}-${idx}`} className="px-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: part.color + '40', borderBottom: `2px solid ${part.color}` }}
              title={`Nhan: ${part.label}`}>{part.text}</mark>
          );
          return <span key={`text-${idx}`}>{part.text}</span>;
        })}
      </pre>
    );
  };

  if (!task) {
    console.log('TASK DATA ITEM =', task?.dataItem);
console.log('IMAGE URL =', buildFileUrl(task?.dataItem));
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Dang tai item...</p>
        </div>
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div className="flex-1 overflow-auto bg-gray-800 p-4 md:p-6">
        <div className="mx-auto max-w-6xl rounded-xl border border-gray-700 bg-gray-900 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-200">Ghi nhan Hinh anh</h3>
            <span className="text-xs text-gray-500">{getTaskDataItem(task)?.filename ||
  getTaskDataItem(task)?.originalName ||
  getTaskDataItem(task)?.original_name ||
  'Image file'}</span>
          </div>
          <ImageAnnotator
  imageUrl={buildFileUrl(getTaskDataItem(task))}
              labelSet={task?.availableLabels || []}
            questions={task?.projectId?.questions || []}
            onAnnotationsChange={onAnnotationsChange}
            initialAnnotations={annotations}
            readOnly={['submitted', 'resubmitted', 'approved'].includes(task?.status)}
          />
        </div>
      </div>
    );
  }

  if (kind === 'text') {
    return (
      <div className="flex-1 overflow-auto bg-gray-800 p-4 md:p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-700 bg-gray-900 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-200">Ghi nhan Van ban</h3>
            <span className="text-xs text-gray-500">{task?.dataItem?.filename || 'Text file'}</span>
          </div>
          <div className="mb-3 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2">
            <p className="text-xs text-blue-400 font-medium">Huong dan: Boi den phan van ban can ghi nhan, sau do chon nhan tu dropdown xuat hien.</p>
          </div>
          <div className="relative">
            <div
              ref={textContainerRef}
              className="border border-gray-700 rounded-lg bg-gray-800 p-4 max-h-96 overflow-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed"
              onMouseUp={() => {
                if (['submitted', 'resubmitted', 'approved'].includes(task?.status)) return;
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                const selectedText = selection.toString().trim();
                if (selectedText.length === 0) { setSelectedTextRange(null); setShowLabelDropdown(false); return; }
                if (!textContainerRef.current) return;
                const preRange = document.createRange();
                preRange.selectNodeContents(textContainerRef.current);
                preRange.setEnd(range.startContainer, range.startOffset);
                const start = preRange.toString().length;
                const end = start + selection.toString().length;
                const overlaps = textSpans.some((span) =>
                  (start >= span.start && start < span.end) || (end > span.start && end <= span.end) || (start <= span.start && end >= span.end)
                );
                if (overlaps) { alert('Phan van ban nay da duoc ghi nhan. Vui long chon phan khac hoac xoa nhan cu truoc.'); selection.removeAllRanges(); return; }
                setSelectedTextRange({ start, end, text: selectedText });
                const rect = range.getBoundingClientRect();
                const containerRect = textContainerRef.current.getBoundingClientRect();
                setDropdownPosition({ x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 10 });
                setShowLabelDropdown(true);
              }}
              style={{ userSelect: 'text' }}
            >
              {renderTextWithSpans()}
            </div>
            {showLabelDropdown && selectedTextRange && task?.availableLabels?.length > 0 && (
              <div className="absolute z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-2 min-w-[200px]"
                style={{ left: `${dropdownPosition.x}px`, top: `${dropdownPosition.y}px`, transform: 'translateX(-50%) translateY(-100%)' }}>
                <p className="text-xs font-bold text-gray-400 mb-2 px-2">Chon nhan:</p>
                <div className="space-y-1">
                  {task.availableLabels.map((lbl) => (
                    <button key={lbl.name}
                      onClick={() => {
                        const newSpan = { id: `span-${Date.now()}`, start: selectedTextRange.start, end: selectedTextRange.end, text: selectedTextRange.text, label: lbl.name, note: '' };
                        setTextSpans([...textSpans, newSpan].sort((a, b) => a.start - b.start));
                        setSelectedTextRange(null); setShowLabelDropdown(false);
                        window.getSelection()?.removeAllRanges();
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-200 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                      style={{ borderLeft: `3px solid ${lbl.color || '#3b82f6'}` }}>
                      {lbl.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setSelectedTextRange(null); setShowLabelDropdown(false); window.getSelection()?.removeAllRanges(); }}
                  className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 text-center py-1">Huy</button>
              </div>
            )}
          </div>
          {textSpans.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phan da ghi nhan ({textSpans.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {textSpans.map((span) => {
                  const labelInfo = task?.availableLabels?.find((l) => l.name === span.label);
                  return (
                    <div key={span.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700/60">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: labelInfo?.color || '#3b82f6' }} />
                      <span className="text-xs font-semibold text-gray-300 shrink-0">{span.label}</span>
                      <span className="text-xs text-gray-500 truncate flex-1">"{span.text}"</span>
                      {!['submitted', 'resubmitted', 'approved'].includes(task?.status) && (
                        <button onClick={() => setTextSpans(textSpans.filter((s) => s.id !== span.id))} className="text-rose-400 hover:text-rose-300 text-sm font-bold px-1 shrink-0">x</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Ghi chu (neu co)</label>
            <textarea
              className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-200 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none"
              rows={3} placeholder="Nhap ghi chu tong the (neu can)..." value={annotationNote}
              onChange={(e) => setAnnotationNote(e.target.value)}
              disabled={['submitted', 'resubmitted', 'approved'].includes(task?.status)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="flex-1 overflow-auto bg-gray-800 p-4 md:p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-700 bg-gray-900 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-200">Ghi nhan Audio</h3>
            <span className="text-xs text-gray-500">{task?.dataItem?.filename || 'Audio file'}</span>
          </div>
          <AudioAnnotator
  audioUrl={buildFileUrl(getTaskDataItem(task))}            labelSet={task?.availableLabels || []}
            initialSegments={labels?.segments || []}
            readOnly={['submitted', 'resubmitted', 'approved'].includes(task?.status)}
            onChange={(segs) => onLabelsChange({ ...labels, segments: segs })}
          />
          <div className="mt-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Ghi chu</label>
            <textarea
              className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-200 placeholder-gray-600 px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none"
              rows={4} placeholder="Nhap ghi chu..." value={annotationNote}
              onChange={(e) => setAnnotationNote(e.target.value)}
              disabled={['submitted', 'resubmitted', 'approved'].includes(task?.status)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-800">
      <p className="text-gray-500 text-sm">Loai file khong duoc ho tro: {kind}</p>
    </div>
  );
};

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
            <div className="hidden sm:block w-32 shrink-0">
              <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
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
      <div className="w-80 shrink-0">
        <InfoPanel task={effectiveTask}
          onReset={handleReset}
          saving={saving}
          allDone={showSubmitButton} onSubmitProject={handleSubmitProject}
          annotations={annotations} textSpans={textSpans} audioLabels={labels}
          onApplyAiSuggestions={(suggestions) => {
            if (!suggestions?.length) return;
            // Convert each AI suggestion into a bbox annotation spread across image
            const count = suggestions.length;
            const newAnns = suggestions.map((s, i) => {
              // Distribute boxes: if multiple, split image horizontally
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
        />
      </div>
    </div>
  );
};

export default Workspace;
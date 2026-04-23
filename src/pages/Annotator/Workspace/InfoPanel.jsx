import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import { getAuthHeaders } from '../../../utils/auth';
import { TASK_STATUS } from './constants';
import { getTaskKind } from './utils';

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

export default InfoPanel;

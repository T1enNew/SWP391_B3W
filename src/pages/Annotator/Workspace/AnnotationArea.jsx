import React, { useRef, useState } from 'react';
import ImageAnnotator from '../../../components/ImageAnnotator';
import AudioAnnotator from '../../../components/AudioAnnotator';
import { getTaskDataItem, getTaskKind, buildFileUrl } from './utils';

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

export default AnnotationArea;

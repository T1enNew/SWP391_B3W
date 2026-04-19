import React, { useEffect, useMemo, useState } from 'react';
import { api, extractList, getErrorMessage, signedFileUrl } from '../../lib/apiClient';
import { page, card, input, button, buttonSecondary, SectionTitle, EmptyState, pill, StatusBadge } from '../_fixedShared';

const initialTopic = { name: '', description: '', color: '#3b82f6' };
const initialSubtopic = { topic_id: '', name: '', description: '' };
const initialLabelSet = { name: '', description: '', allow_multiple: false, required: true, labels: [] };

export default function TopicManagement() {
  const [taxonomy, setTaxonomy] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('');
  const [topicForm, setTopicForm] = useState(initialTopic);
  const [subtopicForm, setSubtopicForm] = useState(initialSubtopic);
  const [labelSetForm, setLabelSetForm] = useState(initialLabelSet);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#22c55e');
  const [labelSets, setLabelSets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');

  const selectedTopic = useMemo(() => taxonomy.find((t) => t.id === selectedTopicId) || null, [taxonomy, selectedTopicId]);
  const selectedSubtopic = useMemo(() => selectedTopic?.subtopics?.find((s) => s.id === selectedSubtopicId) || null, [selectedTopic, selectedSubtopicId]);

  const loadTaxonomy = async () => {
    try {
      const { data } = await api.get('/api/topics/taxonomy');
      const rows = extractList(data);
      setTaxonomy(rows);
      if (!selectedTopicId && rows[0]) setSelectedTopicId(rows[0].id);
    } catch (error) { setMessage(getErrorMessage(error)); }
  };

  const loadSubtopicExtras = async (subtopicId) => {
    if (!subtopicId) return;
    try {
      const [labelRes, assetRes] = await Promise.all([api.get(`/api/subtopics/${subtopicId}/labelsets`), api.get(`/api/subtopics/${subtopicId}/assets`)]);
      setLabelSets(extractList(labelRes.data));
      setAssets(extractList(assetRes.data));
    } catch (error) { setMessage(getErrorMessage(error)); }
  };

  useEffect(() => { loadTaxonomy(); }, []);
  useEffect(() => { if (selectedTopic && !selectedSubtopicId && selectedTopic.subtopics?.[0]) setSelectedSubtopicId(selectedTopic.subtopics[0].id); }, [selectedTopic, selectedSubtopicId]);
  useEffect(() => { if (selectedTopicId) setSubtopicForm((prev) => ({ ...prev, topic_id: selectedTopicId })); }, [selectedTopicId]);
  useEffect(() => { if (selectedSubtopicId) loadSubtopicExtras(selectedSubtopicId); }, [selectedSubtopicId]);

  const createTopic = async (e) => { e.preventDefault(); try { await api.post('/api/topics', topicForm); setTopicForm(initialTopic); setMessage('Tạo topic thành công.'); await loadTaxonomy(); } catch (error) { setMessage(getErrorMessage(error)); } };
  const createSubtopic = async (e) => { e.preventDefault(); try { await api.post('/api/subtopics', subtopicForm); setSubtopicForm((prev) => ({ ...initialSubtopic, topic_id: prev.topic_id })); setMessage('Tạo subtopic thành công.'); await loadTaxonomy(); } catch (error) { setMessage(getErrorMessage(error)); } };
  const addLabel = () => { if (!labelName.trim()) return; setLabelSetForm((prev) => ({ ...prev, labels: [...prev.labels, { name: labelName.trim(), color: labelColor }] })); setLabelName(''); };
  const createLabelSet = async (e) => { e.preventDefault(); if (!selectedSubtopicId) return; try { await api.post(`/api/subtopics/${selectedSubtopicId}/labelsets`, labelSetForm); setLabelSetForm(initialLabelSet); setMessage('Tạo label set thành công.'); await loadSubtopicExtras(selectedSubtopicId); } catch (error) { setMessage(getErrorMessage(error)); } };
  const uploadAssets = async () => { if (!selectedSubtopicId || files.length === 0) return; const formData = new FormData(); files.forEach((file) => formData.append('files', file)); try { await api.post(`/api/subtopics/${selectedSubtopicId}/assets`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setFiles([]); setMessage('Upload assets thành công.'); await loadSubtopicExtras(selectedSubtopicId); } catch (error) { setMessage(getErrorMessage(error)); } };

  return (
    <div className={page}>
      <SectionTitle title="Topic Management" subtitle="Tạo topic, subtopic, label set và asset gallery đúng theo BE." />
      {message ? <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">{message}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className={card}><h2 className="mb-4 text-lg font-semibold">Taxonomy</h2><div className="space-y-3">{taxonomy.map((topic) => <div key={topic.id} className={`rounded-xl border p-4 ${topic.id === selectedTopicId ? 'border-blue-500 bg-slate-900' : 'border-slate-700 bg-slate-900/50'}`}><button className="w-full text-left" onClick={() => { setSelectedTopicId(topic.id); setSelectedSubtopicId(topic.subtopics?.[0]?.id || ''); }}><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{topic.name}</div><div className="mt-1 text-xs text-slate-400">{topic.description || 'Không có mô tả.'}</div></div><div className={pill}>{topic.subtopic_count ?? topic.subtopics?.length ?? 0} subtopics</div></div></button>{topic.id === selectedTopicId ? <div className="mt-3 grid gap-2 md:grid-cols-2">{(topic.subtopics || []).map((subtopic) => <button key={subtopic.id} className={`rounded-lg border px-3 py-2 text-left text-sm ${selectedSubtopicId === subtopic.id ? 'border-emerald-500 bg-emerald-950/40' : 'border-slate-700 bg-slate-800'}`} onClick={() => setSelectedSubtopicId(subtopic.id)}><div className="font-medium">{subtopic.name}</div><div className="text-xs text-slate-400">{subtopic.asset_count || 0} assets • {subtopic.label_set_count || 0} label sets</div></button>)}</div> : null}</div>)}{taxonomy.length === 0 ? <EmptyState text="Chưa có topic nào." /> : null}</div></div>
          {selectedSubtopic ? <div className="grid gap-6 lg:grid-cols-2"><div className={card}><h2 className="mb-4 text-lg font-semibold">Label sets — {selectedSubtopic.name}</h2><div className="space-y-3">{labelSets.map((item) => <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"><div className="flex items-center justify-between"><div className="font-medium">{item.name}</div><div className="flex gap-2"><StatusBadge value={item.required ? 'required' : 'optional'} /><span className={pill}>{item.allow_multiple ? 'multi' : 'single'}</span></div></div><div className="mt-3 flex flex-wrap gap-2">{(item.labels || []).map((label) => <span key={label.id || label.name} className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: label.color || '#64748b', color: label.color || '#e2e8f0' }}>{label.name}</span>)}</div></div>)}{labelSets.length === 0 ? <EmptyState text="Subtopic này chưa có label set." /> : null}</div></div><div className={card}><h2 className="mb-4 text-lg font-semibold">Assets — {selectedSubtopic.name}</h2><div className="mb-4 flex flex-col gap-3"><input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="block text-sm" /><button className={button} type="button" onClick={uploadAssets}>Upload selected files</button></div><div className="grid gap-3 sm:grid-cols-2">{assets.map((item) => <div key={item.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">{item.mime_type?.startsWith('image/') && signedFileUrl(item) ? <img src={signedFileUrl(item)} alt={item.original_name} className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center text-xs text-slate-400">{item.mime_type || 'file'}</div>}<div className="p-3"><div className="truncate text-sm font-medium">{item.original_name || item.filename}</div><div className="mt-1 text-xs text-slate-400">{item.status || 'uploaded'}</div></div></div>)}{assets.length === 0 ? <EmptyState text="Chưa có asset nào trong subtopic này." /> : null}</div></div></div> : null}
        </div>
        <div className="space-y-6">
          <form className={card} onSubmit={createTopic}><h2 className="mb-4 text-lg font-semibold">Tạo topic</h2><div className="space-y-3"><input className={input} placeholder="Tên topic" value={topicForm.name} onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })} /><textarea className={input} placeholder="Mô tả" value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })} /><input className={input} type="color" value={topicForm.color} onChange={(e) => setTopicForm({ ...topicForm, color: e.target.value })} /><button className={button}>Tạo topic</button></div></form>
          <form className={card} onSubmit={createSubtopic}><h2 className="mb-4 text-lg font-semibold">Tạo subtopic</h2><div className="space-y-3"><select className={input} value={subtopicForm.topic_id} onChange={(e) => setSubtopicForm({ ...subtopicForm, topic_id: e.target.value })}><option value="">Chọn topic</option>{taxonomy.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select><input className={input} placeholder="Tên subtopic" value={subtopicForm.name} onChange={(e) => setSubtopicForm({ ...subtopicForm, name: e.target.value })} /><textarea className={input} placeholder="Mô tả" value={subtopicForm.description} onChange={(e) => setSubtopicForm({ ...subtopicForm, description: e.target.value })} /><button className={button}>Tạo subtopic</button></div></form>
          <form className={card} onSubmit={createLabelSet}><h2 className="mb-4 text-lg font-semibold">Tạo label set</h2><div className="mb-3 text-xs text-slate-400">Subtopic đang chọn: {selectedSubtopic?.name || 'Chưa chọn'}</div><div className="space-y-3"><input className={input} placeholder="Tên label set" value={labelSetForm.name} onChange={(e) => setLabelSetForm({ ...labelSetForm, name: e.target.value })} /><textarea className={input} placeholder="Mô tả" value={labelSetForm.description} onChange={(e) => setLabelSetForm({ ...labelSetForm, description: e.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={labelSetForm.allow_multiple} onChange={(e) => setLabelSetForm({ ...labelSetForm, allow_multiple: e.target.checked })} /> Allow multiple labels</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={labelSetForm.required} onChange={(e) => setLabelSetForm({ ...labelSetForm, required: e.target.checked })} /> Required</label><div className="grid grid-cols-[1fr_auto_auto] gap-2"><input className={input} placeholder="Tên label" value={labelName} onChange={(e) => setLabelName(e.target.value)} /><input className={input} type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} /><button type="button" className={buttonSecondary} onClick={addLabel}>Add</button></div><div className="flex flex-wrap gap-2">{labelSetForm.labels.map((label, index) => <button type="button" key={`${label.name}-${index}`} className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: label.color, color: label.color }} onClick={() => setLabelSetForm((prev) => ({ ...prev, labels: prev.labels.filter((_, i) => i !== index) }))}>{label.name} ×</button>)}</div><button className={button} disabled={!selectedSubtopicId}>Tạo label set</button></div></form>
        </div>
      </div>
    </div>
  );
}

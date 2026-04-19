import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractList, getErrorMessage } from '../../lib/apiClient';
import { page, card, input, button, SectionTitle, EmptyState, pill, StatusBadge } from '../_fixedShared';

export default function DatasetsPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', type: 'image', topic_id: '', subtopic_ids: [] });
  const [message, setMessage] = useState('');

  const loadAll = async () => {
    try {
      const [datasetRes, topicRes] = await Promise.all([api.get('/api/datasets?limit=100'), api.get('/api/topics/taxonomy')]);
      setDatasets(extractList(datasetRes.data));
      setTopics(extractList(topicRes.data));
    } catch (error) { setMessage(getErrorMessage(error)); }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { const topic = topics.find((t) => t.id === form.topic_id); setSubtopics(topic?.subtopics || []); }, [form.topic_id, topics]);

  const createDataset = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/datasets', form);
      setForm({ name: '', description: '', type: 'image', topic_id: '', subtopic_ids: [] });
      setMessage('Tạo dataset thành công.');
      await loadAll();
    } catch (error) { setMessage(getErrorMessage(error)); }
  };

  return (
    <div className={page}>
      <SectionTitle title="Datasets" subtitle="Tạo dataset với topic + subtopics đúng theo backend." />
      {message ? <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">{message}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className={card} onSubmit={createDataset}>
          <h2 className="mb-4 text-lg font-semibold">Tạo dataset</h2>
          <div className="space-y-3">
            <input className={input} placeholder="Tên dataset" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea className={input} placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="image">image</option><option value="text">text</option><option value="audio">audio</option><option value="video">video</option></select>
            <select className={input} value={form.topic_id} onChange={(e) => setForm({ ...form, topic_id: e.target.value, subtopic_ids: [] })}><option value="">Chọn topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select>
            <div><div className="mb-2 text-sm text-slate-300">Subtopics</div><div className="grid gap-2">{subtopics.map((subtopic) => <label key={subtopic.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.subtopic_ids.includes(subtopic.id)} onChange={(e) => setForm((prev) => ({ ...prev, subtopic_ids: e.target.checked ? [...prev.subtopic_ids, subtopic.id] : prev.subtopic_ids.filter((id) => id !== subtopic.id) }))} />{subtopic.name}</label>)}</div></div>
            <button className={button}>Tạo dataset</button>
          </div>
        </form>
        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Danh sách datasets</h2>
          <div className="space-y-3">{datasets.map((dataset) => <button key={dataset.id} className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left hover:border-blue-500" onClick={() => navigate(`/manager/datasets/${dataset.id}`)}><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{dataset.name}</div><div className="mt-1 text-xs text-slate-400">{dataset.topic_name || dataset.topic?.name || 'No topic'} • {dataset.type}</div></div><StatusBadge value={dataset.status} /></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400"><span className={pill}>{dataset.total_items || 0} items</span>{(dataset.subtopics || []).slice(0, 4).map((sub) => <span key={sub.id} className={pill}>{sub.name}</span>)}</div></button>)}{datasets.length === 0 ? <EmptyState text="Chưa có dataset nào." /> : null}</div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../lib/apiClient';
import { page, card, button, buttonSecondary, SectionTitle, EmptyState, StatusBadge } from '../_fixedShared';

export default function DatasetItemDetail() {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const load = async () => { try { const { data } = await api.get(`/api/datasets/${id}`); setDataset(data); } catch (error) { setMessage(getErrorMessage(error)); } };
  useEffect(() => { load(); }, [id]);
  const upload = async () => {
    if (files.length === 0) return;
    const form = new FormData(); files.forEach((file) => form.append('files', file));
    try { await api.post(`/api/datasets/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }); setFiles([]); setMessage('Upload dataset items thành công.'); await load(); } catch (error) { setMessage(getErrorMessage(error)); }
  };
  return <div className={page}><SectionTitle title={dataset?.name || 'Dataset detail'} subtitle="Upload data items và xem item đã có trong dataset." right={<Link className={buttonSecondary} to="/manager/datasets">Back</Link>} />{message ? <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">{message}</div> : null}<div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><div className={card}><h2 className="mb-4 text-lg font-semibold">Thông tin dataset</h2>{!dataset ? <div className="text-sm text-slate-400">Đang tải…</div> : <div className="space-y-3 text-sm"><div><span className="text-slate-400">Topic:</span> {dataset.topic_name || dataset.topic?.name || '—'}</div><div><span className="text-slate-400">Type:</span> {dataset.type}</div><div><span className="text-slate-400">Status:</span> <StatusBadge value={dataset.status} /></div><div><span className="text-slate-400">Subtopics:</span> {(dataset.subtopics || []).map((s) => s.name).join(', ') || '—'}</div><div><span className="text-slate-400">Description:</span> {dataset.description || '—'}</div></div>}<div className="mt-6 space-y-3"><input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="block text-sm" /><button type="button" className={button} onClick={upload}>Upload files</button></div></div><div className={card}><h2 className="mb-4 text-lg font-semibold">Data items</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(dataset?.data_items || []).map((item) => <div key={item.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">{item.mime_type?.startsWith('image/') && item.storage_url ? <img src={item.storage_url} alt={item.original_name} className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center text-xs text-slate-400">{item.mime_type || 'file'}</div>}<div className="p-3"><div className="truncate text-sm font-medium">{item.original_name || item.filename}</div><div className="mt-1 text-xs text-slate-400">{item.status}</div></div></div>)}</div>{dataset && (dataset.data_items || []).length === 0 ? <EmptyState text="Dataset này chưa có data items." /> : null}</div></div></div>;
}

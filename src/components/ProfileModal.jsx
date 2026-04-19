import React, { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';

export default function ProfileModal({ open, onClose, user }) {
  const [form, setForm] = useState({ full_name: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ full_name: user?.full_name || user?.fullName || '' });
      setMessage('');
    }
  }, [open, user]);

  if (!open) return null;

  const initials = (user?.full_name || user?.fullName || user?.username || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const save = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.put('/api/users/me', { full_name: form.full_name });
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: data }));
      setMessage('Đã cập nhật profile.');
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-lg font-bold">{initials}</div>
          <div>
            <h3 className="text-lg font-semibold">{user?.full_name || user?.fullName || user?.username || 'User'}</h3>
            <p className="text-xs uppercase tracking-wider text-slate-400">{user?.role || 'user'}</p>
          </div>
        </div>
        {message ? <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">{message}</div> : null}
        <label className="mb-2 block text-sm text-slate-300">Họ tên</label>
        <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={form.full_name} onChange={(e) => setForm({ full_name: e.target.value })} />
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button>
          <button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500" onClick={save}>{loading ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  );
}

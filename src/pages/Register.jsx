import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', username: '', full_name: '', role: 'annotator', specialty: 'general' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const user = await register(form);
      if (user?.role === 'annotator') navigate('/annotator');
      else if (user?.role === 'reviewer') navigate('/reviewer');
      else navigate('/dashboard');
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Đăng ký</h1>
        {message ? <div className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm">{message}</div> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="annotator">annotator</option>
            <option value="reviewer">reviewer</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 md:col-span-2" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        </div>
        <button disabled={loading} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">{loading ? 'Đang đăng ký…' : 'Đăng ký'}</button>
        <p className="mt-4 text-sm text-slate-400">Đã có tài khoản? <Link className="text-blue-400 hover:underline" to="/login">Đăng nhập</Link></p>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const user = await login(form.email, form.password);
      if (user?.role === 'annotator') navigate('/annotator');
      else if (user?.role === 'reviewer') navigate('/reviewer');
      else if (user?.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-400">Kết nối trực tiếp tới backend đã deploy.</p>
        {message ? <div className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm">{message}</div> : null}
        <div className="mt-5 space-y-3">
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        </div>
        <p className="mt-4 text-sm text-slate-400">Chưa có tài khoản? <Link className="text-blue-400 hover:underline" to="/register">Đăng ký</Link></p>
      </form>
    </div>
  );
}

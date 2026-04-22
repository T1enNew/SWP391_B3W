import { useState, useEffect } from 'react';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api';

const ROLE_META = {
  admin:     { label: 'Admin',     bg: 'from-rose-500/20 to-rose-600/10',   border: 'border-rose-500/30',   text: 'text-rose-400',    avatar: 'from-rose-500 to-rose-700',    dot: 'bg-rose-400' },
  manager:   { label: 'Manager',   bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30',  text: 'text-amber-400',   avatar: 'from-amber-500 to-orange-600', dot: 'bg-amber-400' },
  reviewer:  { label: 'Reviewer',  bg: 'from-violet-500/20 to-violet-600/10',border: 'border-violet-500/30',text: 'text-violet-400',  avatar: 'from-violet-500 to-purple-700',dot: 'bg-violet-400' },
  annotator: { label: 'Annotator', bg: 'from-blue-500/20 to-blue-600/10',   border: 'border-blue-500/30',   text: 'text-blue-400',    avatar: 'from-blue-500 to-cyan-600',    dot: 'bg-blue-400' },
};

const EyeIcon = ({ open }) => open
  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>;

const getPasswordStrength = (pw) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Yếu', color: 'bg-rose-500',   width: 'w-1/5' };
  if (score <= 2) return { label: 'Trung bình', color: 'bg-amber-500', width: 'w-2/5' };
  if (score <= 3) return { label: 'Khá',  color: 'bg-yellow-400', width: 'w-3/5' };
  if (score <= 4) return { label: 'Tốt',  color: 'bg-emerald-500',width: 'w-4/5' };
  return { label: 'Mạnh', color: 'bg-emerald-400', width: 'w-full' };
};

const InputField = ({ label, name, type = 'text', value, onChange, disabled, placeholder, readOnly, hint, icon, rightEl }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {icon && <span className="text-gray-500">{icon}</span>}
      {label}
    </label>
    <div className="relative">
      <input
        type={type} name={name} value={value}
        onChange={onChange} disabled={disabled || readOnly}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
          readOnly
            ? 'bg-gray-800/40 border-gray-700/40 text-gray-400 cursor-default'
            : 'bg-gray-800/60 border-gray-700/60 text-gray-100 placeholder-gray-600 focus:border-violet-500/60 focus:ring-violet-500/15 hover:border-gray-600'
        } ${rightEl ? 'pr-11' : ''}`}
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
    {hint && <p className="text-[11px] text-gray-600 pl-1">{hint}</p>}
  </div>
);

const ProfileModal = ({ open, onClose, user }) => {
  const [tab, setTab]                   = useState('info');
  const [form, setForm]                 = useState({ fullName: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw]             = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  useEffect(() => {
    if (user && open) {
      setForm({ fullName: user.fullName || '' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPw({ current: false, new: false, confirm: false });
      setError(''); setSuccess(''); setTab('info');
    }
  }, [user, open]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Họ tên không được để trống'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: form.fullName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Lỗi hệ thống'); }
      else {
        setSuccess('Cập nhật thành công!');
        const stored = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (stored) {
          const newFullName = data.full_name || data.fullName || form.fullName;
          const updated = { ...JSON.parse(stored), fullName: newFullName, full_name: newFullName };
          if (sessionStorage.getItem('token')) sessionStorage.setItem('user', JSON.stringify(updated));
          if (localStorage.getItem('token')) localStorage.setItem('user', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: { ...updated, fullName: newFullName } }));
        }
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch { setError('Lỗi kết nối server'); }
    finally { setLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword)              { setError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!newPassword)                  { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (newPassword.length < 6)        { setError('Mật khẩu mới phải ít nhất 6 ký tự'); return; }
    if (newPassword !== confirmPassword){ setError('Mật khẩu mới không khớp'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/users/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Lỗi hệ thống'); }
      else {
        setSuccess('Đổi mật khẩu thành công!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch { setError('Lỗi kết nối server'); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  const meta     = ROLE_META[user?.role] || ROLE_META.annotator;
  const initials = user?.fullName
    ? user.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.username?.[0]?.toUpperCase() || 'U');
  const strength = getPasswordStrength(passwordForm.newPassword);

  const EyeBtn = ({ field }) => (
    <button type="button" onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
      className="text-gray-500 hover:text-gray-300 transition-colors">
      <EyeIcon open={showPw[field]} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={loading ? undefined : onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-700/60 bg-[#0f172a] shadow-2xl shadow-black/60 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className={`relative bg-gradient-to-br ${meta.bg} px-6 pt-6 pb-16 border-b ${meta.border}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${meta.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-sm font-bold text-gray-200">Thông tin cá nhân</h2>
            </div>
            <button
              onClick={loading ? undefined : onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Avatar — floating over banner */}
        <div className="flex flex-col items-center -mt-12 px-6 pb-4">
          <div className={`relative h-20 w-20 rounded-2xl bg-gradient-to-br ${meta.avatar} flex items-center justify-center text-2xl font-bold text-white shadow-xl ring-4 ring-[#0f172a]`}>
            {initials}
            <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ${meta.dot} ring-2 ring-[#0f172a]`} />
          </div>
          <h3 className="mt-3 text-base font-bold text-gray-100">{user?.fullName || user?.username}</h3>
          <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${meta.border} ${meta.text} bg-gray-800/60`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4">
          <div className="flex gap-1 rounded-xl bg-gray-800/60 border border-gray-700/50 p-1">
            {[
              { key: 'info', label: 'Thông tin', icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
              { key: 'password', label: 'Đổi mật khẩu', icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  tab === t.key
                    ? `bg-violet-600 text-white shadow-md shadow-violet-500/20`
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-3">
          {tab === 'info' && (
            <form onSubmit={handleInfoSubmit} className="space-y-3">
              <InputField
                label="Username" name="username" value={user?.username || ''} readOnly
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              />
              <InputField
                label="Email" name="email" value={user?.email || ''} readOnly
                hint="Email không thể thay đổi"
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              />
              <InputField
                label="Họ và tên *" name="fullName" value={form.fullName}
                onChange={handleChange} disabled={loading}
                placeholder="Nhập họ và tên..."
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
              />

              {error   && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-3 text-sm font-bold text-white transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Spinner /> Đang lưu...</>
                  : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Lưu thông tin</>
                }
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <InputField
                label="Mật khẩu hiện tại" name="currentPassword"
                type={showPw.current ? 'text' : 'password'}
                value={passwordForm.currentPassword} onChange={handlePasswordChange}
                disabled={loading} placeholder="Nhập mật khẩu hiện tại..."
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                rightEl={<EyeBtn field="current" />}
              />
              <div className="space-y-1.5">
                <InputField
                  label="Mật khẩu mới" name="newPassword"
                  type={showPw.new ? 'text' : 'password'}
                  value={passwordForm.newPassword} onChange={handlePasswordChange}
                  disabled={loading} placeholder="Ít nhất 6 ký tự..."
                  icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
                  rightEl={<EyeBtn field="new" />}
                />
                {strength && (
                  <div className="pl-1 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-gray-700/60 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <p className={`text-[11px] font-medium ${strength.color.replace('bg-', 'text-')}`}>
                      Độ mạnh: {strength.label}
                    </p>
                  </div>
                )}
              </div>
              <InputField
                label="Xác nhận mật khẩu mới" name="confirmPassword"
                type={showPw.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword} onChange={handlePasswordChange}
                disabled={loading} placeholder="Nhập lại mật khẩu mới..."
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                rightEl={<EyeBtn field="confirm" />}
              />

              {error   && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-3 text-sm font-bold text-white transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Spinner /> Đang xử lý...</>
                  : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Đổi mật khẩu</>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const Alert = ({ type, children }) => (
  <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 ${
    type === 'error'
      ? 'bg-rose-500/8 border-rose-500/25 text-rose-400'
      : 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400'
  }`}>
    {type === 'error'
      ? <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      : <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
    <p className="text-xs font-medium">{children}</p>
  </div>
);

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default ProfileModal;

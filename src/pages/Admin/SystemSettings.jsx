import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getAuthHeaders } from '../../utils/auth';
import {
  Settings, Save, RotateCcw, ChevronDown,
  Globe, Bell, AlertTriangle,
  CheckCircle2, ToggleLeft,
} from 'lucide-react';

/* ─── tiny atoms ─── */
const Card = ({ className = '', children }) => (
  <div className={`bg-slate-800/80 border border-slate-700 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 mb-5">
    <span className="p-1.5 bg-slate-700 rounded-lg text-slate-300">
      <Icon size={16} />
    </span>
    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">{children}</h3>
  </div>
);

const Divider = () => <hr className="border-slate-700 my-5" />;

const Label = ({ children, hint }) => (
  <div className="mb-1">
    <span className="text-sm font-medium text-slate-300">{children}</span>
    {hint && <span className="ml-2 text-xs text-slate-500">{hint}</span>}
  </div>
);

const Input = ({ value, onChange, type = 'text', placeholder, min, max, step, className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    min={min}
    max={max}
    step={step}
    className={`w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200
      placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
      transition ${className}`}
  />
);

const SelectField = ({ value, onChange, children }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 pr-10
        text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
    >
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div>
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-indigo-500' : 'bg-slate-600'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  </div>
);


/* ─── tab definitions ─── */
const TABS = [
  { id: 0, label: 'Chung',     icon: Globe },
  { id: 1, label: 'Thông báo', icon: Bell },
];

/* ─── map server response → UI state ─── */
// Backend dùng snake_case: general_config.site_name, general_config.maintenance_mode
const fromServer = (data) => ({
  general: {
    siteName:           data.general_config?.site_name       ?? data.general?.siteName        ?? 'LabelFlow Admin',
    maintenanceMode:    data.general_config?.maintenance_mode ?? data.general?.maintenanceMode ?? false,
    maintenanceMessage: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
    allowRegistration:  data.general?.allowRegistration ?? true,
    defaultUserRole:    data.general?.defaultUserRole   ?? 'annotator',
  },
  notifications: {
    emailEnabled:            !!(data.notifications?.emailOnTaskAssigned || data.notifications?.emailOnTaskRejected || data.notifications?.emailOnTaskReviewed),
    notifyOnTaskAssigned:    data.notifications?.emailOnTaskAssigned  ?? false,
    notifyOnTaskRejected:    data.notifications?.emailOnTaskRejected  ?? false,
    notifyOnProjectApproved: data.notifications?.emailOnTaskReviewed  ?? false,
  },
});

/* ─── map UI state → server payload ─── */
// Ghi vào general_config (snake_case) để backend hiểu, KHÔNG thêm key "general" thừa
const toServer = (ui, raw) => {
  // Loại bỏ key "general" camelCase nếu có trong raw (tránh xung đột)
  const { general: _drop, ...rest } = raw;
  return {
    ...rest,
    general_config: {
      ...(raw.general_config ?? {}),
      site_name:        ui.general.siteName,
      maintenance_mode: ui.general.maintenanceMode,
    },
    notifications: {
      ...(raw.notifications ?? {}),
      emailOnTaskAssigned:  ui.notifications.emailEnabled && ui.notifications.notifyOnTaskAssigned,
      emailOnTaskRejected:  ui.notifications.emailEnabled && ui.notifications.notifyOnTaskRejected,
      emailOnTaskReviewed:  ui.notifications.emailEnabled && ui.notifications.notifyOnProjectApproved,
      emailOnTaskSubmitted: raw.notifications?.emailOnTaskSubmitted ?? false,
    },
  };
};

/* ═══════════════════════════════════════════
   Main component
═══════════════════════════════════════════ */
const SystemSettings = () => {
  const [activeTab, setActiveTab]   = useState(0);
  const [settings,  setSettings]    = useState(fromServer({}));
  const [rawData,   setRawData]     = useState({});
  const [loading,   setLoading]     = useState(true);
  const [saving,    setSaving]      = useState(false);
  const [toast,     setToast]       = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/settings`, { headers: getAuthHeaders() });
      setRawData(res.data);
      setSettings(fromServer(res.data));
    } catch {
      // endpoint chưa có — dùng defaults
    } finally {
      setLoading(false);
    }
  };

  const patch = (section, key, value) =>
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = toServer(settings, rawData);
      console.log('[Settings] PUT payload:', JSON.stringify(payload, null, 2));
      await axios.put(`${API_URL}/api/settings`, payload, { headers: getAuthHeaders() });
      setRawData(payload);
      showToast('success', 'Đã lưu cấu hình thành công.');
    } catch (err) {
      const status   = err.response?.status;
      const beMsg    = err.response?.data?.message || err.response?.data?.error;
      const beData   = err.response?.data;
      console.error('[Settings] PUT error', status, beData);
      const display  = beMsg || (status ? `Lỗi server ${status}` : err.message);
      showToast('error', `Lưu thất bại: ${display}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Bạn có chắc muốn đặt lại tất cả cấu hình về mặc định?')) return;
    setSettings(fromServer({}));
    showToast('success', 'Đã đặt lại về mặc định (chưa lưu).');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl">
            <Settings size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Cài đặt hệ thống</h1>
            <p className="text-xs text-slate-500 mt-0.5">Quản lý cấu hình toàn hệ thống LabelFlow Admin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600
              text-slate-300 text-sm hover:bg-slate-700/60 transition"
          >
            <RotateCcw size={15} /> Đặt lại mặc định
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
              text-white text-sm font-medium transition disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm
          ${toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 size={16} />
            : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-2xl p-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition flex-1 justify-center
              ${activeTab === t.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════
          Tab 0 — General Settings
      ══════════════════════════════ */}
      {activeTab === 0 && (
        <Card>
          <SectionTitle icon={Globe}>Cài đặt chung</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Tên hệ thống</Label>
              <Input
                value={settings.general.siteName}
                onChange={e => patch('general', 'siteName', e.target.value)}
                placeholder="LabelFlow Admin"
              />
            </div>
            <div>
              <Label>Vai trò mặc định cho người dùng mới</Label>
              <SelectField
                value={settings.general.defaultUserRole}
                onChange={e => patch('general', 'defaultUserRole', e.target.value)}
              >
                <option value="annotator">Annotator</option>
                <option value="reviewer">Reviewer</option>
                <option value="manager">Manager</option>
              </SelectField>
            </div>
          </div>

          <Divider />
          <SectionTitle icon={ToggleLeft}>Bật / Tắt tính năng</SectionTitle>

          <div className="divide-y divide-slate-700/50">
            <Toggle
              checked={settings.general.allowRegistration}
              onChange={v => patch('general', 'allowRegistration', v)}
              label="Cho phép đăng ký tài khoản"
              description="Người dùng mới có thể tự đăng ký tài khoản trên hệ thống"
            />
            <Toggle
              checked={settings.general.maintenanceMode}
              onChange={v => patch('general', 'maintenanceMode', v)}
              label="Chế độ bảo trì"
              description="Khóa hệ thống với tất cả người dùng không phải Admin"
            />
          </div>

          {settings.general.maintenanceMode && (
            <div className="mt-4">
              <Label>Thông báo bảo trì</Label>
              <textarea
                rows={3}
                value={settings.general.maintenanceMessage}
                onChange={e => patch('general', 'maintenanceMessage', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200
                  placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition"
              />
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════════════
          Tab 1 — Notifications
      ══════════════════════════════ */}
      {activeTab === 1 && (
        <Card>
          <SectionTitle icon={Bell}>Thông báo qua Email</SectionTitle>
          <div className="divide-y divide-slate-700/50">
            <Toggle
              checked={settings.notifications.emailEnabled}
              onChange={v => patch('notifications', 'emailEnabled', v)}
              label="Bật thông báo email"
              description="Gửi email cảnh báo cho các sự kiện quan trọng trong quy trình"
            />
            {settings.notifications.emailEnabled && (
              <>
                <Toggle
                  checked={settings.notifications.notifyOnTaskAssigned}
                  onChange={v => patch('notifications', 'notifyOnTaskAssigned', v)}
                  label="Thông báo: Nhiệm vụ được phân công"
                  description="Gửi email cho annotator khi có nhiệm vụ mới được giao"
                />
                <Toggle
                  checked={settings.notifications.notifyOnTaskRejected}
                  onChange={v => patch('notifications', 'notifyOnTaskRejected', v)}
                  label="Thông báo: Nhiệm vụ bị từ chối"
                  description="Gửi email cho annotator khi bài nộp của họ bị từ chối"
                />
                <Toggle
                  checked={settings.notifications.notifyOnProjectApproved}
                  onChange={v => patch('notifications', 'notifyOnProjectApproved', v)}
                  label="Thông báo: Dự án được phê duyệt"
                  description="Gửi email cho manager khi dự án được phê duyệt hoàn toàn"
                />
              </>
            )}
          </div>
        </Card>
      )}

      {/* ── Bottom action bar ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
        <p className="text-xs text-slate-500">Thay đổi được áp dụng trên toàn bộ dự án và người dùng.</p>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600
              text-slate-300 text-sm hover:bg-slate-700/60 transition"
          >
            <RotateCcw size={15} /> Đặt lại
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
              text-white text-sm font-medium transition disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

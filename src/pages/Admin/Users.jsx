import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { API_URL } from "../../config/api";
import { getAuthHeaders } from "../../utils/auth";
import { getArray } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  CheckSquare,
  Square,
  Minus,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

/* ─────────────── constants ─────────────── */
const ROLES = ["admin", "manager", "annotator", "reviewer"];

const ROLE_CFG = {
  admin: {
    label: "Admin",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
  manager: {
    label: "Manager",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-400",
    dot: "bg-violet-400",
  },
  annotator: {
    label: "Annotator",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  reviewer: {
    label: "Reviewer",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
};

/* ─────────────── tiny UI atoms ─────────────── */
const RoleBadge = ({ role }) => {
  const cfg = ROLE_CFG[role] || {
    label: role,
    bg: "bg-slate-500/15",
    border: "border-slate-500/30",
    text: "text-slate-400",
    dot: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const StatusBadge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-500/15 border-slate-500/30 text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      Inactive
    </span>
  );

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
      checked
        ? "bg-emerald-500 border-emerald-500"
        : "bg-slate-600 border-slate-600"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 mt-[-1px] ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

const KpiCard = ({ icon: Icon, label, value, color, iconBg, strip }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
    <div className={`absolute top-0 inset-x-0 h-0.5 ${strip}`} />
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
          {label}
        </p>
        <p className="text-3xl font-extrabold text-slate-50 tabular-nums">
          {value}
        </p>
      </div>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

/* inline role dropdown */
const RoleSelect = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cfg = ROLE_CFG[value] || {};
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-500 ${cfg.bg} ${cfg.border} ${cfg.text}`}
      >
        {cfg.label || value}
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
          {ROLES.map((r) => {
            const c = ROLE_CFG[r];
            return (
              <button
                key={r}
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold hover:bg-slate-700/60 transition-colors ${c.text} ${r === value ? "bg-slate-700/40" : ""}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {c.label}
                {r === value && (
                  <Check size={10} className="ml-auto opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────── toast ─────────────── */
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const push = (msg, type = "success") => {
    const id = Date.now();
    setToasts((v) => [...v, { id, msg, type }]);
    setTimeout(() => setToasts((v) => v.filter((t) => t.id !== id)), 3000);
  };
  return { toasts, push };
};

const Toasts = ({ toasts }) => (
  <div className="fixed bottom-5 right-5 z-[200] space-y-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-sm pointer-events-auto transition-all ${
          t.type === "success"
            ? "bg-emerald-900/90 border-emerald-700 text-emerald-300"
            : "bg-rose-900/90 border-rose-700 text-rose-300"
        }`}
      >
        {t.type === "success" ? (
          <Check size={13} />
        ) : (
          <AlertTriangle size={13} />
        )}
        {t.msg}
      </div>
    ))}
  </div>
);

/* ─────────────── confirm dialog ─────────────── */
const ConfirmDialog = ({
  open,
  title,
  body,
  onConfirm,
  onCancel,
  danger = false,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? "bg-rose-500/15" : "bg-blue-500/15"}`}
          >
            <AlertTriangle
              size={17}
              className={danger ? "text-rose-400" : "text-blue-400"}
            />
          </div>
          <p className="text-sm font-bold text-slate-100">{title}</p>
        </div>
        <p className="text-xs text-slate-400 mb-5 pl-12">{body}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-600 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              danger
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────── bulk action bar ─────────────── */
const BulkBar = ({
  count,
  onActivate,
  onDeactivate,
  onRole,
  onClear,
  loading,
}) => {
  const [roleOpen, setRoleOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setRoleOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-900/30 border border-blue-500/30 text-xs text-blue-300">
      <span className="font-semibold">{count} selected</span>
      <div className="h-4 w-px bg-blue-500/30" />
      <button
        onClick={onActivate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
      >
        <UserCheck size={12} /> Activate
      </button>
      <button
        onClick={onDeactivate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-400 hover:bg-slate-500/25 transition-colors disabled:opacity-40"
      >
        <UserX size={12} /> Deactivate
      </button>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setRoleOpen((v) => !v)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 hover:bg-violet-500/25 transition-colors disabled:opacity-40"
        >
          <Shield size={12} /> Assign Role <ChevronDown size={10} />
        </button>
        {roleOpen && (
          <div className="absolute z-50 bottom-full mb-1 left-0 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
            {ROLES.map((r) => {
              const c = ROLE_CFG[r];
              return (
                <button
                  key={r}
                  onClick={() => {
                    onRole(r);
                    setRoleOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold hover:bg-slate-700/60 transition-colors ${c.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={onClear}
        className="ml-auto p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
};

/* ─────────────── sort helper ─────────────── */
const SortIcon = ({ col, sort }) => {
  if (sort.col !== col) return <ChevronUp size={11} className="opacity-20" />;
  return sort.dir === "asc" ? (
    <ChevronUp size={11} className="text-blue-400" />
  ) : (
    <ChevronDown size={11} className="text-blue-400" />
  );
};

/* ═══════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════ */
const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // { [userId]: true }
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sort, setSort] = useState({ col: "username", dir: "asc" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const { toasts, push } = useToast();
  const [confirm, setConfirm] = useState(null); // { title, body, onConfirm, danger }

  /* ── fetch ── */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/users`, {
        params: { page: 1, limit: 500 },
        headers: getAuthHeaders(),
      });
      const list = getArray(res.data);
      setUsers(list);
    } catch {
      push("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line

  /* ── derived stats ── */
  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      admins: users.filter((u) => u.role === "admin").length,
      managers: users.filter((u) => u.role === "manager").length,
      annotators: users.filter((u) => u.role === "annotator").length,
      reviewers: users.filter((u) => u.role === "reviewer").length,
    }),
    [users],
  );

  /* ── filtered + sorted list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        if (
          q &&
          !u.username?.toLowerCase().includes(q) &&
          !u.full_name?.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q)
        )
          return false;
        if (filterRole !== "all" && u.role !== filterRole) return false;
        if (filterStatus === "active" && !u.is_active) return false;
        if (filterStatus === "inactive" && u.is_active) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        const av = (a[sort.col] || "").toString().toLowerCase();
        const bv = (b[sort.col] || "").toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
      });
  }, [users, search, filterRole, filterStatus, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  /* reset page on filter change */
  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterStatus, sort]);

  /* ── selection ── */
  const pageIds = pageItems.map((u) => u.id || u._id);
  const allPageSel =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSel = pageIds.some((id) => selected.has(id));

  const togglePageAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSel) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── sort toggle ── */
  const handleSort = (col) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
  };

  /* ── single user updates ── */
  const doToggleActive = async (user) => {
    const id = user.id || user._id;
    setSaving((p) => ({ ...p, [id]: true }));
    try {
      await axios.put(
        `${API_URL}/api/users/${id}`,
        { is_active: !user.is_active },
        { headers: getAuthHeaders() },
      );
      setUsers((prev) =>
        prev.map((u) =>
          (u.id || u._id) === id ? { ...u, is_active: !u.is_active } : u,
        ),
      );
      push(`${user.username} ${!user.is_active ? "activated" : "deactivated"}`);
    } catch (err) {
      console.error("[Toggle] PUT failed:", {
        id,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      push(err?.response?.data?.message || "Failed to update status", "error");
      if (err?.response?.status === 404) fetchUsers();
    } finally {
      setSaving((p) => ({ ...p, [id]: false }));
    }
  };

  const handleToggleActive = (user) => {
    // Không cho deactivate admin khác
    if (user.role === "admin" && user.is_active) {
      push("Không thể deactivate tài khoản Admin", "error");
      return;
    }
    // Yêu cầu xác nhận trước khi deactivate
    if (user.is_active) {
      setConfirm({
        title: "Deactivate user?",
        body: `"${user.username}" sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`,
        danger: true,
        onConfirm: () => {
          setConfirm(null);
          doToggleActive(user);
        },
      });
    } else {
      doToggleActive(user);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    const id = user.id || user._id;
    if (user.role === newRole) return;
    setSaving((p) => ({ ...p, [id]: true }));
    try {
      await axios.put(
        `${API_URL}/api/users/${id}`,
        { role: newRole },
        { headers: getAuthHeaders() },
      );
      setUsers((prev) =>
        prev.map((u) => ((u.id || u._id) === id ? { ...u, role: newRole } : u)),
      );
      push(`${user.username}'s role → ${ROLE_CFG[newRole]?.label}`);
    } catch (err) {
      push(err?.response?.data?.message || "Failed to update role", "error");
      if (err?.response?.status === 404) fetchUsers();
    } finally {
      setSaving((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDelete = (user) => {
    const id = user.id || user._id;
    setConfirm({
      title: "Delete user?",
      body: `This will permanently remove "${user.username}". This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        setSaving((p) => ({ ...p, [id]: true }));
        try {
          await axios.delete(`${API_URL}/api/users/${id}`, {
            headers: getAuthHeaders(),
          });
          setUsers((prev) => prev.filter((u) => (u.id || u._id) !== id));
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          push(`${user.username} deleted`);
        } catch {
          push("Failed to delete user", "error");
        } finally {
          setSaving((p) => ({ ...p, [id]: false }));
        }
      },
    });
  };

  /* ── bulk actions ── */
  const bulkUpdate = async (payload, successMsg) => {
    // Không cho phép thao tác lên chính mình dù bị chọn lẫn vào
    const ids = [...selected].filter((id) => id !== currentUserId);
    const results = await Promise.allSettled(
      ids.map((id) =>
        axios.put(`${API_URL}/api/users/${id}`, payload, {
          headers: getAuthHeaders(),
        }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    setUsers((prev) =>
      prev.map((u) => (selected.has(u.id || u._id) ? { ...u, ...payload } : u)),
    );
    setSelected(new Set());
    push(`${successMsg} (${ok}/${ids.length})`);
  };

  const handleBulkActivate = () => bulkUpdate({ is_active: true }, "Activated");
  const handleBulkDeactivate = () =>
    bulkUpdate({ is_active: false }, "Deactivated");
  const handleBulkRole = (role) =>
    bulkUpdate({ role }, `Role set to ${ROLE_CFG[role]?.label}`);

  /* ── th helper ── */
  const Th = ({ col, children, className = "" }) => (
    <th
      onClick={col ? () => handleSort(col) : undefined}
      className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none ${col ? "cursor-pointer hover:text-slate-200" : ""} ${className}`}
    >
      <span className="flex items-center gap-1">
        {children}
        {col && <SortIcon col={col} sort={sort} />}
      </span>
    </th>
  );

  /* ─────────────── render ─────────────── */
  return (
    <div className="min-h-screen bg-slate-900 p-6 space-y-5">
      {/* ══ HEADER ══ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={12} className="text-blue-400" />
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              LabelFlow Admin
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-50 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage accounts, roles, and access for your labeling team
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Total Users"
          value={stats.total}
          icon={Users}
          iconBg="bg-gradient-to-br from-blue-600 to-blue-500"
          strip="bg-gradient-to-r from-blue-500 to-cyan-400"
          color="text-blue-400"
        />
        <KpiCard
          label="Active"
          value={stats.active}
          icon={UserCheck}
          iconBg="bg-gradient-to-br from-emerald-600 to-emerald-500"
          strip="bg-gradient-to-r from-emerald-500 to-teal-400"
          color="text-emerald-400"
        />
        <KpiCard
          label="Admins"
          value={stats.admins}
          icon={Shield}
          iconBg="bg-gradient-to-br from-rose-600 to-rose-500"
          strip="bg-gradient-to-r from-rose-500 to-pink-400"
          color="text-rose-400"
        />
        <KpiCard
          label="Managers"
          value={stats.managers}
          icon={Shield}
          iconBg="bg-gradient-to-br from-violet-600 to-violet-500"
          strip="bg-gradient-to-r from-violet-500 to-purple-400"
          color="text-violet-400"
        />
        <KpiCard
          label="Annotators"
          value={stats.annotators}
          icon={Users}
          iconBg="bg-gradient-to-br from-blue-500 to-sky-500"
          strip="bg-gradient-to-r from-sky-500 to-blue-400"
          color="text-sky-400"
        />
        <KpiCard
          label="Reviewers"
          value={stats.reviewers}
          icon={Eye}
          iconBg="bg-gradient-to-br from-orange-600 to-amber-500"
          strip="bg-gradient-to-r from-orange-500 to-amber-400"
          color="text-orange-400"
        />
      </div>

      {/* ══ SEARCH + FILTERS ══ */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, full name, email…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
          <Filter size={12} className="text-slate-500" />
          <span className="text-[11px] text-slate-500 font-semibold">
            Role:
          </span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_CFG[r].label}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
          <Filter size={12} className="text-slate-500" />
          <span className="text-[11px] text-slate-500 font-semibold">
            Status:
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Result count */}
        <span className="text-xs text-slate-500 ml-auto shrink-0">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ══ BULK ACTION BAR ══ */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          onRole={handleBulkRole}
          onClear={() => setSelected(new Set())}
          loading={loading}
        />
      )}

      {/* ══ TABLE ══ */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            {/* sticky header */}
            <thead className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700">
              <tr>
                {/* checkbox */}
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={togglePageAll}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {allPageSel ? (
                      <CheckSquare size={15} className="text-blue-400" />
                    ) : somePageSel ? (
                      <Minus size={15} className="text-blue-400" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                <Th col="username">Username</Th>
                <Th col="full_name">Full Name</Th>
                <Th col="Email">Email</Th>
                <Th col="role">Role</Th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
                  Toggle
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div
                          className="h-3.5 bg-slate-700 rounded-full"
                          style={{ width: `${60 + Math.random() * 30}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-slate-500"
                  >
                    <Users size={32} className="mx-auto mb-3 opacity-20" />
                    No users match your filters
                  </td>
                </tr>
              ) : (
                pageItems.map((user) => {
                  const id = user.id || user._id;
                  const isSav = saving[id];
                  const isSel = selected.has(id);
                  const isSelf = id === currentUserId;
                  return (
                    <tr
                      key={id}
                      className={`group transition-colors ${isSel ? "bg-blue-500/5" : "hover:bg-slate-700/30"}`}
                    >
                      {/* checkbox — bỏ qua cho chính mình */}
                      <td className="px-4 py-3.5">
                        {isSelf ? (
                          <span className="w-[15px] h-[15px] block" />
                        ) : (
                          <button
                            onClick={() => toggleOne(id)}
                            className="text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            {isSel ? (
                              <CheckSquare
                                size={15}
                                className="text-blue-400"
                              />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                        )}
                      </td>

                      {/* username + avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${ROLE_CFG[user.role]?.bg || "bg-slate-700"} ${ROLE_CFG[user.role]?.text || "text-slate-400"} border ${ROLE_CFG[user.role]?.border || "border-slate-600"}`}
                          >
                            {(user.username || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-200">
                              {user.username || "—"}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400 leading-none">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* full name */}
                      <td className="px-4 py-3.5 text-sm text-slate-300">
                        {user.full_name || "—"}
                      </td>

                      {/* email */}
                      <td className="px-4 py-3.5 text-sm text-slate-400">
                        {user.email || "—"}
                      </td>

                      {/* role — chỉ hiện badge tĩnh cho chính mình */}
                      <td className="px-4 py-3.5">
                        {isSelf ? (
                          <RoleBadge role={user.role || "admin"} />
                        ) : (
                          <RoleSelect
                            value={user.role || "annotator"}
                            onChange={(r) => handleRoleChange(user, r)}
                            disabled={isSav}
                          />
                        )}
                      </td>

                      {/* status badge */}
                      <td className="px-4 py-3.5">
                        <StatusBadge active={user.is_active} />
                      </td>

                      {/* toggle — disabled cho chính mình và admin khác */}
                      <td className="px-4 py-3.5 text-center">
                        <Toggle
                          checked={!!user.is_active}
                          onChange={() => handleToggleActive(user)}
                          disabled={
                            isSav ||
                            isSelf ||
                            (user.role === "admin" && user.is_active)
                          }
                        />
                      </td>

                      {/* actions — delete ẩn cho chính mình */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          {isSelf ? (
                            <span
                              title="Cannot delete your own account"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 cursor-not-allowed"
                            >
                              <Trash2 size={13} />
                            </span>
                          ) : (
                            <button
                              title="Delete"
                              onClick={() => handleDelete(user)}
                              disabled={isSav}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <span className="text-[11px] text-slate-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((v) => Math.max(1, v - 1))}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pg = i + 1;
                if (totalPages > 7) {
                  if (safePage <= 4) pg = i + 1;
                  else if (safePage >= totalPages - 3) pg = totalPages - 6 + i;
                  else pg = safePage - 3 + i;
                }
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all ${
                      pg === safePage
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ CONFIRM DIALOG ══ */}
      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          body={confirm.body}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ══ TOASTS ══ */}
      <Toasts toasts={toasts} />
    </div>
  );
};

export default AdminUsers;

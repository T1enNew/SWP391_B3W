import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import axios from "axios";
import { API_URL } from "../../config/api";
import { getAuthHeaders } from "../../utils/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  Globe,
  AlertTriangle,
  RefreshCw,
  FileText,
  Database,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  Filter,
  X,
  User,
} from "lucide-react";

/* ══════════════════════════════════════════════
   Constants
══════════════════════════════════════════════ */
const PAGE_SIZE = 10;

const ACTION_CFG = {
  task_submit: {
    label: "Task Submit",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  task_approve: {
    label: "Task Approve",
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  task_reject: {
    label: "Task Reject",
    cls: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  task_assign: {
    label: "Task Assign",
    cls: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  },
  project_create: {
    label: "Project Create",
    cls: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  project_approve: {
    label: "Project Approve",
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  project_update: {
    label: "Project Update",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  user_update: {
    label: "User Update",
    cls: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  user_deactivate: {
    label: "User Deactivate",
    cls: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  login: {
    label: "Login",
    cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
  export_data: {
    label: "Export Data",
    cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
};

const RESOURCE_CFG = {
  task: {
    cls: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    icon: FileText,
  },
  project: {
    cls: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    icon: Zap,
  },
  dataset: {
    cls: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    icon: Database,
  },
  user: {
    cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    icon: User,
  },
};

const ROLE_CFG = {
  admin: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  manager: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  annotator: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  reviewer: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const ABNORMAL = ["user_deactivate", "task_reject"];

/* ══════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════ */
const getActionCfg = (action = "") => {
  const key =
    Object.keys(ACTION_CFG).find((k) => action.toLowerCase().includes(k)) ||
    action.toLowerCase();
  return (
    ACTION_CFG[key] || {
      label: action,
      cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    }
  );
};

const getResourceCfg = (rt = "") =>
  RESOURCE_CFG[rt.toLowerCase()] || {
    cls: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    icon: Globe,
  };

const getUserName = (log) =>
  log.user?.fullName ||
  log.user?.username ||
  log.userId?.fullName ||
  log.userId?.username ||
  "Unknown";

const getUserRole = (log) =>
  (log.user?.role || log.userId?.role || "").toLowerCase();

const getTimestamp = (log) =>
  log.createdAt || log.created_at || log.timestamp || null;

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d))
    return (
      <span className="text-rose-400 text-xs font-medium">Invalid Date ⚠</span>
    );
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

const formatDateStr = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return "Invalid Date";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

const exportCSV = (logs) => {
  const hdr = [
    "Thời gian",
    "Người dùng",
    "Vai trò",
    "Hành động",
    "Loại tài nguyên",
    "Mô tả",
    "IP",
  ];
  const rows = logs.map((log) => [
    formatDateStr(getTimestamp(log)),
    getUserName(log),
    getUserRole(log),
    log.action || "",
    log.resourceType || log.resource_type || "",
    log.description || "",
    log.ipAddress || log.ip_address || "",
  ]);
  const csv = [hdr, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ══════════════════════════════════════════════
   Atoms
══════════════════════════════════════════════ */
const Card = ({ className = "", children }) => (
  <div
    className={`bg-slate-800/80 border border-slate-700 rounded-2xl p-5 ${className}`}
  >
    {children}
  </div>
);

const ActionBadge = ({ action }) => {
  const cfg = getActionCfg(action);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
};

const ResourceBadge = ({ type }) => {
  if (!type) return <span className="text-slate-500 text-xs">—</span>;
  const cfg = getResourceCfg(type);
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${cfg.cls}`}
    >
      <Icon size={11} /> {type}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  if (!role) return null;
  const cls =
    ROLE_CFG[role] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs ${cls}`}
    >
      {role}
    </span>
  );
};

const SelectFilter = ({ value, onChange, children, placeholder }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-slate-800 border border-slate-600 rounded-xl pl-3 pr-8 py-2
        text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
    <ChevronDown
      size={12}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
    />
  </div>
);

/* ══════════════════════════════════════════════
   Custom chart tooltip
══════════════════════════════════════════════ */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-indigo-400 font-bold">{payload[0].value} hoạt động</p>
    </div>
  );
};

/* ══════════════════════════════════════════════
   Expandable Row Detail
══════════════════════════════════════════════ */
const RowDetail = ({ log }) => {
  const meta = log.metadata || log.details || log.changes || null;
  const before = meta?.before || meta?.old || null;
  const after = meta?.after || meta?.new || null;

  return (
    <div className="px-4 py-4 bg-slate-900/60 border-t border-slate-700/50 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-slate-500 mb-1">ID bản ghi</p>
          <p className="text-slate-300 font-mono">{log.id || "—"}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-1">Resource ID</p>
          <p className="text-slate-300 font-mono">
            {log.resourceId || log.resource_id || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500 mb-1">User ID</p>
          <p className="text-slate-300 font-mono">
            {log.user?.id || log.userId?.id || log.user_id || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500 mb-1">IP Address</p>
          <p className="text-slate-300 font-mono">
            {log.ipAddress || log.ip_address || "—"}
          </p>
        </div>
      </div>

      {log.description && (
        <div className="text-xs">
          <p className="text-slate-500 mb-1">Mô tả đầy đủ</p>
          <p className="text-slate-200 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            {log.description}
          </p>
        </div>
      )}

      {(before || after) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {before && (
            <div>
              <p className="text-rose-400 mb-1 font-medium flex items-center gap-1">
                <XCircle size={11} /> Trước thay đổi
              </p>
              <pre className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 overflow-auto max-h-32 whitespace-pre-wrap">
                {JSON.stringify(before, null, 2)}
              </pre>
            </div>
          )}
          {after && (
            <div>
              <p className="text-emerald-400 mb-1 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} /> Sau thay đổi
              </p>
              <pre className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 overflow-auto max-h-32 whitespace-pre-wrap">
                {JSON.stringify(after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   Main component
══════════════════════════════════════════════ */
const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState(new Set());
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    dateFrom: "",
    dateTo: "",
  });
  const filterRef = useRef(null);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  /* ── fetch ── */
  const fetchLogs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (filters.action) params.append("action", filters.action);
        if (filters.resourceType)
          params.append("resource_type", filters.resourceType);
        if (filters.dateFrom) params.append("from", filters.dateFrom);
        if (filters.dateTo) params.append("to", filters.dateTo);
        if (search) params.append("search", search);

        const res = await axios.get(`${API_URL}/api/activity-logs?${params}`, {
          headers: getAuthHeaders(),
        });
        const data = res.data?.data || res.data || [];
        setLogs(Array.isArray(data) ? data : []);
        setTotal(res.data?.total || data.length || 0);
      } catch (e) {
        console.error("Activity logs error:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filters, search],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* ── computed insights from current page logs ── */
  const actionStats = useMemo(() => {
    const counts = {};
    logs.forEach(log => {
      const a = log.action || 'unknown';
      counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  const userStats = useMemo(() => {
    const counts = {};
    const meta   = {};
    logs.forEach(log => {
      const name = getUserName(log);
      const role = getUserRole(log);
      counts[name] = (counts[name] || 0) + 1;
      if (!meta[name]) meta[name] = { name, role };
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, role: meta[name]?.role || '', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  /* ── chart data from current logs ── */
  const chartData = useMemo(() => {
    const days = {};
    logs.forEach((log) => {
      const ts = getTimestamp(log);
      if (!ts) return;
      const d = new Date(ts);
      if (isNaN(d)) return;
      const key = d.toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
      });
      days[key] = (days[key] || 0) + 1;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [logs]);

  /* ── row expand toggle ── */
  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  /* ── filter helpers ── */
  const setFilter = (key, val) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: val }));
  };
  const clearFilters = () => {
    setPage(1);
    setFilters({ action: "", resourceType: "", dateFrom: "", dateTo: "" });
    setSearch("");
  };
  const hasFilters =
    filters.action ||
    filters.resourceType ||
    filters.dateFrom ||
    filters.dateTo ||
    search;

  /* ── render ── */
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 space-y-5 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl">
            <Activity size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Nhật ký hoạt động</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {total.toLocaleString("vi-VN")} bản ghi • cập nhật theo thời gian
              thực
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-600
              text-slate-300 text-sm hover:bg-slate-700/60 transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />{" "}
            Làm mới
          </button>
          <button
            onClick={() => exportCSV(logs)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
              text-white text-sm font-medium transition"
          >
            <Download size={14} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* ── Insights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Actions */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Hành động phổ biến
            </h3>
          </div>
          {actionStats.length > 0 ? (
            <div className="space-y-2">
              {actionStats.map((s, i) => {
                const cfg = getActionCfg(s.action);
                const max = actionStats[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.cls} w-28 truncate text-center`}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{s.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Chưa có dữ liệu trang này</p>
          )}
        </Card>

        {/* Most Active Users */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Người dùng tích cực nhất
            </h3>
          </div>
          {userStats.length > 0 ? (
            <div className="space-y-2.5">
              {userStats.map((s, i) => {
                const max = userStats[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-slate-300 font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-slate-200 truncate">{s.name}</p>
                        <RoleBadge role={s.role} />
                      </div>
                      <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums">{s.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Chưa có dữ liệu trang này</p>
          )}
        </Card>

        {/* Activity Chart */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Hoạt động theo ngày
            </h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-28 flex items-center justify-center text-xs text-slate-500">
              Không đủ dữ liệu để vẽ biểu đồ
            </div>
          )}
        </Card>
      </div>

      {/* ── Sticky filters ── */}
      <div
        ref={filterRef}
        className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-4"
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm kiếm mô tả, người dùng…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-3 py-2
                text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action */}
          <SelectFilter
            value={filters.action}
            onChange={(v) => setFilter("action", v)}
            placeholder="Tất cả hành động"
          >
            {Object.entries(ACTION_CFG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </SelectFilter>

          {/* Resource */}
          <SelectFilter
            value={filters.resourceType}
            onChange={(v) => setFilter("resourceType", v)}
            placeholder="Loại tài nguyên"
          >
            <option value="task">Task</option>
            <option value="project">Project</option>
            <option value="dataset">Dataset</option>
            <option value="user">User</option>
          </SelectFilter>

          {/* Date range */}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-500 text-xs">→</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilter("dateTo", e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30
                text-rose-400 text-xs hover:bg-rose-500/25 transition"
            >
              <X size={12} /> Xóa bộ lọc
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <Filter size={12} />
            {total.toLocaleString("vi-VN")} kết quả
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Activity size={36} className="text-slate-600" />
            <p className="text-slate-400 text-sm">Không có nhật ký nào</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-indigo-400 text-xs underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  <th className="w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <Clock size={12} className="inline mr-1" /> Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Hành động
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tài nguyên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Mô tả
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Globe size={12} className="inline mr-1" /> IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {logs.map((log) => {
                  const isOpen = expanded.has(log.id);
                  const isAbnormal = ABNORMAL.some((k) =>
                    (log.action || "").toLowerCase().includes(k),
                  );
                  const ts = getTimestamp(log);
                  const invalid = ts && isNaN(new Date(ts));
                  const role = getUserRole(log);
                  const rt = log.resourceType || log.resource_type || "";

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className={`cursor-pointer transition-colors
                          ${isAbnormal ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-slate-700/30"}
                          ${isOpen ? "bg-slate-700/20" : ""}`}
                      >
                        {/* Expand icon */}
                        <td className="pl-4 py-3 text-slate-500">
                          {isOpen ? (
                            <ChevronDown
                              size={14}
                              className="text-indigo-400"
                            />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {invalid ? (
                              <span className="text-rose-400 text-xs font-medium flex items-center gap-1">
                                <AlertTriangle size={11} /> Invalid Date
                              </span>
                            ) : (
                              <span className="text-xs text-slate-200">
                                {formatDate(ts)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-slate-300 font-semibold uppercase">
                                {getUserName(log).charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-200 font-medium leading-tight">
                                {getUserName(log)}
                              </p>
                              <RoleBadge role={role} />
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isAbnormal && (
                              <AlertTriangle
                                size={12}
                                className="text-rose-400 flex-shrink-0"
                              />
                            )}
                            <ActionBadge action={log.action || ""} />
                          </div>
                        </td>

                        {/* Resource */}
                        <td className="px-4 py-3">
                          <ResourceBadge type={rt} />
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-slate-300 truncate">
                            {log.description || (
                              <span className="text-slate-500">—</span>
                            )}
                          </p>
                        </td>

                        {/* IP */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-400">
                            {log.ipAddress || log.ip_address || "—"}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <RowDetail log={log} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Trang {page} / {totalPages} &nbsp;·&nbsp;{" "}
            {total.toLocaleString("vi-VN")} bản ghi
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400
                hover:bg-slate-700/50 disabled:opacity-30 transition"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400
                hover:bg-slate-700/50 disabled:opacity-30 transition"
            >
              ‹ Trước
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition
                    ${
                      p === page
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-700 text-slate-400 hover:bg-slate-700/50"
                    }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400
                hover:bg-slate-700/50 disabled:opacity-30 transition"
            >
              Sau ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400
                hover:bg-slate-700/50 disabled:opacity-30 transition"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;

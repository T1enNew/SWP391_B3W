import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../../config/api";
import { getArray } from "../../../utils/api";
import { getAuthToken } from '../../../utils/reviewerUtils';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${getAuthToken()}` } });

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getProjectStatus = (stats, deadline) => {
  const deadlinePassed = deadline && new Date(deadline) < new Date();
  if (!stats || stats.total === 0) {
    if (deadlinePassed)
      return { label: "Quá hạn", color: "bg-rose-500/15 text-rose-400 border border-rose-500/30", icon: "⚠" };
    return { label: "Chưa có bài để review", color: "bg-gray-600 text-gray-300", icon: "○" };
  }
  const targetCount = stats.targetCount ?? stats.total;
  const pendingDisplay = stats.pendingDisplay ?? stats.pending;
  if (stats.reviewed >= targetCount)
    return { label: "Đã review xong", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", icon: "✓" };
  if (deadlinePassed && pendingDisplay > 0)
    return { label: "Reviewer chưa chấm kịp", color: "bg-rose-500/15 text-rose-400 border border-rose-500/30", icon: "⚠" };
  if (pendingDisplay > 0)
    return { label: "Đang review", color: "bg-blue-500/15 text-blue-400 border border-blue-500/30", icon: "▶" };
  return { label: "Đang review", color: "bg-blue-500/15 text-blue-400 border border-blue-500/30", icon: "▶" };
};

const StatusBadge = ({ stats, deadline }) => {
  const status = getProjectStatus(stats, deadline);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>
      <span>{status.icon}</span>
      {status.label}
    </span>
  );
};

const ProjectCard = ({ project, onOpen }) => {
  const stats = project.stats || {};
  const targetCount = stats.targetCount ?? stats.total ?? 0;
  const isDone = stats.total > 0 && stats.reviewed >= targetCount;
  const overdue = project.deadline && new Date(project.deadline) < new Date() && !isDone;
  const sampleRate = project.review_policy?.sample_rate != null
    ? Math.round(project.review_policy.sample_rate * 100)
    : null;

  return (
    <div
      className="group relative rounded-2xl border border-gray-700/60 bg-gray-800/80 p-5 shadow-lg backdrop-blur transition-all duration-200 hover:border-violet-500/40 hover:bg-gray-800 hover:shadow-xl cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-gray-100 group-hover:text-violet-300 transition-colors">
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-gray-500 truncate">
            {project.datasetId?.name || project.datasetName || "Dataset"}
          </p>
          {sampleRate !== null && (
            <p className="mt-0.5 text-xs text-violet-400/80">
              Sample rate: {sampleRate}%
            </p>
          )}
        </div>
        <StatusBadge stats={stats} deadline={project.deadline} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-gray-900/60 p-2.5 text-center">
          <p className="text-lg font-bold text-gray-200">{stats.project_total || stats.total || 0}</p>
          <p className="text-xs text-gray-500">Tổng item</p>
        </div>
        <div className="rounded-lg bg-yellow-500/5 p-2.5 text-center border border-yellow-500/10">
          <p className="text-lg font-bold text-yellow-400">{stats.pendingDisplay ?? stats.pending ?? 0}</p>
          <p className="text-xs text-yellow-500/70">Cần review</p>
        </div>
        <div className="rounded-lg bg-emerald-500/5 p-2.5 text-center border border-emerald-500/10">
          <p className="text-lg font-bold text-emerald-400">{stats.reviewed || 0}</p>
          <p className="text-xs text-emerald-500/70">Đã review</p>
        </div>
      </div>

      <div className="rounded-lg bg-gray-900/40 p-2 text-center mb-4">
        <p className="text-sm font-bold text-emerald-400">{stats.reviewed || 0} đã approved</p>
      </div>

      {stats.total > 0 && (
        <div className="mb-3">
          {(() => {
            const targetCount = stats.targetCount ?? stats.total;
            const pct = targetCount > 0 ? Math.min(100, Math.round((stats.reviewed / targetCount) * 100)) : 0;
            return (
              <>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Tiến độ review</span>
                  <span className="font-semibold text-gray-300">{stats.reviewed}/{targetCount}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stats.reviewed >= targetCount ? "bg-emerald-500" : "bg-gradient-to-r from-violet-600 to-fuchsia-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {project.deadline && (
        <div className={`flex items-center gap-1.5 text-xs ${overdue ? "text-rose-400" : "text-gray-500"}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Deadline: {fmtDateTime(project.deadline)}
          {overdue && <span className="ml-1 font-semibold">(Quá hạn)</span>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-400 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:bg-violet-600/10">
          Mở review
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
};

const ReviewerProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectsRes, pendingRes, reviewedRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { limit: 100 },
        }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/api/reviews/pending`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { page: 1, limit: 100 },
        }),
        axios.get(`${API_URL}/api/reviews/reviewed`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          params: { page: 1, limit: 100 },
        }),
      ]);

      const rawProj = projectsRes.data;
      const allProjects = Array.isArray(rawProj) ? rawProj : Array.isArray(rawProj?.data) ? rawProj.data : getArray(rawProj);

      const rawP = pendingRes.data;
      const pending = Array.isArray(rawP) ? rawP : Array.isArray(rawP?.reviews) ? rawP.reviews : getArray(rawP);
      const rawR = reviewedRes.data;
      const reviewed = Array.isArray(rawR) ? rawR : Array.isArray(rawR?.reviews) ? rawR.reviews : getArray(rawR);

      const projMap = {};

      // Seed map with all assigned projects (even those with no submitted tasks yet)
      allProjects.forEach((p) => {
        const pid = p.id || p._id;
        if (!pid) return;
        projMap[pid] = {
          id: pid,
          name: p.name || "Unknown Project",
          deadline: p.deadline || null,
          datasetId: p.datasetId || null,
          datasetName: p.datasetId?.name || p.datasetName || "",
          review_policy: p.review_policy || null,
          stats: {
            total: 0,
            project_total: p.total_tasks || p.totalTasks || 0,
            pending: 0, approved: 0, rejected: 0, reviewed: 0,
          },
        };
      });

      pending.forEach((t) => {
        const pid = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
        if (!pid) return;
        if (!projMap[pid]) {
          projMap[pid] = {
            id: pid,
            name: t.project?.name || t.projectId?.name || "Unknown Project",
            deadline: t.project?.deadline || t.projectId?.deadline || t.deadline || null,
            datasetId: null,
            datasetName: "",
            review_policy: null,
            stats: { total: 0, pending: 0, approved: 0, rejected: 0, reviewed: 0 },
          };
        }
        projMap[pid].stats.total += 1;
        projMap[pid].stats.pending += 1;
      });

      reviewed.forEach((t) => {
        const pid = t.project?.id || t.projectId?.id || (typeof t.projectId === 'string' ? t.projectId : null);
        if (!pid) return;
        if (!projMap[pid]) {
          projMap[pid] = {
            id: pid,
            name: t.project?.name || t.projectId?.name || "Unknown Project",
            deadline: t.project?.deadline || t.projectId?.deadline || t.deadline || null,
            datasetId: null,
            datasetName: "",
            review_policy: null,
            stats: { total: 0, pending: 0, approved: 0, rejected: 0, reviewed: 0 },
          };
        }
        const wasPending = pending.some((pt) => (pt.id || pt._id) === (t.id || t._id));
        if (!wasPending) projMap[pid].stats.total += 1;
        projMap[pid].stats.reviewed += 1;
        if (t.status === "approved") projMap[pid].stats.approved += 1;
        else if (t.status === "rejected") projMap[pid].stats.rejected += 1;
      });

      // Apply sample rate: compute targetCount and pendingDisplay per project
      const projectList = Object.values(projMap).map((p) => {
        const rawRate = p.review_policy?.sample_rate;
        const projectTotal = p.stats.project_total || p.stats.total;
        const targetCount = (rawRate != null && rawRate < 1 && projectTotal > 0)
          ? Math.max(1, Math.ceil(projectTotal * rawRate))
          : p.stats.total;
        const pendingDisplay = Math.max(0, targetCount - p.stats.reviewed);
        return { ...p, stats: { ...p.stats, targetCount, pendingDisplay } };
      });
      setProjects(projectList);
    } catch (err) {
      if (err.response?.status === 403) {
        setProjects([]);
        setError("");
      } else {
        setError(err.response?.data?.message || "Khong tai duoc danh sach project");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleOpenProject = (project) => {
    navigate(`/reviewer/projects/${project.id}`);
  };

  const filtered = projects.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchDataset = (p.datasetId?.name || p.datasetName || "").toLowerCase().includes(q);
      if (!matchName && !matchDataset) return false;
    }
    if (filter === "all") return true;
    const s = p.stats || {};
    const pDone = s.total > 0 && s.reviewed >= (s.targetCount ?? s.total);
    const overdue = p.deadline && new Date(p.deadline) < new Date() && !pDone;
    if (filter === "pending")      return (s.pendingDisplay ?? s.pending ?? 0) > 0;
    if (filter === "reviewed")     return pDone;
    if (filter === "has_rejected") return false;
    if (filter === "overdue")      return overdue;
    return true;
  });

  const isProjectDone = (p) => (p.stats?.total ?? 0) > 0 && (p.stats?.reviewed ?? 0) >= (p.stats?.targetCount ?? p.stats?.total ?? 0);
  const counts = {
    all:          projects.length,
    pending:      projects.filter((p) => (p.stats?.pendingDisplay ?? p.stats?.pending ?? 0) > 0).length,
    reviewed:     projects.filter(isProjectDone).length,
    has_rejected: 0,
    overdue:      projects.filter((p) => p.deadline && new Date(p.deadline) < new Date() && !isProjectDone(p)).length,
  };

  const filterTabs = [
    { key: "all",      label: "Tất cả" },
    { key: "pending",  label: "Cần review" },
    { key: "reviewed", label: "Đã xong" },
    { key: "overdue",  label: "Quá hạn" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-violet-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Đang tải danh sách project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-gray-200">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/80 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Công việc Review</h1>
              <p className="mt-1 text-sm text-gray-400">
                {projects.length} project &mdash;{" "}
                {projects.reduce((acc, p) => acc + (p.stats?.pendingDisplay ?? p.stats?.pending ?? 0), 0)} item cần review
              </p>
            </div>
            <button
              onClick={fetchProjects}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tải lại
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm project, dataset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800/80 py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  filter === tab.key
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "bg-gray-800/80 text-gray-400 hover:text-gray-200 border border-gray-700/60"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${filter === tab.key ? "bg-violet-500/30" : "bg-gray-700"}`}>
                  {counts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-700/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-12 text-center">
            <svg className="mx-auto w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-400">
              {filter === "all" && !searchQuery
                ? "Bạn chưa có project nào được phân công review."
                : "Không có project nào phù hợp."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={() => handleOpenProject(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerProjectList;

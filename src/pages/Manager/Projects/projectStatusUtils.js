import React from "react";
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as DraftIcon,
  Inventory as ArchiveIcon,
  PlayCircle as ActiveIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as HourglassIcon,
} from "@mui/icons-material";

export const STATUS_CFG = {
  active: {
    label: "Active",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    icon: <ActiveIcon sx={{ fontSize: 13 }} />,
  },
  draft: {
    label: "Draft",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
    icon: <DraftIcon sx={{ fontSize: 13 }} />,
  },
  completed: {
    label: "Completed",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    icon: <CheckIcon sx={{ fontSize: 13 }} />,
  },
  archived: {
    label: "Archived",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: <ArchiveIcon sx={{ fontSize: 13 }} />,
  },
  // Fallback: backend reports in_review but no task data available
  in_review: {
    label: "Đang review",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
    icon: <HourglassIcon sx={{ fontSize: 13 }} />,
  },
  // Annotator đã submit, reviewer cần hành động (deadline chưa qua)
  reviewer_pending: {
    label: "Chờ reviewer chấm",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.12)",
    border: "rgba(192,132,252,0.3)",
    icon: <HourglassIcon sx={{ fontSize: 13 }} />,
  },
  waiting_rework: {
    label: "Chờ sửa lại",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.3)",
    icon: <ErrorIcon sx={{ fontSize: 13 }} />,
  },
  annotator_overdue: {
    label: "Annotator quá hạn",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: <ErrorIcon sx={{ fontSize: 13 }} />,
  },
  reviewer_overdue: {
    label: "Reviewer quá hạn",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.3)",
    icon: <ErrorIcon sx={{ fontSize: 13 }} />,
  },
  rework_overdue: {
    label: "Sửa lại quá hạn",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: <ErrorIcon sx={{ fontSize: 13 }} />,
  },
  overdue: {
    label: "Quá hạn",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: <ErrorIcon sx={{ fontSize: 13 }} />,
  },
};

export const getCfg = (s) => STATUS_CFG[s] || STATUS_CFG.draft;

export const OVERDUE_STATUSES = [
  "annotator_overdue",
  "reviewer_overdue",
  "rework_overdue",
  "overdue",
];

export const normalizeProject = (p) => ({
  ...p,
  id: p?.id || p?._id,
  name: p?.name || "Untitled Project",
  description: p?.description || "",
  status: p?.status || "draft",
  dataset_id: p?.dataset_id || p?.datasetId || p?.dataset?.id || null,
  dataset_name: p?.dataset?.name || p?.datasetName || "",
  total_tasks: p?.total_tasks || p?.totalTasks || 0,
  createdAt: p?.created_at || p?.createdAt,
  deadline: p?.deadline || null,
});

export const fmtDateTime = (v) => {
  if (!v) return "N/A";
  const d = new Date(v);
  return isNaN(d)
    ? "N/A"
    : d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export const getDeadlineState = (deadline) => {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  const hours = diff / 36e5;
  if (diff < 0)
    return { label: "Quá hạn", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  if (hours < 24)
    return { label: "Hôm nay", color: "#f97316", bg: "rgba(249,115,22,0.1)" };
  if (hours < 72)
    return { label: "Sắp đến", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
  return null;
};

// Tổng hợp số lượng task theo từng trạng thái
export const computeTaskStats = (tasks) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  const total = tasks.length;
  return {
    total,
    assigned: tasks.filter((t) => t.status === "assigned").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    submitted: tasks.filter((t) => t.status === "submitted").length,
    resubmitted: tasks.filter((t) => t.status === "resubmitted").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
    approved: tasks.filter((t) => t.status === "approved").length,
  };
};

/**
 * Tính trạng thái hiển thị thực tế của project.
 * Nếu có taskStats (từ task-level API), dùng để xác định chính xác ai có lỗi.
 * Nếu không có, fallback sang project.status + deadline.
 */
export const getDisplayStatus = (project, taskStats = null) => {
  if (project.status === "archived") return "archived";

  const isOverdue =
    project.deadline && new Date(project.deadline) < new Date();

  if (taskStats && taskStats.total > 0) {
    const { assigned, inProgress, submitted, resubmitted, rejected, approved, total } = taskStats;

    if (approved === total) return "completed";

    // Annotator chưa nộp (bao gồm cả task mới assign lẫn đang làm dở)
    const pendingAnnotator = assigned + inProgress;
    // Reviewer cần xem (annotator đã nộp, kể cả nộp lại)
    const pendingReviewer = submitted + resubmitted;

    if (isOverdue) {
      // Ưu tiên: annotator chưa nộp > sửa lại chưa xong > reviewer chưa chấm
      if (pendingAnnotator > 0) return "annotator_overdue";
      if (rejected > 0) return "rework_overdue";
      if (pendingReviewer > 0) return "reviewer_overdue";
      return "overdue";
    }

    // Chưa quá hạn
    if (rejected > 0) return "waiting_rework";
    if (pendingReviewer > 0) return "reviewer_pending"; // annotator đã làm, reviewer chưa chấm
    if (pendingAnnotator > 0) return project.status === "draft" ? "draft" : "active";
    return project.status;
  }

  // Fallback: không có task data
  if (!isOverdue) {
    // in_review từ backend → annotator đã submit, reviewer cần hành động
    return project.status === "in_review" ? "reviewer_pending" : project.status;
  }

  switch (project.status) {
    case "completed":
      return "overdue";
    case "draft":
    case "active":
      return "annotator_overdue";
    case "in_review":
      return "reviewer_overdue";
    case "waiting_rework":
      return "rework_overdue";
    default:
      return "overdue";
  }
};

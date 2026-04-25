// projectStatusUtils.js
// Chứa toàn bộ logic tính toán & hiển thị trạng thái của Project.
// Được dùng chung bởi trang danh sách Projects (index.jsx), hook useProjects,
// và trang chi tiết ProjectDetail.

import React from "react";
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as DraftIcon,
  Inventory as ArchiveIcon,
  PlayCircle as ActiveIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as HourglassIcon,
} from "@mui/icons-material";

// Bảng cấu hình màu sắc + icon cho từng trạng thái project
// Key = tên status, value = { label hiển thị, màu chữ, màu nền, icon }
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

// Lấy cấu hình hiển thị của một status; fallback về "draft" nếu không tìm thấy
export const getCfg = (s) => STATUS_CFG[s] || STATUS_CFG.draft;

// Danh sách các status được coi là "quá hạn" — dùng để filter & đếm ở trang danh sách
export const OVERDUE_STATUSES = [
  "annotator_overdue",
  "reviewer_overdue",
  "rework_overdue",
  "overdue",
];

// Chuẩn hóa object project từ API về shape nhất quán để dùng trong UI.
// Backend có thể trả về nhiều tên field khác nhau (id/_id, dataset_id/datasetId, v.v.)
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

// Format ngày giờ sang chuỗi tiếng Việt "dd/mm/yyyy hh:mm"; trả về "N/A" nếu không có giá trị
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

// Tính trạng thái cảnh báo deadline để hiển thị badge màu trên card project.
// Trả về null nếu project đã xong (completed/archived) hoặc chưa đến hạn cảnh báo.
// Trả về { label, color, bg } nếu quá hạn / còn < 24h / còn < 72h.
export const getDeadlineState = (deadline, status) => {
  if (!deadline) return null;
  if (status === "completed" || status === "archived") return null;
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

// Đếm task theo từng nhóm trạng thái từ mảng task raw của API.
// Kết quả được dùng trong getDisplayStatus để suy ra trạng thái thực tế của project.
// submitted/pending_review/in_review => nhóm "chờ reviewer chấm"
// resubmitted/partially_reviewed     => nhóm "đã nộp lại"
export const computeTaskStats = (tasks) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  const total = tasks.length;
  return {
    total,
    assigned: tasks.filter((t) => t.status === "assigned").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    // submitted/resubmitted + pending_review/in_review đều là "đang chờ reviewer chấm"
    submitted: tasks.filter((t) => ["submitted", "pending_review", "in_review"].includes(t.status)).length,
    resubmitted: tasks.filter((t) => ["resubmitted", "partially_reviewed"].includes(t.status)).length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
    approved: tasks.filter((t) => ["approved", "fully_reviewed", "finalized"].includes(t.status)).length,
  };
};

// Hàm trung tâm: tính trạng thái hiển thị thực tế của project từ dữ liệu task.
//
// Logic ưu tiên:
//   1. archived  → luôn trả về "archived"
//   2. Có taskStats + đã quá deadline → phân loại ai gây quá hạn
//      (annotator chưa nộp > có task bị reject > reviewer chưa chấm)
//   3. Có taskStats + chưa quá deadline → tính theo tiến độ task hiện tại
//   4. Không có taskStats → fallback theo project.status + deadline
//
// Được gọi ở trang danh sách (index.jsx), ProjectCard, và hook useProjects.counts
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
  const REVIEWER_STATUSES = ["in_review", "pending_review", "reviewer_pending"];

  if (!isOverdue) {
    return REVIEWER_STATUSES.includes(project.status) ? "reviewer_pending" : project.status;
  }

  switch (project.status) {
    case "completed":
      return "completed";
    case "draft":
    case "active":
      return "annotator_overdue";
    case "in_review":
    case "pending_review":
    case "reviewer_pending":
      return "reviewer_overdue";
    case "waiting_rework":
      return "rework_overdue";
    default:
      return "overdue";
  }
};

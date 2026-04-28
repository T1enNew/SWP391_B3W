// Projects/index.jsx
// Trang quản lý danh sách Project dành cho Manager.
//
// Layout:
//   Header     — tên trang, nút "New Project", nút làm mới
//   StatTiles  — các ô đếm project theo status (All / Active / Completed / Draft / Chờ reviewer / Quá hạn / Archived)
//                Click vào tile → lọc danh sách bên dưới theo status đó
//   Search     — tìm theo tên project, mô tả, hoặc tên dataset
//   Grid       — lưới ProjectCard (3 cột trên lg, 2 cột trên sm)
//
// Dialogs:
//   DeleteDialog      — xác nhận xóa project (action không thể hoàn tác)
//   ProjectInfoListDialog — xem thông tin đầy đủ của 1 project (fetch thêm tasks để lấy annotator/reviewer)
//
// Data đến từ useProjects() hook — component này chỉ render + xử lý local dialog state.
// taskStatsMap được truyền vào ProjectCard để tính displayStatus chính xác từ task thực tế.

import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  Assignment as TaskIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as DraftIcon,
  Inventory as ArchiveIcon,
  PlayCircle as ActiveIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as HourglassIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../../config/api";
import { getAuthHeaders } from "../../../utils/auth";
import { getCfg, getDisplayStatus, fmtDateTime, getDeadlineState, OVERDUE_STATUSES } from "./projectStatusUtils";
import { useProjects } from "./hooks/useProjects";
import ProjectInfoListDialog from "./ProjectInfoListDialog";

// Bảng màu chính của trang (tối, dark theme)
const BG = "#080f1e", PANEL = "#0d1829", BORDER = "#1e2d47";
const TEXT = "#e2e8f0", MUTED = "#64748b", PRIMARY = "#3b82f6";

// Ô thống kê nhỏ ở đầu trang (Tất cả / Active / Completed / Draft / Overdue...)
// Khi click → set statusFilter để lọc danh sách bên dưới
const StatTile = ({ icon, value, label, active, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      minWidth: 110,
      bgcolor: active ? "rgba(59,130,246,0.08)" : PANEL,
      border: `1px solid ${active ? "rgba(59,130,246,0.4)" : BORDER}`,
      borderRadius: 3,
      px: 2.5,
      py: 2,
      cursor: "pointer",
      transition: "all 0.15s",
      "&:hover": { borderColor: "rgba(59,130,246,0.3)", bgcolor: "rgba(59,130,246,0.05)" },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
      <Box sx={{ color: active ? PRIMARY : MUTED }}>{icon}</Box>
      <Typography
        sx={{ color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}
      >
        {label}
      </Typography>
    </Box>
    <Typography sx={{ color: active ? PRIMARY : TEXT, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
      {value}
    </Typography>
  </Box>
);

// Card hiển thị thông tin tóm tắt 1 project: tên, status badge, dataset, số task, deadline.
// taskStats: kết quả từ computeTaskStats — nếu chưa load xong thì hiển thị spinner trên status badge.
const ProjectCard = ({ project, taskStats, taskStatsLoading, datasets, onInfo, onDelete, onNavigate }) => {
  const cfg = getCfg(getDisplayStatus(project, taskStats));
  const dlState = getDeadlineState(project.deadline, getDisplayStatus(project, taskStats));
  const dsName =
    project.dataset_name ||
    datasets.find((d) => d.id === project.dataset_id)?.name ||
    "N/A";

  return (
    <Box
      sx={{
        bgcolor: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        p: 2.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        transition: "all 0.15s",
        "&:hover": { borderColor: "#2d4060", boxShadow: "0 8px 28px rgba(0,0,0,0.3)", transform: "translateY(-1px)" },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: TEXT, fontWeight: 700, fontSize: 15, lineHeight: 1.35,
              overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}
          >
            {project.name}
          </Typography>
          {project.description && (
            <Typography
              sx={{
                color: MUTED, fontSize: 12.5, mt: 0.4, lineHeight: 1.4,
                overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
              }}
            >
              {project.description}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          {/* Status badge */}
          {taskStatsLoading && !taskStats ? (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.2, py: 0.35 }}>
              <CircularProgress size={10} sx={{ color: MUTED }} />
              <Typography sx={{ color: MUTED, fontSize: 11 }}>...</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "inline-flex", alignItems: "center", gap: 0.5,
                bgcolor: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, px: 1.2, py: 0.35,
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: cfg.color, flexShrink: 0 }} />
              <Typography sx={{ color: cfg.color, fontSize: 11, fontWeight: 700 }}>{cfg.label}</Typography>
            </Box>
          )}
          <Tooltip title="Thông tin đầy đủ">
            <IconButton
              size="small"
              onClick={() => onInfo(project)}
              sx={{ color: MUTED, width: 26, height: 26, "&:hover": { color: TEXT, bgcolor: "rgba(255,255,255,0.06)" } }}
            >
              <InfoIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Info rows */}
      <Stack spacing={1.2} sx={{ flex: 1 }}>
        {[
          { label: "Dataset", value: dsName, valueProps: { maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, titleAttr: dsName },
          { label: "Tasks", value: `${project.total_tasks} tác vụ` },
        ].map(({ label, value, valueProps = {}, titleAttr }) => (
          <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ color: MUTED, fontSize: 12.5 }}>{label}</Typography>
            <Typography sx={{ color: TEXT, fontSize: 12.5, fontWeight: 600, ...valueProps }} title={titleAttr}>
              {value}
            </Typography>
          </Box>
        ))}

        {/* Deadline */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Typography sx={{ color: MUTED, fontSize: 12.5, flexShrink: 0 }}>Deadline</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {dlState && (
              <Box sx={{ bgcolor: dlState.bg, border: `1px solid ${dlState.color}30`, borderRadius: 10, px: 1, py: 0.15 }}>
                <Typography sx={{ color: dlState.color, fontSize: 10, fontWeight: 700 }}>{dlState.label}</Typography>
              </Box>
            )}
            <Typography sx={{ color: dlState ? dlState.color : TEXT, fontSize: 12.5, fontWeight: 600 }}>
              {fmtDateTime(project.deadline)}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: "#3d5068", fontSize: 11.5, pt: 0.5 }}>
          Tạo lúc: {fmtDateTime(project.createdAt)}
        </Typography>
      </Stack>

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 1, pt: 1.5, borderTop: `1px solid ${BORDER}` }}>
        <Button
          fullWidth size="small" variant="contained"
          startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
          onClick={() => onNavigate(project.id)}
          sx={{ bgcolor: PRIMARY, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: 13, boxShadow: "none", "&:hover": { bgcolor: "#2563eb" } }}
        >
          Chi tiết
        </Button>
        <Tooltip title="Xóa project">
          <IconButton
            size="small"
            onClick={() => onDelete(project)}
            sx={{
              color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 2, px: 1.5,
              "&:hover": { color: "#ef4444", bgcolor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// Projects — Component trang chính, render toàn bộ layout và kết nối dialog state
export default function Projects() {
  const navigate = useNavigate();
  const { projects, datasets, loading, taskStatsMap, taskStatsLoading, error, counts, loadData } = useProjects();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null });
  const [infoDialog, setInfoDialog] = useState({ open: false, project: null, detail: null, loading: false });

  // Lọc danh sách project theo ô tìm kiếm (tên/mô tả/dataset) và statusFilter đang chọn.
  // OVERDUE_STATUSES bao gồm nhiều sub-status → filter "overdue" gom tất cả lại
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const okSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.dataset_name.toLowerCase().includes(q);
      const ds = getDisplayStatus(p, taskStatsMap[p.id || p._id ] || null);
      const okStatus =
        statusFilter === "all" ||
        statusFilter === ds ||
        (statusFilter === "overdue" && OVERDUE_STATUSES.includes(ds));
      return okSearch && okStatus;
    });
  }, [projects, taskStatsMap, search, statusFilter]);

  // Mở popup thông tin đầy đủ của project.
  // Fetch lại project detail + task list để trích xuất annotator/reviewer từ tasks
  // (vì API project không trả trực tiếp danh sách thành viên).
  const openInfo = async (project) => {
    setInfoDialog({ open: true, project, detail: null, loading: true });
    try {
      const [projRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/projects/${project.id}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/tasks/project/${project.id}`, { headers: getAuthHeaders() }),
      ]);

      const raw =
        projRes.status === "fulfilled"
          ? projRes.value.data?.project || projRes.value.data || {}
          : {};

      if (tasksRes.status === "fulfilled") {
        const tasks = Array.isArray(tasksRes.value.data)
          ? tasksRes.value.data
          : tasksRes.value.data?.data || tasksRes.value.data?.tasks || [];

        const annotatorMap = new Map();
        let reviewerObj = null;

        tasks.forEach((t) => {
          const annObj = t.annotatorId || t.annotator || null;
          if (annObj) {
            const aid = annObj?.id || annObj?._id || (typeof annObj === "string" ? annObj : null);
            if (aid && !annotatorMap.has(String(aid)))
              annotatorMap.set(String(aid), typeof annObj === "object" ? annObj : { id: annObj });
          }
          (t.reviewers || []).forEach((rv) => {
            if (!reviewerObj) {
              const rvObj = rv?.reviewerId;
              if (rvObj) reviewerObj = typeof rvObj === "object" ? rvObj : { id: rvObj };
            }
          });
          if (!reviewerObj) {
            const rvFb = t.reviewerId || t.reviewer_id || t.reviewer;
            if (rvFb) reviewerObj = typeof rvFb === "object" ? rvFb : { id: rvFb };
          }
        });

        if (annotatorMap.size > 0) raw._taskAnnotators = Array.from(annotatorMap.values());
        if (reviewerObj) raw._taskReviewer = reviewerObj;
      }

      setInfoDialog((prev) => ({ ...prev, detail: raw, loading: false }));
    } catch {
      setInfoDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeInfo = () => setInfoDialog({ open: false, project: null, detail: null, loading: false });

  // Xóa project đang được chọn trong deleteDialog, rồi reload lại danh sách
  const deleteProject = async () => {
    const project = deleteDialog.project;
    if (!project) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${project.id}`, { headers: getAuthHeaders() });
      setDeleteDialog({ open: false, project: null });
      await loadData();
      setToast({ open: true, message: "Xóa project thành công", severity: "success" });
    } catch (e) {
      setToast({ open: true, message: e?.response?.data?.message || "Xóa project thất bại", severity: "error" });
    }
  };

  // Cấu hình các ô StatTile — chỉ render "Chờ reviewer" và "Quá hạn" khi có project thuộc nhóm đó
  const statTiles = [
    { key: "all",              icon: <TaskIcon sx={{ fontSize: 16 }} />,     label: "Tất cả",      count: counts.all              },
    { key: "active",           icon: <ActiveIcon sx={{ fontSize: 16 }} />,   label: "Active",      count: counts.active           },
    { key: "completed",        icon: <CheckIcon sx={{ fontSize: 16 }} />,    label: "Completed",   count: counts.completed        },
    { key: "draft",            icon: <DraftIcon sx={{ fontSize: 16 }} />,    label: "Draft",       count: counts.draft            },
    ...(counts.reviewer_pending > 0
      ? [{ key: "reviewer_pending", icon: <HourglassIcon sx={{ fontSize: 16 }} />, label: "Chờ reviewer", count: counts.reviewer_pending }]
      : []),
    ...(counts.overdue > 0
      ? [{ key: "overdue", icon: <ErrorIcon sx={{ fontSize: 16 }} />, label: "Quá hạn", count: counts.overdue }]
      : []),
    ...(counts.archived > 0
      ? [{ key: "archived", icon: <ArchiveIcon sx={{ fontSize: 16 }} />, label: "Archived", count: counts.archived }]
      : []),
  ];

  // mergedInfoProject: gộp dữ liệu project từ danh sách (có taskStats) + detail từ API (có annotators đầy đủ).
  // Dùng spread để không mất field nào, detail API override field trùng tên nếu có
  const mergedInfoProject = infoDialog.project
    ? infoDialog.detail
      ? { ...infoDialog.project, ...infoDialog.detail }
      : infoDialog.project
    : null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: BG }}>
      {/* ── Header ── */}
      <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 3 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: 2,
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <TaskIcon sx={{ fontSize: 20, color: "#fff" }} />
              </Box>
              <Typography sx={{ color: TEXT, fontSize: 26, fontWeight: 800 }}>Projects</Typography>
            </Box>
            <Typography sx={{ color: MUTED, fontSize: 14, ml: 0.5 }}>
              Quản lý toàn bộ dự án annotation
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Làm mới">
              <span>
                <IconButton
                  onClick={loadData}
                  disabled={loading}
                  sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 2, "&:hover": { color: TEXT, bgcolor: "rgba(255,255,255,0.05)" } }}
                >
                  {loading ? <CircularProgress size={18} sx={{ color: PRIMARY }} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/manager/projects/create")}
              sx={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                borderRadius: 2, fontWeight: 700, textTransform: "none", px: 3,
                boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
                "&:hover": { background: "linear-gradient(135deg, #2563eb, #1d4ed8)" },
              }}
            >
              New Project
            </Button>
          </Stack>
        </Box>

        {/* Stat tiles */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {statTiles.map(({ key, icon, label, count }) => (
            <StatTile
              key={key}
              icon={icon}
              value={count}
              label={label}
              active={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* Search */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <TextField
            size="small"
            placeholder="Tìm theo tên project, mô tả, dataset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              maxWidth: 420, flex: 1,
              "& .MuiOutlinedInput-root": {
                bgcolor: PANEL, color: TEXT, borderRadius: 2,
                "& fieldset": { borderColor: BORDER },
                "&:hover fieldset": { borderColor: "#2d4060" },
                "&.Mui-focused fieldset": { borderColor: PRIMARY },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: MUTED, fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
          {search && (
            <Chip
              label={`${filtered.length} kết quả`}
              size="small"
              sx={{ bgcolor: "rgba(59,130,246,0.12)", color: "#93c5fd", fontWeight: 600 }}
            />
          )}
        </Box>

        {/* Grid */}
        {loading && projects.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 16, gap: 2 }}>
            <CircularProgress sx={{ color: PRIMARY }} />
            <Typography sx={{ color: MUTED, fontSize: 14 }}>Đang tải projects...</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              display: "flex", flexDirection: "column", alignItems: "center",
              py: 14, gap: 2.5, border: `1.5px dashed ${BORDER}`, borderRadius: 4,
            }}
          >
            <Box
              sx={{
                width: 72, height: 72, borderRadius: "50%",
                bgcolor: "rgba(59,130,246,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <TaskIcon sx={{ fontSize: 36, color: PRIMARY, opacity: 0.5 }} />
            </Box>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 17 }}>
              {search ? "Không tìm thấy project nào" : "Chưa có project nào"}
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: 13 }}>
              {search
                ? `Kết quả cho "${search}"`
                : "Tạo project đầu tiên để bắt đầu annotation"}
            </Typography>
            {!search && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/manager/projects/create")}
                sx={{
                  background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                  textTransform: "none", fontWeight: 700, borderRadius: 2, px: 4,
                }}
              >
                Tạo project mới
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {filtered.map((project) => (
              <Grid item xs={12} sm={6} lg={4} key={project.id}>
                <ProjectCard
                  project={project}
                  taskStats={taskStatsMap[project.id] || null}
                  taskStatsLoading={taskStatsLoading}
                  datasets={datasets}
                  onInfo={openInfo}
                  onDelete={(p) => setDeleteDialog({ open: true, project: p })}
                  onNavigate={(id) => navigate(`/manager/projects/${id}`)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, project: null })}
        PaperProps={{ sx: { bgcolor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT } }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2 }}>
          Xóa project
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ color: TEXT }}>
            Bạn có chắc muốn xóa project{" "}
            <Typography component="span" sx={{ fontWeight: 800, color: "#f87171" }}>
              "{deleteDialog.project?.name}"
            </Typography>
            ?
          </Typography>
          <Typography sx={{ color: "#ef4444", fontSize: 13, mt: 1 }}>
            ⚠ Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, project: null })}
            sx={{ color: MUTED, textTransform: "none" }}
          >
            Hủy
          </Button>
          <Button
            variant="contained" color="error" onClick={deleteProject}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Xóa project
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Info Dialog ── */}
      <ProjectInfoListDialog
        open={infoDialog.open}
        onClose={closeInfo}
        project={mergedInfoProject}
        infoLoading={infoDialog.loading}
        taskStatsMap={taskStatsMap}
        datasets={datasets}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((p) => ({ ...p, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

import React, { useEffect, useMemo, useState } from "react";
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
import { getArray } from "../../../utils/api";
import {
  STATUS_CFG,
  getCfg,
  OVERDUE_STATUSES,
  normalizeProject,
  fmtDateTime,
  getDeadlineState,
  computeTaskStats,
  getDisplayStatus,
} from "./projectStatusUtils";

const BG = "#080f1e",
  PANEL = "#0d1829",
  BORDER = "#1e2d47";
const TEXT = "#e2e8f0",
  MUTED = "#64748b",
  PRIMARY = "#3b82f6";

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Stat Tile ──────────────────────────────────────────────────────────────────
const StatTile = ({ icon, value, label, accent, active, onClick }) => (
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
      "&:hover": {
        borderColor: "rgba(59,130,246,0.3)",
        bgcolor: "rgba(59,130,246,0.05)",
      },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
      <Box sx={{ color: active ? PRIMARY : MUTED }}>{icon}</Box>
      <Typography
        sx={{
          color: MUTED,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Typography>
    </Box>
    <Typography
      sx={{
        color: active ? PRIMARY : TEXT,
        fontSize: 26,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
  </Box>
);

// ── Project Card ───────────────────────────────────────────────────────────────
const ProjectCard = ({
  project,
  taskStats,
  taskStatsLoading,
  datasets,
  onInfo,
  onDelete,
  onNavigate,
}) => {
  const cfg = getCfg(getDisplayStatus(project, taskStats));
  const dlState = getDeadlineState(
    project.deadline,
    getDisplayStatus(project, taskStats),
  );
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
        "&:hover": {
          borderColor: "#2d4060",
          boxShadow: "0 8px 28px rgba(0,0,0,0.3)",
          transform: "translateY(-1px)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: TEXT,
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.35,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {project.name}
          </Typography>
          {project.description && (
            <Typography
              sx={{
                color: MUTED,
                fontSize: 12.5,
                mt: 0.4,
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
              }}
            >
              {project.description}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          {/* Status badge */}
          {taskStatsLoading && !taskStats ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.2,
                py: 0.35,
              }}
            >
              <CircularProgress size={10} sx={{ color: MUTED }} />
              <Typography sx={{ color: MUTED, fontSize: 11 }}>...</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 10,
                px: 1.2,
                py: 0.35,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: cfg.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{ color: cfg.color, fontSize: 11, fontWeight: 700 }}
              >
                {cfg.label}
              </Typography>
            </Box>
          )}
          <Tooltip title="Thông tin đầy đủ">
            <IconButton
              size="small"
              onClick={() => onInfo(project)}
              sx={{
                color: MUTED,
                width: 26,
                height: 26,
                "&:hover": { color: TEXT, bgcolor: "rgba(255,255,255,0.06)" },
              }}
            >
              <InfoIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Info rows */}
      <Stack spacing={1.2} sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ color: MUTED, fontSize: 12.5 }}>Dataset</Typography>
          <Typography
            sx={{
              color: TEXT,
              fontSize: 12.5,
              fontWeight: 600,
              maxWidth: 160,
              textAlign: "right",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={dsName}
          >
            {dsName}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ color: MUTED, fontSize: 12.5 }}>Tasks</Typography>
          <Typography sx={{ color: TEXT, fontSize: 12.5, fontWeight: 600 }}>
            {project.total_tasks} tác vụ
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography sx={{ color: MUTED, fontSize: 12.5, flexShrink: 0 }}>
            Deadline
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {dlState && (
              <Box
                sx={{
                  bgcolor: dlState.bg,
                  border: `1px solid ${dlState.color}30`,
                  borderRadius: 10,
                  px: 1,
                  py: 0.15,
                }}
              >
                <Typography
                  sx={{ color: dlState.color, fontSize: 10, fontWeight: 700 }}
                >
                  {dlState.label}
                </Typography>
              </Box>
            )}
            <Typography
              sx={{
                color: dlState ? dlState.color : TEXT,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {fmtDateTime(project.deadline)}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: "#3d5068", fontSize: 11.5, pt: 0.5 }}>
          Tạo lúc: {fmtDateTime(project.createdAt)}
        </Typography>
      </Stack>

      {/* Actions */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          pt: 1.5,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <Button
          fullWidth
          size="small"
          variant="contained"
          startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
          onClick={() => onNavigate(project.id)}
          sx={{
            bgcolor: PRIMARY,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "none",
            "&:hover": { bgcolor: "#2563eb" },
          }}
        >
          Chi tiết
        </Button>
        <Tooltip title="Xóa project">
          <IconButton
            size="small"
            onClick={() => onDelete(project)}
            sx={{
              color: MUTED,
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              px: 1.5,
              "&:hover": {
                color: "#ef4444",
                bgcolor: "rgba(239,68,68,0.08)",
                borderColor: "rgba(239,68,68,0.25)",
              },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────────
export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskStatsMap, setTaskStatsMap] = useState({});
  const [taskStatsLoading, setTaskStatsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    project: null,
  });
  const [infoProject, setInfoProject] = useState(null);
  const [infoDetail, setInfoDetail] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setTaskStatsMap({});
    try {
      const [projectRes, datasetRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/projects`, {
          params: { page: 1, limit: 100 },
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
      ]);

      let pList = [];
      if (projectRes.status === "fulfilled") {
        const pData = projectRes.value.data;
        pList = pData?.data ? pData.data : getArray(pData);
        setProjects(pList.map(normalizeProject));
      } else {
        setError("Không tải được danh sách project");
      }
      if (datasetRes.status === "fulfilled")
        setDatasets(getArray(datasetRes.value.data));

      // Phase 2: batch-fetch task stats để tính trạng thái chính xác theo task
      if (pList.length > 0) {
        setTaskStatsLoading(true);
        const taskResults = await Promise.allSettled(
          pList.map((p) =>
            axios.get(`${API_URL}/api/tasks/project/${p.id || p._id}`, {
              headers: getAuthHeaders(),
            }),
          ),
        );
        const statsMap = {};
        taskResults.forEach((res, i) => {
          if (res.status === "fulfilled") {
            const raw = Array.isArray(res.value.data)
              ? res.value.data
              : res.value.data?.data || res.value.data?.tasks || [];
            const pid = pList[i].id || pList[i]._id;
            const stats = computeTaskStats(raw);
            if (stats) statsMap[pid] = stats;
          }
        });
        setTaskStatsMap(statsMap);
        setTaskStatsLoading(false);
      }
    } catch (e) {
      setError(
        e?.response?.data?.message || e.message || "Không tải được project",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openInfo = async (project) => {
    setInfoProject(project);
    setInfoDetail(null);
    setInfoLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/projects/${project.id}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/tasks/project/${project.id}`, { headers: getAuthHeaders() }),
      ]);

      const raw = projRes.status === "fulfilled"
        ? (projRes.value.data?.project || projRes.value.data || {})
        : {};

      // Lấy annotators/reviewer từ tasks (đáng tin hơn project object)
      if (tasksRes.status === "fulfilled") {
        const tasks = Array.isArray(tasksRes.value.data)
          ? tasksRes.value.data
          : tasksRes.value.data?.data || tasksRes.value.data?.tasks || [];

        const annotatorMap = new Map(); // id → object
        let reviewerObj = null;

        tasks.forEach((t) => {
          // Annotator
          const annObj = t.annotatorId || t.annotator || null;
          if (annObj) {
            const aid = annObj?.id || annObj?._id || (typeof annObj === "string" ? annObj : null);
            if (aid && !annotatorMap.has(String(aid))) {
              annotatorMap.set(String(aid), typeof annObj === "object" ? annObj : { id: annObj });
            }
          }
          // Reviewer từ reviewers array
          const reviewers = t.reviewers || [];
          reviewers.forEach((rv) => {
            if (!reviewerObj) {
              const rvObj = rv?.reviewerId;
              if (rvObj) reviewerObj = typeof rvObj === "object" ? rvObj : { id: rvObj };
            }
          });
          // Reviewer fallback
          if (!reviewerObj) {
            const rvFb = t.reviewerId || t.reviewer_id || t.reviewer;
            if (rvFb) reviewerObj = typeof rvFb === "object" ? rvFb : { id: rvFb };
          }
        });

        if (annotatorMap.size > 0) raw._taskAnnotators = Array.from(annotatorMap.values());
        if (reviewerObj) raw._taskReviewer = reviewerObj;
      }

      setInfoDetail(raw);
    } catch {
      // fallback to basic project data
    } finally {
      setInfoLoading(false);
    }
  };

  const closeInfo = () => {
    setInfoProject(null);
    setInfoDetail(null);
  };

  const counts = useMemo(() => {
    const ds = (p) => getDisplayStatus(p, taskStatsMap[p.id] || null);
    return {
      all: projects.length,
      active: projects.filter((p) => ds(p) === "active").length,
      completed: projects.filter((p) => ds(p) === "completed").length,
      draft: projects.filter((p) => ds(p) === "draft").length,
      archived: projects.filter((p) => ds(p) === "archived").length,
      reviewer_pending: projects.filter((p) => ds(p) === "reviewer_pending")
        .length,
      overdue: projects.filter((p) => OVERDUE_STATUSES.includes(ds(p))).length,
    };
  }, [projects, taskStatsMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const okSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.dataset_name.toLowerCase().includes(q);
      const ds = getDisplayStatus(p, taskStatsMap[p.id] || null);
      const okStatus =
        statusFilter === "all" ||
        statusFilter === ds ||
        (statusFilter === "overdue" && OVERDUE_STATUSES.includes(ds));
      return okSearch && okStatus;
    });
  }, [projects, taskStatsMap, search, statusFilter]);

  const deleteProject = async () => {
    const project = deleteDialog.project;
    if (!project) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${project.id}`, {
        headers: getAuthHeaders(),
      });
      setDeleteDialog({ open: false, project: null });
      await loadData();
      setToast({
        open: true,
        message: "Xóa project thành công",
        severity: "success",
      });
    } catch (e) {
      setToast({
        open: true,
        message: e?.response?.data?.message || "Xóa project thất bại",
        severity: "error",
      });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: BG }}>
      {/* ── Header ── */}
      <Box
        sx={{
          px: 4,
          pt: 4,
          pb: 3,
          borderBottom: `1px solid ${BORDER}`,
          bgcolor: PANEL,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TaskIcon sx={{ fontSize: 20, color: "#fff" }} />
              </Box>
              <Typography sx={{ color: TEXT, fontSize: 26, fontWeight: 800 }}>
                Projects
              </Typography>
            </Box>
            <Typography sx={{ color: MUTED, fontSize: 14, ml: 0.5 }}>
              Quản lý toàn bộ dự án annotation
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Làm mới">
              <IconButton
                onClick={loadData}
                disabled={loading}
                sx={{
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 2,
                  "&:hover": { color: TEXT, bgcolor: "rgba(255,255,255,0.05)" },
                }}
              >
                {loading ? (
                  <CircularProgress size={18} sx={{ color: PRIMARY }} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/manager/projects/create")}
              sx={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                px: 3,
                boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                },
              }}
            >
              New Project
            </Button>
          </Stack>
        </Box>

        {/* Stat tiles */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <StatTile
            icon={<TaskIcon sx={{ fontSize: 16 }} />}
            value={counts.all}
            label="Tất cả"
            accent="#6366f1"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatTile
            icon={<ActiveIcon sx={{ fontSize: 16 }} />}
            value={counts.active}
            label="Active"
            accent="#22c55e"
            active={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
          />
          <StatTile
            icon={<CheckIcon sx={{ fontSize: 16 }} />}
            value={counts.completed}
            label="Completed"
            accent="#3b82f6"
            active={statusFilter === "completed"}
            onClick={() => setStatusFilter("completed")}
          />
          <StatTile
            icon={<DraftIcon sx={{ fontSize: 16 }} />}
            value={counts.draft}
            label="Draft"
            accent="#94a3b8"
            active={statusFilter === "draft"}
            onClick={() => setStatusFilter("draft")}
          />
          {counts.reviewer_pending > 0 && (
            <StatTile
              icon={<HourglassIcon sx={{ fontSize: 16 }} />}
              value={counts.reviewer_pending}
              label="Chờ reviewer"
              accent="#c084fc"
              active={statusFilter === "reviewer_pending"}
              onClick={() => setStatusFilter("reviewer_pending")}
            />
          )}
          {counts.overdue > 0 && (
            <StatTile
              icon={<ErrorIcon sx={{ fontSize: 16 }} />}
              value={counts.overdue}
              label="Quá hạn"
              accent="#ef4444"
              active={statusFilter === "overdue"}
              onClick={() => setStatusFilter("overdue")}
            />
          )}
          {counts.archived > 0 && (
            <StatTile
              icon={<ArchiveIcon sx={{ fontSize: 16 }} />}
              value={counts.archived}
              label="Archived"
              accent="#f59e0b"
              active={statusFilter === "archived"}
              onClick={() => setStatusFilter("archived")}
            />
          )}
        </Stack>
      </Box>

      <Box sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search bar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <TextField
            size="small"
            placeholder="Tìm theo tên project, mô tả, dataset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              maxWidth: 420,
              flex: 1,
              "& .MuiOutlinedInput-root": {
                bgcolor: PANEL,
                color: TEXT,
                borderRadius: 2,
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
              sx={{
                bgcolor: "rgba(59,130,246,0.12)",
                color: "#93c5fd",
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {/* Grid */}
        {loading && projects.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 16,
              gap: 2,
            }}
          >
            <CircularProgress sx={{ color: PRIMARY }} />
            <Typography sx={{ color: MUTED, fontSize: 14 }}>
              Đang tải projects...
            </Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 14,
              gap: 2.5,
              border: `1.5px dashed ${BORDER}`,
              borderRadius: 4,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(59,130,246,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TaskIcon sx={{ fontSize: 36, color: PRIMARY, opacity: 0.5 }} />
            </Box>
            <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 17 }}>
              {search ? `Không tìm thấy project nào` : "Chưa có project nào"}
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
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 4,
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
        PaperProps={{
          sx: {
            bgcolor: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            color: TEXT,
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, borderBottom: `1px solid ${BORDER}`, pb: 2 }}
        >
          Xóa project
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ color: TEXT }}>
            Bạn có chắc muốn xóa project{" "}
            <Typography
              component="span"
              sx={{ fontWeight: 800, color: "#f87171" }}
            >
              "{deleteDialog.project?.name}"
            </Typography>
            ?
          </Typography>
          <Typography sx={{ color: "#ef4444", fontSize: 13, mt: 1 }}>
            ⚠ Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}
        >
          <Button
            onClick={() => setDeleteDialog({ open: false, project: null })}
            sx={{ color: MUTED, textTransform: "none" }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={deleteProject}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
            }}
          >
            Xóa project
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Info Dialog ── */}
      {infoProject &&
        (() => {
          const p = infoDetail
            ? { ...infoProject, ...infoDetail }
            : infoProject;
          const infoCfg = getCfg(
            getDisplayStatus(p, taskStatsMap[p.id] || null),
          );
          const infoDlState = getDeadlineState(
            p.deadline,
            getDisplayStatus(p, taskStatsMap[p.id] || null),
          );
          const dsName =
            p.dataset?.name ||
            p.dataset_name ||
            datasets.find(
              (d) => d.id === (p.dataset_id || p.datasetId || p.dataset?.id),
            )?.name ||
            "N/A";
          // Ưu tiên dùng dữ liệu extract từ tasks (đáng tin hơn)
          const rv = p._taskReviewer || p.reviewer || p.reviewer_id || p.reviewerId || null;
          const rvName = rv?.fullName || rv?.full_name || rv?.username || null;
          const rvEmail = rv?.email || null;
          const annotators = (p._taskAnnotators && p._taskAnnotators.length > 0)
            ? p._taskAnnotators
            : Array.isArray(p.annotators) && p.annotators.length > 0
              ? p.annotators
              : Array.isArray(p.annotator_ids) ? p.annotator_ids : [];
          const annotatorCount = annotators.length;
          const reviewerCount = rv ? 1 : 0;
          const sampleRate =
            p.review_policy?.sample_rate != null
              ? `${Math.round(p.review_policy.sample_rate * 100)}%`
              : null;
          const guidelines = p.guidelines || "";
          return (
            <Dialog
              open
              onClose={closeInfo}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  bgcolor: "#0a1628",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                  color: TEXT,
                  overflow: "hidden",
                },
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  px: 3,
                  pt: 3,
                  pb: 2.5,
                  borderBottom: `1px solid ${BORDER}`,
                  background:
                    "linear-gradient(135deg, #0d1829 0%, #111c30 100%)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 20,
                        color: TEXT,
                        lineHeight: 1.2,
                      }}
                    >
                      {p.name}
                    </Typography>
                    {p.description && (
                      <Typography
                        sx={{
                          color: MUTED,
                          fontSize: 13,
                          mt: 0.6,
                          lineHeight: 1.4,
                        }}
                      >
                        {p.description}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.6,
                        bgcolor: infoCfg.bg,
                        border: `1px solid ${infoCfg.border}`,
                        borderRadius: 10,
                        px: 1.4,
                        py: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: infoCfg.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          color: infoCfg.color,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {infoCfg.label}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={closeInfo}
                      size="small"
                      sx={{
                        color: MUTED,
                        width: 28,
                        height: 28,
                        "&:hover": {
                          color: TEXT,
                          bgcolor: "rgba(255,255,255,0.06)",
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: 15, lineHeight: 1 }}>
                        ✕
                      </Typography>
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              <DialogContent sx={{ p: 0 }}>
                {infoLoading ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 6 }}
                  >
                    <CircularProgress size={28} sx={{ color: PRIMARY }} />
                  </Box>
                ) : (
                  <>
                    {/* Stats row */}
                    <Stack
                      direction="row"
                      divider={<Box sx={{ width: "1px", bgcolor: BORDER }} />}
                      sx={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      {[
                        {
                          val: p.total_tasks ?? 0,
                          label: "Tasks",
                          color: "#60a5fa",
                        },
                        {
                          val: annotatorCount,
                          label: "Annotators",
                          color: annotatorCount > 0 ? "#a78bfa" : MUTED,
                        },
                        {
                          val: reviewerCount,
                          label: "Reviewer",
                          color: reviewerCount > 0 ? "#4ade80" : MUTED,
                        },
                        ...(sampleRate
                          ? [
                              {
                                val: sampleRate,
                                label: "Sample rate",
                                color: "#f59e0b",
                              },
                            ]
                          : []),
                      ].map(({ val, label, color }) => (
                        <Box
                          key={label}
                          sx={{ flex: 1, py: 2.5, textAlign: "center" }}
                        >
                          <Typography
                            sx={{
                              color,
                              fontSize: 24,
                              fontWeight: 800,
                              lineHeight: 1,
                            }}
                          >
                            {val}
                          </Typography>
                          <Typography
                            sx={{
                              color: MUTED,
                              fontSize: 10,
                              mt: 0.5,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {label}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    {/* Detail rows */}
                    <Box sx={{ px: 3, pt: 0.5, pb: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 1.4,
                          borderBottom: `1px solid rgba(30,45,71,0.7)`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: MUTED,
                            fontSize: 11,
                            minWidth: 100,
                            flexShrink: 0,
                            pt: 0.3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Dataset
                        </Typography>
                        <Typography
                          sx={{
                            color: "#93c5fd",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {dsName}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 1.4,
                          borderBottom: `1px solid rgba(30,45,71,0.7)`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: MUTED,
                            fontSize: 11,
                            minWidth: 100,
                            flexShrink: 0,
                            pt: 0.3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Deadline
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {infoDlState && (
                            <Box
                              sx={{
                                bgcolor: `${infoDlState.color}20`,
                                border: `1px solid ${infoDlState.color}50`,
                                borderRadius: 10,
                                px: 1,
                                py: 0.15,
                              }}
                            >
                              <Typography
                                sx={{
                                  color: infoDlState.color,
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                {infoDlState.label}
                              </Typography>
                            </Box>
                          )}
                          <Typography
                            sx={{
                              color: infoDlState
                                ? infoDlState.color
                                : "#fbbf24",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {fmtDateTime(p.deadline)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 1.4,
                          borderBottom: `1px solid rgba(30,45,71,0.7)`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: MUTED,
                            fontSize: 11,
                            minWidth: 100,
                            flexShrink: 0,
                            pt: 0.3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Ngày tạo
                        </Typography>
                        <Typography
                          sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}
                        >
                          {fmtDateTime(p.createdAt || p.created_at)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 1.4,
                          borderBottom: `1px solid rgba(30,45,71,0.7)`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: MUTED,
                            fontSize: 11,
                            minWidth: 100,
                            flexShrink: 0,
                            pt: 0.3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Reviewer
                        </Typography>
                        {rv ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.2,
                            }}
                          >
                            <Box
                              sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                bgcolor: "rgba(74,222,128,0.12)",
                                border: "1px solid rgba(74,222,128,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Typography
                                sx={{
                                  color: "#4ade80",
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                              >
                                {(rvName || "R")[0].toUpperCase()}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  color: "#4ade80",
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                              >
                                {rvName || "Reviewer"}
                              </Typography>
                              {rvEmail && (
                                <Typography sx={{ color: MUTED, fontSize: 11 }}>
                                  {rvEmail}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Typography
                            sx={{
                              color: MUTED,
                              fontSize: 13,
                              fontStyle: "italic",
                            }}
                          >
                            Chưa phân công
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 1.4,
                          borderBottom: `1px solid rgba(30,45,71,0.7)`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: MUTED,
                            fontSize: 11,
                            minWidth: 100,
                            flexShrink: 0,
                            pt: 0.3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Annotators
                        </Typography>
                        {annotators.length > 0 ? (
                          <Stack spacing={1}>
                            {annotators.map((ann, idx) => {
                              const name =
                                ann?.fullName ||
                                ann?.full_name ||
                                ann?.username ||
                                null;
                              const email = ann?.email || null;
                              return (
                                <Box
                                  key={idx}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.2,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      bgcolor: "rgba(167,139,250,0.12)",
                                      border: "1px solid rgba(167,139,250,0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        color: "#a78bfa",
                                        fontSize: 12,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {(name || "A")[0].toUpperCase()}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      sx={{
                                        color: "#c4b5fd",
                                        fontSize: 13,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {name || `Annotator ${idx + 1}`}
                                    </Typography>
                                    {email && (
                                      <Typography
                                        sx={{ color: MUTED, fontSize: 11 }}
                                      >
                                        {email}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Typography
                            sx={{
                              color: MUTED,
                              fontSize: 13,
                              fontStyle: "italic",
                            }}
                          >
                            Chưa phân công
                          </Typography>
                        )}
                      </Box>
                      {guidelines && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 2,
                            py: 1.4,
                            borderBottom: `1px solid rgba(30,45,71,0.7)`,
                          }}
                        >
                          <Typography
                            sx={{
                              color: MUTED,
                              fontSize: 11,
                              minWidth: 100,
                              flexShrink: 0,
                              pt: 0.3,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Guidelines
                          </Typography>
                          <Typography
                            sx={{
                              color: "#94a3b8",
                              fontSize: 13,
                              lineHeight: 1.5,
                            }}
                          >
                            {guidelines}
                          </Typography>
                        </Box>
                      )}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 1.4,
                        }}
                      >
                        <Typography
                          sx={{
                            color: MUTED,
                            fontSize: 11,
                            minWidth: 100,
                            flexShrink: 0,
                            pt: 0.3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Project ID
                        </Typography>
                        <Typography
                          sx={{
                            color: "#TEXT",
                            fontSize: 11,
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {p.id}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </DialogContent>

              <DialogActions
                sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}
              >
                <Button
                  onClick={closeInfo}
                  sx={{
                    color: MUTED,
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { color: TEXT },
                  }}
                >
                  Đóng
                </Button>
                <Button
                  onClick={() => navigate(`/manager/projects/${p.id}`)}
                  variant="contained"
                  startIcon={<VisibilityIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 3,
                    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                  }}
                >
                  Xem chi tiết
                </Button>
              </DialogActions>
            </Dialog>
          );
        })()}

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

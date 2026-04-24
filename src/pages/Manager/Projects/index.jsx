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
  FolderOpen as FolderIcon,
  Assignment as TaskIcon,
  Schedule as DeadlineIcon,
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

const STATUS_CFG = {
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
  in_review: {
    label: "Đang review",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
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
const getCfg = (s) => STATUS_CFG[s] || STATUS_CFG.draft;

// Tính toán trạng thái hiển thị thực tế dựa trên status + deadline
const getDisplayStatus = (project) => {
  if (project.status === "archived") return "archived";

  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  // Nếu chưa quá hạn → hiển thị đúng trạng thái backend
  if (!isOverdue) return project.status;

  // Deadline đã qua — xác định lỗi thuộc về ai
  switch (project.status) {
    case "completed":
      // Backend báo completed nhưng deadline đã qua → chưa hoàn thành đúng nghĩa
      return "overdue";
    case "draft":
    case "active":
      // Annotator chưa nộp bài
      return "annotator_overdue";
    case "in_review":
      // Annotator đã nộp, reviewer chưa chấm
      return "reviewer_overdue";
    case "waiting_rework":
      // Annotator chưa sửa lại bài sau khi bị reject
      return "rework_overdue";
    default:
      return "overdue";
  }
};

const normalizeProject = (p) => ({
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

const fmtDateTime = (v) => {
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

const getDeadlineState = (deadline) => {
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

// ── Info Dialog Row ────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, color }) => (
  <Box
    sx={{
      display: "flex",
      gap: 1.5,
      py: 1,
      borderBottom: `1px solid ${BORDER}`,
    }}
  >
    <Typography
      sx={{ color: MUTED, fontSize: 13, minWidth: 130, flexShrink: 0 }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        color: color || TEXT,
        fontSize: 13,
        fontWeight: 600,
        wordBreak: "break-word",
      }}
    >
      {value ?? "N/A"}
    </Typography>
  </Box>
);

// ── Project Card ───────────────────────────────────────────────────────────────
const ProjectCard = ({ project, datasets, onInfo, onDelete, onNavigate }) => {
  const cfg = getCfg(getDisplayStatus(project));
  const dlState = getDeadlineState(project.deadline);
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
          {/* Status badge — only place with status color */}
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

      {/* Info rows — neutral icons, no per-row color */}
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
    try {
      const [projectRes, datasetRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/projects`, {
          params: { page: 1, limit: 100 },
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
      ]);
      if (projectRes.status === "fulfilled") {
        const pData = projectRes.value.data;
        const pList = pData?.data ? pData.data : getArray(pData);
        setProjects(pList.map(normalizeProject));
      } else {
        setError("Không tải được danh sách project");
      }
      if (datasetRes.status === "fulfilled")
        setDatasets(getArray(datasetRes.value.data));
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
      const res = await axios.get(`${API_URL}/api/projects/${project.id}`, {
        headers: getAuthHeaders(),
      });
      const raw = res.data?.project || res.data || {};
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

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => getDisplayStatus(p) === "active").length,
      completed: projects.filter((p) => getDisplayStatus(p) === "completed")
        .length,
      draft: projects.filter((p) => getDisplayStatus(p) === "draft").length,
      archived: projects.filter((p) => getDisplayStatus(p) === "archived")
        .length,
      overdue: projects.filter((p) =>
        [
          "annotator_overdue",
          "reviewer_overdue",
          "rework_overdue",
          "overdue",
        ].includes(getDisplayStatus(p)),
      ).length,
    }),
    [projects],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const OVERDUE_STATUSES = [
      "annotator_overdue",
      "reviewer_overdue",
      "rework_overdue",
      "overdue",
    ];
    return projects.filter((p) => {
      const okSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.dataset_name.toLowerCase().includes(q);
      const ds = getDisplayStatus(p);
      const okStatus =
        statusFilter === "all" ||
        statusFilter === ds ||
        (statusFilter === "overdue" && OVERDUE_STATUSES.includes(ds));
      return okSearch && okStatus;
    });
  }, [projects, search, statusFilter]);

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
          const p = infoDetail ? { ...infoProject, ...infoDetail } : infoProject;
          const infoCfg = getCfg(getDisplayStatus(p));
          const infoDlState = getDeadlineState(p.deadline);
          const dsName =
            p.dataset?.name ||
            p.dataset_name ||
            datasets.find((d) => d.id === (p.dataset_id || p.datasetId || p.dataset?.id))?.name ||
            "N/A";
          const rv = p.reviewer || p.reviewer_id || p.reviewerId || null;
          const rvName = rv?.fullName || rv?.full_name || rv?.username || null;
          const rvEmail = rv?.email || null;
          const annotators = Array.isArray(p.annotators) ? p.annotators
            : Array.isArray(p.annotator_ids) ? p.annotator_ids : [];
          const sampleRate = p.review_policy?.sample_rate != null
            ? `${Math.round(p.review_policy.sample_rate * 100)}%` : null;
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
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress size={28} sx={{ color: PRIMARY }} />
                  </Box>
                ) : (<>
                {/* Stats row */}
                <Stack direction="row" divider={<Box sx={{ width: "1px", bgcolor: BORDER }} />}
                  sx={{ borderBottom: `1px solid ${BORDER}` }}>
                  {[
                    { val: p.total_tasks ?? 0, label: "Tasks",       color: "#60a5fa" },
                    { val: annotators.length,   label: "Annotators",  color: "#a78bfa" },
                    { val: rv ? 1 : 0,          label: "Reviewer",    color: rv ? "#4ade80" : MUTED },
                    ...(sampleRate ? [{ val: sampleRate, label: "Sample rate", color: "#f59e0b" }] : []),
                  ].map(({ val, label, color }) => (
                    <Box key={label} sx={{ flex: 1, py: 2.5, textAlign: "center" }}>
                      <Typography sx={{ color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{val}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: 10, mt: 0.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
                    </Box>
                  ))}
                </Stack>

                {/* Detail rows */}
                <Box sx={{ px: 3, pt: 0.5, pb: 1 }}>
                  {/* Dataset */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4, borderBottom: `1px solid rgba(30,45,71,0.7)` }}>
                    <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Dataset</Typography>
                    <Typography sx={{ color: "#93c5fd", fontSize: 13, fontWeight: 600 }}>{dsName}</Typography>
                  </Box>
                  {/* Deadline */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4, borderBottom: `1px solid rgba(30,45,71,0.7)` }}>
                    <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Deadline</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {infoDlState && (
                        <Box sx={{ bgcolor: `${infoDlState.color}20`, border: `1px solid ${infoDlState.color}50`, borderRadius: 10, px: 1, py: 0.15 }}>
                          <Typography sx={{ color: infoDlState.color, fontSize: 10, fontWeight: 700 }}>{infoDlState.label}</Typography>
                        </Box>
                      )}
                      <Typography sx={{ color: infoDlState ? infoDlState.color : "#fbbf24", fontSize: 13, fontWeight: 600 }}>{fmtDateTime(p.deadline)}</Typography>
                    </Box>
                  </Box>
                  {/* Ngày tạo */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4, borderBottom: `1px solid rgba(30,45,71,0.7)` }}>
                    <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Ngày tạo</Typography>
                    <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{fmtDateTime(p.createdAt || p.created_at)}</Typography>
                  </Box>
                  {/* Reviewer */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4, borderBottom: `1px solid rgba(30,45,71,0.7)` }}>
                    <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Reviewer</Typography>
                    {rv ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Typography sx={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{(rvName || "R")[0].toUpperCase()}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{rvName || "Reviewer"}</Typography>
                          {rvEmail && <Typography sx={{ color: MUTED, fontSize: 11 }}>{rvEmail}</Typography>}
                        </Box>
                      </Box>
                    ) : (
                      <Typography sx={{ color: MUTED, fontSize: 13, fontStyle: "italic" }}>Chưa phân công</Typography>
                    )}
                  </Box>
                  {/* Annotators */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4, borderBottom: `1px solid rgba(30,45,71,0.7)` }}>
                    <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Annotators</Typography>
                    {annotators.length > 0 ? (
                      <Stack spacing={1}>
                        {annotators.map((ann, idx) => {
                          const name  = ann?.fullName || ann?.full_name || ann?.username || null;
                          const email = ann?.email || null;
                          return (
                            <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Typography sx={{ color: "#a78bfa", fontSize: 12, fontWeight: 700 }}>{(name || "A")[0].toUpperCase()}</Typography>
                              </Box>
                              <Box>
                                <Typography sx={{ color: "#c4b5fd", fontSize: 13, fontWeight: 600 }}>{name || `Annotator ${idx + 1}`}</Typography>
                                {email && <Typography sx={{ color: MUTED, fontSize: 11 }}>{email}</Typography>}
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Typography sx={{ color: MUTED, fontSize: 13, fontStyle: "italic" }}>Chưa phân công</Typography>
                    )}
                  </Box>
                  {/* Guidelines */}
                  {guidelines && (
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4, borderBottom: `1px solid rgba(30,45,71,0.7)` }}>
                      <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Guidelines</Typography>
                      <Typography sx={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{guidelines}</Typography>
                    </Box>
                  )}
                  {/* Project ID */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.4 }}>
                    <Typography sx={{ color: MUTED, fontSize: 11, minWidth: 100, flexShrink: 0, pt: 0.3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Project ID</Typography>
                    <Typography sx={{ color: "#475569", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{p.id}</Typography>
                  </Box>
                </Box>
                </>)}
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
                  onClick={() =>
                    navigate(`/manager/projects/${p.id}`)
                  }
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

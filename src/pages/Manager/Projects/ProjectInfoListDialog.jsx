import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Visibility as VisibilityIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  getCfg,
  getDisplayStatus,
  fmtDateTime,
  getDeadlineState,
} from "./projectStatusUtils";

const PANEL = "#0d1829";
const BORDER = "#1e2d47";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";
const PRIMARY = "#3b82f6";

const labelSx = {
  color: MUTED,
  fontSize: 11,
  minWidth: 100,
  flexShrink: 0,
  pt: 0.3,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const rowSx = {
  display: "flex",
  alignItems: "flex-start",
  gap: 2,
  py: 1.4,
  borderBottom: "1px solid rgba(30,45,71,0.7)",
};

// ── UserRow: hiển thị một user (reviewer hoặc annotator) ──────────────────────
const UserRow = ({ name, email, color, fallback }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        bgcolor: `${color}1F`,
        border: `1px solid ${color}4D`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Typography sx={{ color, fontSize: 12, fontWeight: 700 }}>
        {(name || fallback)[0].toUpperCase()}
      </Typography>
    </Box>
    <Box>
      <Typography sx={{ color, fontSize: 13, fontWeight: 700 }}>
        {name || fallback}
      </Typography>
      {email && (
        <Typography sx={{ color: MUTED, fontSize: 11 }}>{email}</Typography>
      )}
    </Box>
  </Box>
);

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function ProjectInfoListDialog({
  open,
  onClose,
  project,
  infoLoading,
  taskStatsMap,
  datasets,
}) {
  const navigate = useNavigate();
  if (!open || !project) return null;

  const p = project;
  const infoCfg = getCfg(getDisplayStatus(p, taskStatsMap[p.id] || null));
  const infoDlState = getDeadlineState(
    p.deadline,
    getDisplayStatus(p, taskStatsMap[p.id] || null)
  );

  const dsName =
    p.dataset?.name ||
    p.dataset_name ||
    datasets.find(
      (d) => d.id === (p.dataset_id || p.datasetId || p.dataset?.id)
    )?.name ||
    "N/A";

  const rv =
    p._taskReviewer || p.reviewer || p.reviewer_id || p.reviewerId || null;
  const rvName = rv?.fullName || rv?.full_name || rv?.username || null;
  const rvEmail = rv?.email || null;

  const annotators =
    p._taskAnnotators?.length > 0
      ? p._taskAnnotators
      : Array.isArray(p.annotators) && p.annotators.length > 0
      ? p.annotators
      : Array.isArray(p.annotator_ids)
      ? p.annotator_ids
      : [];

  const sampleRate =
    p.review_policy?.sample_rate != null
      ? `${Math.round(p.review_policy.sample_rate * 100)}%`
      : null;

  const statItems = [
    { val: p.total_tasks ?? 0, label: "Tasks", color: "#60a5fa" },
    {
      val: annotators.length,
      label: "Annotators",
      color: annotators.length > 0 ? "#a78bfa" : MUTED,
    },
    { val: rv ? 1 : 0, label: "Reviewer", color: rv ? "#4ade80" : MUTED },
    ...(sampleRate
      ? [{ val: sampleRate, label: "Sample rate", color: "#f59e0b" }]
      : []),
  ];

  return (
    <Dialog
      open
      onClose={onClose}
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
          background: "linear-gradient(135deg, #0d1829 0%, #111c30 100%)",
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
              sx={{ fontWeight: 800, fontSize: 20, color: TEXT, lineHeight: 1.2 }}
            >
              {p.name}
            </Typography>
            {p.description && (
              <Typography sx={{ color: MUTED, fontSize: 13, mt: 0.6, lineHeight: 1.4 }}>
                {p.description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {/* Status badge */}
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
              <Typography sx={{ color: infoCfg.color, fontSize: 12, fontWeight: 700 }}>
                {infoCfg.label}
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: MUTED,
                width: 28,
                height: 28,
                "&:hover": { color: TEXT, bgcolor: "rgba(255,255,255,0.06)" },
              }}
            >
              <Typography sx={{ fontSize: 15, lineHeight: 1 }}>✕</Typography>
            </IconButton>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {infoLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
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
              {statItems.map(({ val, label, color }) => (
                <Box key={label} sx={{ flex: 1, py: 2.5, textAlign: "center" }}>
                  <Typography sx={{ color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
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
              {/* Dataset */}
              <Box sx={rowSx}>
                <Typography sx={labelSx}>Dataset</Typography>
                <Typography sx={{ color: "#93c5fd", fontSize: 13, fontWeight: 600 }}>
                  {dsName}
                </Typography>
              </Box>

              {/* Deadline */}
              <Box sx={rowSx}>
                <Typography sx={labelSx}>Deadline</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                        sx={{ color: infoDlState.color, fontSize: 10, fontWeight: 700 }}
                      >
                        {infoDlState.label}
                      </Typography>
                    </Box>
                  )}
                  <Typography
                    sx={{
                      color: infoDlState ? infoDlState.color : "#fbbf24",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {fmtDateTime(p.deadline)}
                  </Typography>
                </Box>
              </Box>

              {/* Ngày tạo */}
              <Box sx={rowSx}>
                <Typography sx={labelSx}>Ngày tạo</Typography>
                <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>
                  {fmtDateTime(p.createdAt || p.created_at)}
                </Typography>
              </Box>

              {/* Reviewer */}
              <Box sx={rowSx}>
                <Typography sx={labelSx}>Reviewer</Typography>
                {rv ? (
                  <UserRow
                    name={rvName}
                    email={rvEmail}
                    color="#4ade80"
                    fallback="R"
                  />
                ) : (
                  <Typography sx={{ color: MUTED, fontSize: 13, fontStyle: "italic" }}>
                    Chưa phân công
                  </Typography>
                )}
              </Box>

              {/* Annotators */}
              <Box sx={rowSx}>
                <Typography sx={labelSx}>Annotators</Typography>
                {annotators.length > 0 ? (
                  <Stack spacing={1}>
                    {annotators.map((ann, idx) => (
                      <UserRow
                        key={ann?.id || ann?.email || idx}
                        name={ann?.fullName || ann?.full_name || ann?.username || null}
                        email={ann?.email || null}
                        color="#a78bfa"
                        fallback={`Annotator ${idx + 1}`}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ color: MUTED, fontSize: 13, fontStyle: "italic" }}>
                    Chưa phân công
                  </Typography>
                )}
              </Box>

              {/* Guidelines */}
              {p.guidelines && (
                <Box sx={rowSx}>
                  <Typography sx={labelSx}>Guidelines</Typography>
                  <Typography sx={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
                    {p.guidelines}
                  </Typography>
                </Box>
              )}

              {/* Project ID */}
              <Box sx={{ ...rowSx, borderBottom: "none" }}>
                <Typography sx={labelSx}>Project ID</Typography>
                <Typography
                  sx={{ color: TEXT, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}
                >
                  {p.id}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{ color: MUTED, textTransform: "none", fontWeight: 600, "&:hover": { color: TEXT } }}
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
}

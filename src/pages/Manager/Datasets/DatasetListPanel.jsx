import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  FolderOpen as FolderIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { BORDER, MUTED, PANEL, PRIMARY } from "./constants";
import { coerceId } from "./utils";
import { inputSx } from "./constants";
import DatasetCard from "./DatasetCard";

const PAGE_SIZE = 5;

const DatasetListPanel = ({
  loading,
  filtered,
  search,
  setSearch,
  selectedDs,
  isComplete,
  dsItems,
  dsStatusMap,
  onSelect,
  onOpenInfo,
  onOpenEdit,
  onDeleteTarget,
}) => {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Box
      sx={{
        width: 340,
        minWidth: 280,
        borderRight: `1px solid ${BORDER}`,
        bgcolor: PANEL,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Tìm kiếm dataset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={inputSx}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: MUTED, mr: 1, fontSize: 20 }} />
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
            <CircularProgress size={28} sx={{ color: PRIMARY }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: MUTED }}>
            <FolderIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
            <Typography>Chưa có dataset nào</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {paginated.map((ds) => {
              const isSelected = coerceId(selectedDs) === coerceId(ds);
              const total = ds.total_items || ds.totalItems || 0;
              const mapEntry = dsStatusMap[String(coerceId(ds))];
              const dsComplete = isSelected
                ? isComplete
                : (mapEntry?.isComplete ?? false);
              const dsInProgress = isSelected
                ? !isComplete && dsItems.length > 0
                : !dsComplete &&
                  (mapEntry?.inProgress ?? (total > 0 && !mapEntry));
              return (
                <DatasetCard
                  key={coerceId(ds)}
                  ds={ds}
                  isSelected={isSelected}
                  dsComplete={dsComplete}
                  dsInProgress={dsInProgress}
                  onSelect={onSelect}
                  onOpenInfo={onOpenInfo}
                  onOpenEdit={onOpenEdit}
                  onDeleteTarget={onDeleteTarget}
                />
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Pagination for dataset list */}
      {!loading && totalPages > 1 && (
        <Box
          sx={{
            borderTop: `1px solid ${BORDER}`,
            py: 1.5,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            size="small"
            sx={{
              "& .MuiPaginationItem-root": {
                color: MUTED,
                borderColor: BORDER,
                fontSize: 12,
              },
              "& .MuiPaginationItem-root.Mui-selected": {
                bgcolor: PRIMARY,
                color: "#fff",
                borderColor: PRIMARY,
              },
              "& .MuiPaginationItem-root:hover": {
                bgcolor: "rgba(59,130,246,0.12)",
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default DatasetListPanel;

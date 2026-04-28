// Datasets/index.jsx
// Trang quản lý Dataset dành cho Manager.
//
// Layout chính (2-panel):
//   Left panel  — DatasetListPanel: danh sách dataset, có tìm kiếm, badge trạng thái
//   Right panel — DatasetDetailPanel (bình thường) hoặc DatasetItemViewer (khi xem annotation)
//
// Luồng sử dụng:
//   1. Manager chọn dataset → DatasetDetailPanel hiện danh sách ảnh + thống kê tiến độ
//   2. Manager upload ảnh mới (drag-drop hoặc nút) → gọi handleUpload
//   3. Khi dataset hoàn thành (isComplete) → click ảnh mở DatasetItemViewer 3-panel (ảnh + annotation)
//   4. Khi chưa hoàn thành → click ảnh navigate sang trang DatasetItemDetail
//
// Dialogs: Tạo dataset / Sửa tên / Xóa dataset / Xem thông tin chi tiết
// Toast: phản hồi thành công/lỗi cho mọi thao tác

import React from 'react';
import {
  Alert, Box, Button, IconButton, Snackbar, Stack, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { BG, BORDER, MUTED, PANEL, PRIMARY, SUCCESS, TEXT, WARNING } from './constants';
import { useDatasets } from './hooks/useDatasets';
import DatasetListPanel from './DatasetListPanel';
import DatasetDetailPanel from './DatasetDetailPanel';
import DatasetItemViewer from './DatasetItemViewer';
import {
  CreateDatasetDialog, EditDatasetDialog, DeleteDatasetDialog, InfoDialog,
} from './DatasetDialogs';
import { coerceId } from './utils';

// StatBadge — Badge thống kê nhỏ trong header (tổng datasets, đang chọn, số ảnh trong dataset)
const StatBadge = ({ label, value, color = PRIMARY }) => (
  <Box sx={{ textAlign: 'center', px: 2 }}>
    <Typography sx={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
    <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.3 }}>{label}</Typography>
  </Box>
);

// DatasetsPage — Component trang chính.
// Tất cả logic và state được quản lý bởi useDatasets() hook — component này chỉ render UI.
export default function DatasetsPage() {
  const {
    /* state */
    datasets, loading, search, setSearch, error, toast, setToast,
    createOpen, setCreateOpen, createForm, setCreateForm, creating,
    editDs, setEditDs, editForm, setEditForm, editing,
    selectedDs, setSelectedDs, dsItems, itemsLoading,
    uploading, uploadProgress, deleteTarget, setDeleteTarget, deleting,
    infoDs, setInfoDs, deletingItemId, detailItem, detailDialogOpen, setDetailDialogOpen, setDetailItem,
    viewerOpen, setViewerOpen, viewerInitialItem, approvedItemsMap,
    dsStatusMap, fileInputRef,
    /* computed */
    filtered, isComplete, dsStats, getTasksForItem,
    /* handlers */
    fetchDatasets, handleCreate, openEdit, handleSaveEdit,
    handleUpload, handleDelete, handleDeleteItem, handleItemClick, handleExport, handleDrop,
  } = useDatasets();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <Box sx={{ px: 3.5, py: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ color: TEXT, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>Datasets</Typography>
            <Typography sx={{ color: MUTED, mt: 0.5, fontSize: 14 }}>Quản lý bộ ảnh cho dự án annotation</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchDatasets} sx={{ color: MUTED, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.06)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: PRIMARY, borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5, '&:hover': { bgcolor: '#2563eb' } }}>
              Tạo Dataset
            </Button>
          </Stack>
        </Box>

        <Stack direction="row" spacing={0} divider={<Box sx={{ width: '1px', bgcolor: BORDER, my: 0.5 }} />}
          sx={{ mt: 2.5, bgcolor: '#07101d', borderRadius: 2, border: `1px solid ${BORDER}`, display: 'inline-flex', overflow: 'hidden' }}>
          <Box sx={{ py: 1.5, px: 3 }}><StatBadge label="Tổng datasets" value={datasets.length} color={PRIMARY} /></Box>
          <Box sx={{ py: 1.5, px: 3 }}><StatBadge label="Đang chọn" value={selectedDs ? '1' : '0'} color={SUCCESS} /></Box>
          <Box sx={{ py: 1.5, px: 3 }}><StatBadge label="Ảnh trong dataset" value={dsItems.length} color={WARNING} /></Box>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mx: 3, mt: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Two-panel layout ──
            viewerOpen=true  → ẩn ListPanel, chiếm toàn bộ không gian cho viewer
            viewerOpen=false → hiện ListPanel + DetailPanel song song
      ── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!viewerOpen && (
          <DatasetListPanel
            loading={loading}
            filtered={filtered}
            search={search}
            setSearch={setSearch}
            selectedDs={selectedDs}
            isComplete={isComplete}
            dsItems={dsItems}
            dsStatusMap={dsStatusMap}
            onSelect={setSelectedDs}
            onOpenInfo={setInfoDs}
            onOpenEdit={openEdit}
            onDeleteTarget={setDeleteTarget}
          />
        )}

        {viewerOpen ? (
          <DatasetItemViewer
            items={dsItems}
            initialItem={viewerInitialItem}
            approvedItemsMap={approvedItemsMap}
            datasetId={coerceId(selectedDs)}
            onClose={() => setViewerOpen(false)}
          />
        ) : (
          <DatasetDetailPanel
            selectedDs={selectedDs}
            dsItems={dsItems}
            isComplete={isComplete}
            dsStats={dsStats}
            uploading={uploading}
            uploadProgress={uploadProgress}
            itemsLoading={itemsLoading}
            deletingItemId={deletingItemId}
            fileInputRef={fileInputRef}
            getTasksForItem={getTasksForItem}
            onUpload={handleUpload}
            onDeleteItem={handleDeleteItem}
            onItemClick={handleItemClick}
            onExport={handleExport}
            onDrop={handleDrop}
          />
        )}
      </Box>

      {/* ── Dialogs ── */}
      <CreateDatasetDialog
        open={createOpen}
        creating={creating}
        createForm={createForm}
        setCreateForm={setCreateForm}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <EditDatasetDialog
        editDs={editDs}
        editing={editing}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setEditDs(null)}
        onSave={handleSaveEdit}
      />
      <DeleteDatasetDialog
        deleteTarget={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <InfoDialog
        infoDs={infoDs}
        onClose={() => setInfoDs(null)}
      />
      {/* ── Toast ── */}
      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

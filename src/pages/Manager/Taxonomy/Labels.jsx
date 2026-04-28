// Taxonomy/Labels.jsx
// Trang quản lý Nhãn (Labels) và Chủ đề (Topics) dành cho Manager.
//
// Khái niệm:
//   Topic  — nhóm chủ đề (VD: "Animal", "Vehicle") để phân loại nhãn
//   Label  — nhãn annotation cụ thể (VD: "dog", "cat") thuộc về 1 topic
//   Nhãn master này được tất cả project annotation dùng chung.
//
// Layout:
//   Header     — tên trang, nút "Tạo topic" + "Tạo nhãn"
//   Stats row  — số topic, tổng nhãn, có phím tắt, số màu duy nhất
//   Topics bar — chip lọc theo topic (All / từng topic / Chưa có topic)
//                Mỗi topic chip có nút: thêm nhãn vào topic / sửa topic / xóa topic
//   Search     — tìm nhãn theo tên hoặc mô tả
//   Grid       — lưới LabelCard + ô "+" để thêm nhãn mới
//
// Dialogs:
//   LabelFormDialog  — tạo mới / sửa nhãn (tên, màu, phím tắt, chọn topic)
//   DeleteLabelDialog — xác nhận xóa nhãn
//   TopicFormDialog  — tạo mới / sửa topic
//
// Data: fetch từ LabelService + TopicService (REST API),
//       cache được sync qua syncLabelsCache() để các màn hình khác dùng ngay.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Grid, IconButton, InputAdornment, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon, Label as LabelIcon,
  Search as SearchIcon, Refresh as RefreshIcon,
  KeyboardAlt as KeyboardIcon, Palette as PaletteIcon,
  Category as CategoryIcon, Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { getLabelsWithFallback, createLabel, updateLabel, deleteLabel, syncLabelsCache, setLabelTopic } from '../../../services/LabelService';
import { getTopics, createTopic, updateTopic, deleteTopic } from '../../../services/TopicService';
import { getArray } from '../../../utils/api';
import LabelCard from './LabelCard';
import LabelFormDialog from './LabelFormDialog';
import DeleteLabelDialog from './DeleteLabelDialog';
import TopicFormDialog from './TopicFormDialog';

const BG = '#080f1e', PANEL = '#0d1829', BORDER = '#1e2d47';
const PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';
const PURPLE = '#8b5cf6';

// StatTile — Ô thống kê nhỏ trong header (topics, tổng nhãn, có phím tắt, màu sắc)
// accent: màu gạch chân trên top border và icon
const StatTile = ({ icon, value, label, accent }) => (
  <Box sx={{
    bgcolor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 3,
    px: 2.5, py: 2, flex: 1, minWidth: 140,
    borderTop: `3px solid ${accent}`,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Box sx={{ color: accent, display: 'flex' }}>{icon}</Box>
      <Typography sx={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Box>
    <Typography sx={{ color: TEXT, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
  </Box>
);

// Labels — Component trang chính quản lý nhãn và topic
export default function Labels() {
  const [labels, setLabels]             = useState([]);
  const [topics, setTopics]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('all');
  const [toast, setToast]               = useState({ open: false, msg: '', sev: 'success' });
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [topicFormOpen, setTopicFormOpen]     = useState(false);
  const [editTopic, setEditTopic]             = useState(null);
  const [deletingTopicId, setDeletingTopicId] = useState(null);
  const [prefillTopicId, setPrefillTopicId]   = useState('');

  const showToast = (msg, sev = 'success') => setToast({ open: true, msg, sev });

  // fetchData — tải song song labels + topics khi mount hoặc user bấm "Làm mới"
  // getLabelsWithFallback: thử API trước, nếu lỗi trả về cache local
  const fetchData = async () => {
    setLoading(true);
    try {
      const [labelsRes, topicsRes] = await Promise.allSettled([getLabelsWithFallback(), getTopics()]);
      if (labelsRes.status === 'fulfilled') {
        setLabels(labelsRes.value);
        // Nếu backend trả về labels thực sự (không phải từ cache), cache đã được cập nhật trong getLabelsWithFallback
      }
      // Nếu cả hai endpoint đều lỗi, giữ labels rỗng
      if (topicsRes.status === 'fulfilled') {
        setTopics(getArray(topicsRes.value));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Label CRUD ────────────────────────────────────────────────
  // handleSaveLabelForm — xử lý chung cho cả tạo mới (editTarget=null) và sửa (editTarget có giá trị).
  // Sau khi thành công: update state labels local + sync cache (không fetch lại từ server để tránh lag).
  const handleSaveLabelForm = async (form) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        description: form.description,
        shortcut: form.shortcut || null,
        ...(form.topic_id ? { topic_id: form.topic_id } : {}),
      };
      if (editTarget) {
        const updated = await updateLabel(editTarget.id, payload);
        const merged = { ...editTarget, ...(updated?.label || updated), topic_id: payload.topic_id || editTarget.topic_id };
        setLabelTopic(editTarget.id, payload.topic_id || '');
        setLabels(prev => {
          const next = prev.map(l => l.id === editTarget.id ? merged : l);
          syncLabelsCache(next);
          return next;
        });
        showToast('Cập nhật nhãn thành công');
      } else {
        const raw = await createLabel(payload);
        const created = { ...(raw?.label || raw), topic_id: (raw?.label || raw)?.topic_id || payload.topic_id };
        setLabelTopic(created.id, payload.topic_id || '');
        setLabels(prev => {
          const next = [...prev, created];
          syncLabelsCache(next);
          return next;
        });
        showToast('Tạo nhãn thành công');
      }
      setFormOpen(false); setEditTarget(null);
    } catch (e) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    } finally { setSaving(false); }
  };

  // handleDeleteLabel — xóa nhãn đang được set làm deleteTarget, sync cache sau khi xóa
  const handleDeleteLabel = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteLabel(deleteTarget.id);
      setLabels(prev => {
        const next = prev.filter(l => l.id !== deleteTarget.id);
        syncLabelsCache(next);
        return next;
      });
      showToast('Đã xóa nhãn');
      setDeleteTarget(null);
    } catch (e) {
      showToast(e.message || 'Xóa thất bại', 'error');
    } finally { setSaving(false); }
  };

  // ── Topic CRUD ────────────────────────────────────────────────
  // handleSaveTopic — tạo mới hoặc cập nhật topic (tên + mô tả)
  const handleSaveTopic = async (form) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editTopic) {
        const updated = await updateTopic(editTopic.id, { name: form.name.trim(), description: form.description });
        setTopics(prev => prev.map(t => t.id === editTopic.id ? { ...t, ...(updated?.topic || updated) } : t));
        showToast('Cập nhật topic thành công');
      } else {
        const created = await createTopic({ name: form.name.trim(), description: form.description });
        setTopics(prev => [...prev, created?.topic || created]);
        showToast('Tạo topic thành công');
      }
      setTopicFormOpen(false); setEditTopic(null);
    } catch (e) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    } finally { setSaving(false); }
  };

  // handleDeleteTopic — xóa topic, nhưng chặn nếu còn nhãn chưa được chuyển/xóa
  // Bảo vệ data integrity: không để nhãn mồ côi không có topic
  const handleDeleteTopic = async (topic) => {
    const labelsInTopic = labels.filter(l => (l.topic_id || l.topic?.id) === topic.id);
    if (labelsInTopic.length > 0) {
      showToast(`Topic này còn ${labelsInTopic.length} nhãn, xóa hoặc chuyển nhãn trước`, 'warning');
      return;
    }
    setDeletingTopicId(topic.id);
    try {
      await deleteTopic(topic.id);
      setTopics(prev => prev.filter(t => t.id !== topic.id));
      if (selectedTopicId === topic.id) setSelectedTopicId('all');
      showToast('Đã xóa topic');
    } catch (e) {
      showToast(e.message || 'Xóa thất bại', 'error');
    } finally { setDeletingTopicId(null); }
  };

  // ── Derived data ──────────────────────────────────────────────
  // filtered — labels hiển thị sau khi lọc theo search text + topic đang chọn
  // matchTopic: 'all' = hiện tất cả, 'none' = chỉ nhãn chưa gán topic, id cụ thể = nhãn của topic đó
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labels.filter(l => {
      const matchSearch = !q || l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q);
      const matchTopic  = selectedTopicId === 'all'
        || (selectedTopicId === 'none' && !l.topic_id && !l.topic)
        || (l.topic_id || l.topic?.id) === selectedTopicId;
      return matchSearch && matchTopic;
    });
  }, [labels, search, selectedTopicId]);

  const uniqueColors  = useMemo(() => new Set(labels.map(l => l.color)).size, [labels]);
  const withShortcut  = useMemo(() => labels.filter(l => l.shortcut).length, [labels]);
  const labelsNoTopic = useMemo(() => labels.filter(l => !l.topic_id && !l.topic).length, [labels]);

  // openCreate — mở dialog tạo nhãn mới, tùy chọn điền sẵn topic (khi bấm nút + trên topic chip)
  const openCreate = (topicId) => {
    setEditTarget(null);             // null = chế độ tạo mới
    setPrefillTopicId(topicId || ''); // điền sẵn topic nếu có
    setFormOpen(true);
  };
  // openEdit — mở dialog sửa nhãn đã có, xóa prefillTopicId để không ghi đè
  const openEdit = (l) => {
    setEditTarget(l);
    setPrefillTopicId('');
    setFormOpen(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG }}>
      {/* Header */}
      <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LabelIcon sx={{ fontSize: 20, color: '#fff' }} />
              </Box>
              <Typography sx={{ color: TEXT, fontSize: 26, fontWeight: 800 }}>Quản lý nhãn</Typography>
            </Box>
            <Typography sx={{ color: MUTED, fontSize: 14, ml: 0.5 }}>
              Master labels dùng chung cho tất cả project annotation
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchData} disabled={loading}
                sx={{ color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 2, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<AddIcon />}
              onClick={() => { setEditTopic(null); setTopicFormOpen(true); }}
              sx={{
                borderColor: PURPLE, color: PURPLE, borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5,
                '&:hover': { borderColor: '#7c3aed', bgcolor: 'rgba(139,92,246,0.08)', color: '#a78bfa' },
              }}>
              Tạo topic
            </Button>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => openCreate(selectedTopicId !== 'all' && selectedTopicId !== 'none' ? selectedTopicId : undefined)}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3,
                boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(59,130,246,0.5)' },
              }}>
              Tạo nhãn
            </Button>
          </Stack>
        </Box>

        {/* Stats row */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <StatTile icon={<CategoryIcon sx={{ fontSize: 16 }} />} value={topics.length} label="Topics" accent={PURPLE} />
          <StatTile icon={<LabelIcon sx={{ fontSize: 16 }} />} value={labels.length} label="Tổng nhãn" accent={PRIMARY} />
          <StatTile icon={<KeyboardIcon sx={{ fontSize: 16 }} />} value={withShortcut} label="Có phím tắt" accent="#6366f1" />
          <StatTile icon={<PaletteIcon sx={{ fontSize: 16 }} />} value={uniqueColors} label="Màu sắc" accent="#10b981" />
        </Stack>
      </Box>

      <Box sx={{ p: 4 }}>
        {/* Topics bar */}
        {topics.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5 }}>
              Lọc theo Topic
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {/* "All" chip */}
              <Chip
                label={`Tất cả (${labels.length})`}
                onClick={() => setSelectedTopicId('all')}
                sx={{
                  bgcolor: selectedTopicId === 'all' ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                  color: selectedTopicId === 'all' ? '#93c5fd' : MUTED,
                  border: `1px solid ${selectedTopicId === 'all' ? PRIMARY : BORDER}`,
                  fontWeight: selectedTopicId === 'all' ? 700 : 500,
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.1)', color: '#93c5fd' },
                }}
              />
              {topics.map(t => {
                const count = labels.filter(l => (l.topic_id || l.topic?.id) === t.id).length;
                const isSelected = selectedTopicId === t.id;
                return (
                  <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <Chip
                      label={`${t.name} (${count})`}
                      onClick={() => setSelectedTopicId(isSelected ? 'all' : t.id)}
                      sx={{
                        bgcolor: isSelected ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#c4b5fd' : MUTED,
                        border: `1px solid ${isSelected ? PURPLE : BORDER}`,
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '16px 0 0 16px',
                        '&:hover': { bgcolor: 'rgba(139,92,246,0.1)', color: '#c4b5fd' },
                      }}
                    />
                    <Box sx={{ display: 'flex', bgcolor: isSelected ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isSelected ? PURPLE : BORDER}`, borderLeft: 'none', borderRadius: '0 16px 16px 0', alignItems: 'center', pr: 0.3 }}>
                      <Tooltip title="Thêm nhãn vào topic này">
                        <IconButton size="small" onClick={() => openCreate(t.id)}
                          sx={{ color: MUTED, width: 22, height: 22, '&:hover': { color: PRIMARY } }}>
                          <AddIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sửa topic">
                        <IconButton size="small" onClick={() => { setEditTopic(t); setTopicFormOpen(true); }}
                          sx={{ color: MUTED, width: 22, height: 22, '&:hover': { color: '#fbbf24' } }}>
                          <EditIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa topic">
                        <IconButton size="small"
                          disabled={deletingTopicId === t.id}
                          onClick={() => handleDeleteTopic(t)}
                          sx={{ color: MUTED, width: 22, height: 22, '&:hover': { color: '#ef4444' } }}>
                          {deletingTopicId === t.id
                            ? <CircularProgress size={11} sx={{ color: MUTED }} />
                            : <DeleteIcon sx={{ fontSize: 12 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
              {labelsNoTopic > 0 && (
                <Chip
                  label={`Chưa có topic (${labelsNoTopic})`}
                  onClick={() => setSelectedTopicId(selectedTopicId === 'none' ? 'all' : 'none')}
                  sx={{
                    bgcolor: selectedTopicId === 'none' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
                    color: selectedTopicId === 'none' ? '#fca5a5' : MUTED,
                    border: `1px solid ${selectedTopicId === 'none' ? '#ef4444' : BORDER}`,
                    fontWeight: selectedTopicId === 'none' ? 700 : 500,
                    '&:hover': { bgcolor: 'rgba(248,113,113,0.1)', color: '#fca5a5' },
                  }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Search bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <TextField
            size="small" placeholder="Tìm nhãn theo tên hoặc mô tả..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{
              maxWidth: 380, flex: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: PANEL, color: TEXT, borderRadius: 2,
                '& fieldset': { borderColor: BORDER },
                '&:hover fieldset': { borderColor: '#2d4060' },
                '&.Mui-focused fieldset': { borderColor: PRIMARY },
              },
            }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: MUTED, fontSize: 18 }} /></InputAdornment> }}
          />
          {search && (
            <Chip
              label={`${filtered.length} kết quả`}
              size="small"
              sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontWeight: 600 }}
            />
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 16, gap: 2 }}>
            <CircularProgress sx={{ color: PRIMARY }} />
            <Typography sx={{ color: MUTED, fontSize: 14 }}>Đang tải dữ liệu...</Typography>
          </Box>
        ) : filtered.length === 0 && !search ? (
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', py: 14, gap: 2.5,
            border: `1.5px dashed ${BORDER}`, borderRadius: 4,
          }}>
            <Box sx={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed rgba(59,130,246,0.3)`,
            }}>
              <LabelIcon sx={{ fontSize: 40, color: PRIMARY, opacity: 0.7 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 18, mb: 0.5 }}>
                {selectedTopicId !== 'all' ? 'Topic này chưa có nhãn nào' : 'Chưa có nhãn nào'}
              </Typography>
              <Typography sx={{ color: MUTED, fontSize: 14, maxWidth: 360 }}>
                {selectedTopicId !== 'all'
                  ? 'Tạo nhãn mới và gán vào topic này.'
                  : 'Tạo topic trước, rồi tạo nhãn và gán vào topic. VD: topic "animal" → nhãn dog, cat...'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              {topics.length === 0 && (
                <Button variant="outlined" startIcon={<AddIcon />}
                  onClick={() => { setEditTopic(null); setTopicFormOpen(true); }}
                  sx={{ borderColor: PURPLE, color: PURPLE, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                  Tạo topic đầu tiên
                </Button>
              )}
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}
                sx={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4, boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}>
                Tạo nhãn đầu tiên
              </Button>
            </Stack>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ color: MUTED, fontSize: 15 }}>Không tìm thấy nhãn nào khớp với "{search}"</Typography>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {filtered.map(l => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={l.id}>
                <LabelCard label={l} topics={topics} onEdit={openEdit} onDelete={setDeleteTarget} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Box
                onClick={() => openCreate(selectedTopicId !== 'all' && selectedTopicId !== 'none' ? selectedTopicId : undefined)}
                sx={{
                  border: `2px dashed ${BORDER}`, borderRadius: 3, cursor: 'pointer', minHeight: 130,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(59,130,246,0.05)' },
                }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AddIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                </Box>
                <Typography sx={{ color: MUTED, fontSize: 13, fontWeight: 600 }}>Thêm nhãn mới</Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>

      <LabelFormDialog
        open={formOpen}
        initial={editTarget}
        prefillTopicId={prefillTopicId}
        topics={topics}
        onClose={() => { setFormOpen(false); setEditTarget(null); setPrefillTopicId(''); }}
        onSave={handleSaveLabelForm}
        saving={saving}
      />

      <DeleteLabelDialog
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteLabel}
      />

      <TopicFormDialog
        open={topicFormOpen}
        initial={editTopic}
        onClose={() => { setTopicFormOpen(false); setEditTopic(null); }}
        onSave={handleSaveTopic}
        saving={saving}
      />

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.sev} onClose={() => setToast(p => ({ ...p, open: false }))} sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

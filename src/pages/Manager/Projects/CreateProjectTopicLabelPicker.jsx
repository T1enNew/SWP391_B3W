import React, { useMemo, useState } from 'react';
import {
  Box, Chip, InputAdornment, TextField, Typography,
} from '@mui/material';
import { Search as SearchIcon, Category as CategoryIcon, Label as LabelIcon } from '@mui/icons-material';

const BORDER = '#1e2d47', PRIMARY = '#3b82f6', MUTED = '#64748b', TEXT = '#e2e8f0', PURPLE = '#8b5cf6';

const CreateProjectTopicLabelPicker = ({ topics, labels, selectedTopicId, onTopicChange, selected, onToggle }) => {
  const [labelSearch, setLabelSearch] = useState('');

  const labelsForTopic = useMemo(() => {
    if (!selectedTopicId) return [];
    return labels.filter(l => (l.topic_id || l.topic?.id) === selectedTopicId);
  }, [labels, selectedTopicId]);

  const filteredLabels = useMemo(() => {
    const q = labelSearch.trim().toLowerCase();
    return q ? labelsForTopic.filter(l => l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q)) : labelsForTopic;
  }, [labelsForTopic, labelSearch]);

  const labelsWithoutTopic = useMemo(() => labels.filter(l => !l.topic_id && !l.topic), [labels]);

  return (
    <Box>
      {/* Topic selector */}
      <Typography sx={{ color: MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
        Chọn Topic
      </Typography>
      {topics.length === 0 && labels.length === 0 && (
        <Typography sx={{ color: MUTED, fontSize: 13, py: 1.5, textAlign: 'center' }}>
          Chưa có topic hoặc nhãn nào. Hãy tạo ở tab Labels trước.
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {topics.map(t => {
          const count = labels.filter(l => (l.topic_id || l.topic?.id) === t.id).length;
          const isSelected = selectedTopicId === t.id;
          return (
            <Chip
              key={t.id}
              icon={<CategoryIcon sx={{ fontSize: 14, color: isSelected ? PURPLE : MUTED }} />}
              label={`${t.name} (${count})`}
              onClick={() => onTopicChange(isSelected ? '' : t.id)}
              sx={{
                bgcolor: isSelected ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.05)',
                color: isSelected ? '#c4b5fd' : MUTED,
                border: `1px solid ${isSelected ? PURPLE : BORDER}`,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(139,92,246,0.1)', color: '#c4b5fd' },
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          );
        })}
        {labelsWithoutTopic.length > 0 && (
          <Chip
            icon={<LabelIcon sx={{ fontSize: 14 }} />}
            label={`Không có topic (${labelsWithoutTopic.length})`}
            onClick={() => onTopicChange(selectedTopicId === '__none__' ? '' : '__none__')}
            sx={{
              bgcolor: selectedTopicId === '__none__' ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
              color: selectedTopicId === '__none__' ? '#93c5fd' : MUTED,
              border: `1px solid ${selectedTopicId === '__none__' ? PRIMARY : BORDER}`,
              fontWeight: selectedTopicId === '__none__' ? 700 : 500,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(59,130,246,0.1)', color: '#93c5fd' },
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        )}
      </Box>

      {/* Labels list for selected topic */}
      {selectedTopicId && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nhãn trong topic
            </Typography>
            {selected.length > 0 && (
              <Typography sx={{ color: '#93c5fd', fontSize: 12, fontWeight: 600 }}>
                ✓ Đã chọn {selected.length} nhãn
              </Typography>
            )}
          </Box>

          {labelsForTopic.length > 4 && (
            <TextField
              size="small"
              placeholder="Tìm nhãn..."
              value={labelSearch}
              onChange={e => setLabelSearch(e.target.value)}
              sx={{
                mb: 1.5, width: '100%',
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#08121f', color: TEXT, borderRadius: 2, fontSize: 13,
                  '& fieldset': { borderColor: BORDER },
                  '&:hover fieldset': { borderColor: '#2d4060' },
                  '&.Mui-focused fieldset': { borderColor: PRIMARY },
                },
              }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment> }}
            />
          )}

          {filteredLabels.length === 0 ? (
            <Typography sx={{ color: MUTED, fontSize: 13, py: 1.5, textAlign: 'center' }}>
              {labelSearch ? `Không tìm thấy nhãn nào khớp "${labelSearch}"` : 'Topic này chưa có nhãn nào'}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filteredLabels.map(l => {
                const lid = l._labelsetId || l.id;
                const isSelected = selected.includes(lid);
                return (
                  <Chip
                    key={l.id}
                    label={l.name}
                    onClick={() => onToggle(lid)}
                    sx={{
                      bgcolor: isSelected ? `${l.color}33` : 'rgba(255,255,255,0.05)',
                      color: isSelected ? l.color : MUTED,
                      border: `1px solid ${isSelected ? l.color : BORDER}`,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: `${l.color}22`, color: l.color },
                      '&::before': isSelected ? {
                        content: '"✓ "', fontSize: 11,
                      } : {},
                    }}
                  />
                );
              })}
            </Box>
          )}
        </>
      )}

      {!selectedTopicId && topics.length > 0 && (
        <Box sx={{ py: 2, textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: 2 }}>
          <Typography sx={{ color: MUTED, fontSize: 13 }}>
            Chọn một topic ở trên để xem và chọn nhãn
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CreateProjectTopicLabelPicker;

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

const DatasetStatsPanel = ({ allDatasetItems, item, onSetSearch, onSetStatusFilter }) => {
  if (!allDatasetItems.length) return null;

  const total     = allDatasetItems.length;
  const pending   = allDatasetItems.filter(i => ['pending', 'assigned', 'in_progress', 'revised'].includes(i.status)).length;
  const submitted = allDatasetItems.filter(i => i.status === 'submitted').length;
  const approved  = allDatasetItems.filter(i => i.status === 'approved').length;
  const rejected  = allDatasetItems.filter(i => i.status === 'rejected').length;
  const pct       = total > 0 ? Math.round(approved / total * 100) : 0;

  const bySubtopic = {};
  allDatasetItems.forEach(it => {
    const sid   = it.subtopic_id || it.subtopicId || 'unknown';
    const sname = it.subtopicId?.name || 'Subtopic';
    if (!bySubtopic[sid]) bySubtopic[sid] = { name: sname, total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0 };
    bySubtopic[sid].total++;
    if (['pending', 'assigned', 'in_progress', 'revised'].includes(it.status)) bySubtopic[sid].pending++;
    else if (it.status === 'submitted') bySubtopic[sid].submitted++;
    else if (it.status === 'approved')  bySubtopic[sid].approved++;
    else if (it.status === 'rejected')  bySubtopic[sid].rejected++;
  });

  return (
    <Box sx={{ mb: 3, p: 2.5, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#e2e8f0' }}>
          Tien Do Dataset
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          {pct}% approved ({approved}/{total})
        </Typography>
      </Box>

      <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#334155', overflow: 'hidden', display: 'flex', mb: 2 }}>
        {approved  > 0 && <Box sx={{ width: `${approved  / total * 100}%`, bgcolor: '#22c55e', height: '100%' }} />}
        {rejected  > 0 && <Box sx={{ width: `${rejected  / total * 100}%`, bgcolor: '#ef4444', height: '100%' }} />}
        {submitted > 0 && <Box sx={{ width: `${submitted / total * 100}%`, bgcolor: '#fbbf24', height: '100%' }} />}
        {pending   > 0 && <Box sx={{ width: `${pending   / total * 100}%`, bgcolor: '#64748b', height: '100%' }} />}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: Object.keys(bySubtopic).length > 1 ? 2 : 0 }}>
        <Chip label={`Tong: ${total}`}         size="small" sx={{ bgcolor: '#334155',                    color: '#e2e8f0', fontWeight: 700 }} />
        <Chip label={`Approved: ${approved}`}  size="small" sx={{ bgcolor: 'rgba(34,197,94,0.2)',        color: '#22c55e', fontWeight: 700 }} />
        <Chip label={`Rejected: ${rejected}`}  size="small" sx={{ bgcolor: 'rgba(239,68,68,0.2)',        color: '#ef4444', fontWeight: 700 }} />
        <Chip label={`Cho Review: ${submitted}`} size="small" sx={{ bgcolor: 'rgba(251,191,36,0.2)',     color: '#fbbf24', fontWeight: 700 }} />
        <Chip label={`Dang XL: ${pending}`}    size="small" sx={{ bgcolor: 'rgba(100,116,139,0.3)',      color: '#94a3b8', fontWeight: 700 }} />
      </Box>

      {Object.keys(bySubtopic).length > 1 && (
        <Box>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#64748b', mb: 1, display: 'block' }}>
            Chi tiet theo Subtopic:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.values(bySubtopic).map((st, idx) => (
              <Chip
                key={idx}
                label={`${st.name}: ${st.approved}/${st.total}`}
                size="small"
                sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontWeight: 600, border: '1px solid rgba(59,130,246,0.3)' }}
                onClick={() => { onSetStatusFilter('all'); onSetSearch(st.name.toLowerCase()); }}
              />
            ))}
          </Box>
        </Box>
      )}

      {item?.reviewers && item.reviewers.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #334155' }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#64748b', mb: 1, display: 'block' }}>
            Reviewers da cham tren item nay:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {item.reviewers.map((r, idx) => (
              <Chip
                key={idx}
                label={`${r.reviewerId?.fullName || r.reviewerId?.username || 'Reviewer'}: ${r.status || 'pending'}`}
                size="small"
                sx={{
                  bgcolor: r.status === 'approved' ? 'rgba(34,197,94,0.15)' : r.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.2)',
                  color:   r.status === 'approved' ? '#22c55e'               : r.status === 'rejected' ? '#ef4444'               : '#94a3b8',
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DatasetStatsPanel;

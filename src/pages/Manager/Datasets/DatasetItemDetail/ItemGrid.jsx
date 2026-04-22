import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const ItemGrid = ({
  loading, datasetItems, datasetId, navigate, datasetName,
  itemSearch, setItemSearch, itemStatusFilter, setItemStatusFilter,
  normalizedLabelSet,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!datasetItems || datasetItems.length === 0) {
    return (
      <>
        <Typography sx={{ color: '#94a3b8' }}>Dataset nay chua co item nao.</Typography>
        <Typography sx={{ color: '#64748b', mt: 1 }}>Dataset ID: {datasetId}</Typography>
      </>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <input
          type="text"
          placeholder="Search items..."
          value={itemSearch}
          onChange={e => setItemSearch(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', color: '#e2e8f0', width: 300, fontSize: 14 }}
        />
        <select
          value={itemStatusFilter}
          onChange={e => setItemStatusFilter(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', color: '#e2e8f0', fontSize: 14 }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5 }}>
        {datasetItems.map(it => (
          <Box
            key={it.id}
            onClick={() => navigate(
              `/manager/datasets/${datasetId}/items/${encodeURIComponent(it.id)}`,
              { state: { item: it, datasetName, labelSet: normalizedLabelSet } }
            )}
            sx={{ p: 1.5, borderRadius: 2, bgcolor: '#0f172a', border: '1px solid #334155', cursor: 'pointer', '&:hover': { borderColor: '#3b82f6' } }}
          >
            <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
              {it.originalName || it.filename || it.id}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>{it.status || 'pending'}</Typography>
              {it.displayLabel && it.displayLabel !== 'Chua co nhan' && (
                <Typography variant="caption" sx={{ color: '#60a5fa' }}>{it.displayLabel}</Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ItemGrid;

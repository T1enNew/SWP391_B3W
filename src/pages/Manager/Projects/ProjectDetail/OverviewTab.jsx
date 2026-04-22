import React from 'react';
import {
  Box, Card, CardContent, Chip, Grid, LinearProgress, Paper, Stack, Typography,
} from '@mui/material';
import StatCard from './StatCard';
import DatasetChip from './DatasetChip';
import { cardSx, softCardSx } from './constants';

const OverviewTab = ({ stats, datasets, groupedByAnnotator, groupedByReviewer }) => (
  <Stack spacing={3}>
    <Grid container spacing={2}>
      <Grid item xs={12} md={3}>
        <StatCard label="Datasets" value={datasets.length} hint="Linked to this project" color="#60a5fa" />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard label="Approved items" value={stats.approved} hint={`${stats.progress}% ready`} color="#22c55e" />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard label="In review" value={stats.inReview} hint="Waiting reviewer" color="#f59e0b" />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard label="Rework" value={stats.rework} hint="Need correction" color="#ef4444" />
      </Grid>
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800}>Project pipeline</Typography>
              <Chip label={`${stats.total} tasks`} sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 700 }} />
            </Box>
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Approved progress</Typography>
                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{stats.progress}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.progress}
                  sx={{
                    height: 10, borderRadius: 10, bgcolor: '#0f172a',
                    '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 10 },
                  }}
                />
              </Box>
              <Grid container spacing={1.5}>
                {[
                  { label: 'In progress', value: stats.inProgress, color: '#3b82f6' },
                  { label: 'In review',   value: stats.inReview,   color: '#f59e0b' },
                  { label: 'Approved',    value: stats.approved,   color: '#22c55e' },
                  { label: 'Rework',      value: stats.rework,     color: '#ef4444' },
                ].map((x) => (
                  <Grid item xs={6} md={3} key={x.label}>
                    <Paper sx={{ ...softCardSx, p: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>{x.label}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: x.color }}>{x.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Datasets in this project</Typography>
            <Stack spacing={1.2}>
              {datasets.length === 0 ? (
                <Typography sx={{ color: '#94a3b8' }}>No dataset linked.</Typography>
              ) : (
                datasets.map((ds) => <DatasetChip key={ds.id} dataset={ds} />)
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Annotator performance</Typography>
            <Stack spacing={1.2}>
              {groupedByAnnotator.length === 0 ? (
                <Typography sx={{ color: '#94a3b8' }}>No annotator assigned.</Typography>
              ) : (
                groupedByAnnotator.map((ann) => {
                  const reviewed = ann.approved + ann.rejected;
                  const passRate = reviewed ? Math.round((ann.approved / reviewed) * 100) : 0;
                  return (
                    <Paper key={ann.id} sx={{ ...softCardSx, p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography fontWeight={700}>{ann.name}</Typography>
                        <Chip label={`${ann.total} tasks`} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd' }} />
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`Approved ${ann.approved}`} sx={{ bgcolor: 'rgba(34,197,94,0.16)',  color: '#22c55e' }} />
                        <Chip size="small" label={`Review ${ann.inReview}`}   sx={{ bgcolor: 'rgba(245,158,11,0.16)', color: '#f59e0b' }} />
                        <Chip size="small" label={`Rework ${ann.rejected}`}   sx={{ bgcolor: 'rgba(239,68,68,0.16)',  color: '#ef4444' }} />
                        <Chip size="small" label={`Pass ${passRate}%`}        sx={{ bgcolor: 'rgba(167,139,250,0.16)',color: '#c4b5fd' }} />
                      </Stack>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Reviewer performance</Typography>
            <Stack spacing={1.2}>
              {groupedByReviewer.length === 0 ? (
                <Typography sx={{ color: '#94a3b8' }}>No reviewer assigned.</Typography>
              ) : (
                groupedByReviewer.map((rev) => (
                  <Paper key={rev.id} sx={{ ...softCardSx, p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={700}>{rev.name}</Typography>
                      <Chip label={`${rev.assigned} assigned`} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.16)', color: '#93c5fd' }} />
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label={`Approved ${rev.approved}`} sx={{ bgcolor: 'rgba(34,197,94,0.16)',  color: '#22c55e' }} />
                      <Chip size="small" label={`Rejected ${rev.rejected}`} sx={{ bgcolor: 'rgba(239,68,68,0.16)',  color: '#ef4444' }} />
                      <Chip size="small" label={`Pending ${rev.pending}`}   sx={{ bgcolor: 'rgba(245,158,11,0.16)', color: '#f59e0b' }} />
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Stack>
);

export default OverviewTab;

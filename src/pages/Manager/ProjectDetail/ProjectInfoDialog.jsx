import React from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, Paper, Stack, Typography,
} from '@mui/material';
import { modalPaperSx, secondaryBtnSx, softCardSx } from './constants';
import DatasetChip from './DatasetChip';
import { formatDateTime } from './utils';

const ProjectInfoDialog = ({ open, onClose, project, datasets, statusMeta }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: modalPaperSx }}>
    <DialogTitle sx={{ borderBottom: '1px solid #243041', fontWeight: 800 }}>Project info</DialogTitle>
    <DialogContent sx={{ pt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Project name</Typography>
              <Typography fontWeight={700}>{project?.name}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Description</Typography>
              <Typography>{project?.description || 'No description'}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Deadline</Typography>
              <Typography>{formatDateTime(project?.deadline)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Status</Typography>
              <Chip label={statusMeta.label} sx={{ mt: 1, bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 800 }} />
            </Box>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Datasets</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {datasets.length === 0 ? (
                  <Typography sx={{ color: '#94a3b8' }}>No dataset linked.</Typography>
                ) : (
                  datasets.map((ds) => <DatasetChip key={ds.id} dataset={ds} />)
                )}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Review policy</Typography>
              <Paper sx={{ ...softCardSx, p: 1.4, mt: 1 }}>
                <Typography variant="body2">Mode: <b>{project?.reviewPolicy?.mode || 'full'}</b></Typography>
                <Typography variant="body2">
                  Reviewers/item: <b>{project?.reviewPolicy?.reviewersPerItem || project?.reviewPolicy?.reviewers_per_item || 1}</b>
                </Typography>
                <Typography variant="body2">Export: <b>{project?.exportFormat || 'JSON'}</b></Typography>
              </Paper>
            </Box>
            {project?.guidelines ? (
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Guidelines</Typography>
                <Paper sx={{ ...softCardSx, p: 1.4, mt: 1, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>{project.guidelines}</Typography>
                </Paper>
              </Box>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button sx={secondaryBtnSx} onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default ProjectInfoDialog;

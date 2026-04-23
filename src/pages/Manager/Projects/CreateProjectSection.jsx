import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

const PANEL = '#0f1a2e', BORDER = '#1e2d47', PRIMARY = '#3b82f6', TEXT = '#e2e8f0', MUTED = '#64748b';

const CreateProjectSection = ({ icon, title, subtitle, children }) => (
  <Card sx={{ bgcolor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 3, color: TEXT }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, pb: 2, borderBottom: `1px solid ${BORDER}` }}>
        <Box sx={{ color: PRIMARY }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{title}</Typography>
          {subtitle && <Typography sx={{ color: MUTED, fontSize: 13 }}>{subtitle}</Typography>}
        </Box>
      </Box>
      {children}
    </CardContent>
  </Card>
);

export default CreateProjectSection;

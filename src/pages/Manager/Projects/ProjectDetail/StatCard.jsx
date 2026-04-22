import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { softCardSx } from './constants';

const StatCard = ({ label, value, hint, color = '#e2e8f0' }) => (
  <Card sx={softCardSx}>
    <CardContent sx={{ p: 2.2 }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          {hint}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

export default StatCard;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';

const Datasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  // =========================
  // 1. GET LIST DATASETS (ĐÚNG SWAGGER)
  // =========================
  const fetchDatasets = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/datasets`, {
        params: {
          page: 1,
          limit: 50,
        },
      });

      const list = res.data?.data || [];

      setDatasets(list);
    } catch (err) {
      console.error('Dataset list error:', err);
    }
  };

  // =========================
  // 2. OPEN DETAIL DATASET
  // =========================
  const openDetail = async (ds) => {
    try {
      const res = await axios.get(`${API_URL}/api/datasets/${ds.id}`);

      setDetail(res.data || {});
      setOpen(true);
    } catch (err) {
      console.error('Dataset detail error:', err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Datasets
      </Typography>

      {/* ========================= */}
      {/* LIST */}
      {/* ========================= */}
      <Grid container spacing={2}>
        {datasets.map((ds) => (
          <Grid item xs={12} md={4} key={ds.id}>
            <Card sx={{ background: '#0f172a', color: '#e2e8f0' }}>
              <CardContent>
                <Typography fontWeight="bold">
                  {ds.name}
                </Typography>

                <Typography fontSize={12} sx={{ opacity: 0.7 }}>
                  {ds.description}
                </Typography>

                <Box mt={1}>
                  <Chip label={ds.type} size="small" />
                  <Chip
                    label={`${ds.total_items} items`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>

                <Box mt={2}>
                  <Button
                    variant="contained"
                    onClick={() => openDetail(ds)}
                  >
                    View
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ========================= */}
      {/* DETAIL */}
      {/* ========================= */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Dataset Detail</DialogTitle>

        <DialogContent>
          {detail ? (
            <>
              <Typography fontWeight="bold">
                {detail.name}
              </Typography>

              <Typography sx={{ opacity: 0.7, mb: 2 }}>
                {detail.description}
              </Typography>

              <Typography>
                Type: {detail.type}
              </Typography>

              <Typography>
                Total items: {detail.total_items}
              </Typography>

              <Typography>
                Status: {detail.status}
              </Typography>

              {/* NOTE QUAN TRỌNG */}
              <Box mt={3}>
                <Typography color="orange">
                  ⚠️ Dataset không chứa ảnh trực tiếp
                </Typography>

                <Typography fontSize={13} sx={{ mt: 1 }}>
                  Ảnh nằm ở Subtopic → Tasks → Approved
                </Typography>
              </Box>
            </>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Datasets;

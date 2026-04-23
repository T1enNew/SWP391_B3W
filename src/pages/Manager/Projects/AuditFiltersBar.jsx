import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';

const AuditFiltersBar = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, reviewFilter, setReviewFilter }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 mb-4">
    <div className="flex items-center gap-4 flex-wrap">
      <TextField size="small" placeholder="Search by Task ID..." value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
      <FormControl size="small" className="w-48">
        <InputLabel>Annotator Status</InputLabel>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Annotator Status">
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="assigned">Assigned</MenuItem>
          <MenuItem value="in_progress">In Progress</MenuItem>
          <MenuItem value="submitted">Submitted</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" className="w-48">
        <InputLabel>Review Results</InputLabel>
        <Select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} label="Review Results">
          <MenuItem value="all">All Results</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="pending">Pending Review</MenuItem>
        </Select>
      </FormControl>
    </div>
  </div>
);

export default AuditFiltersBar;

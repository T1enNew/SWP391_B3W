import React from 'react';
import {
  Button, Chip, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { getStatusIcon, getTaskKind } from './auditUtils';

const AuditTaskTable = ({ filteredTasks, onViewDetail }) => (
  <TableContainer component={Paper} sx={{ background: '#1e293b', border: '1px solid #334155' }}>
    <Table>
      <TableHead>
        <TableRow className="bg-slate-900">
          <TableCell>TASK ID / PREVIEW</TableCell>
          <TableCell>LABEL TYPE</TableCell>
          <TableCell>ANNOTATOR STATUS</TableCell>
          <TableCell>REVIEWER RESULT</TableCell>
          <TableCell>ACTIONS</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredTasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center" className="py-8 text-slate-400">No tasks found</TableCell>
          </TableRow>
        ) : filteredTasks.map(task => {
          const kind = getTaskKind(task);
          return (
            <TableRow key={task.id} hover>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-xs">
                    {kind === 'image' ? '🖼️' : kind === 'text' ? '📄' : kind === 'audio' ? '🎵' : '📎'}
                  </div>
                  <span className="text-sm">#{task.id.slice(-6)}</span>
                </div>
              </TableCell>
              <TableCell>
                {kind === 'image' ? 'BBox Annotation' : kind === 'text' ? 'Text Span' : kind === 'audio' ? 'Audio Label' : 'Other'}
              </TableCell>
              <TableCell>
                <Chip label={task.status?.toUpperCase() || 'ASSIGNED'} size="small" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getStatusIcon(task.status)}
                  <span className="text-sm">
                    {task.status === 'approved' ? 'Approved' : task.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Button size="small" variant="outlined" onClick={() => onViewDetail(task)}>
                  View Review Detail
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

export default AuditTaskTable;

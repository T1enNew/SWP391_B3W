import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(getArray(response.data));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
    try {
      await axios.put(`${API_URL}/api/users/${userId}`, { is_active: !currentStatus });
    } catch (error) {
      // Rollback on error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u));
      console.error('Error toggling user status:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u,  role: newRole } : u));
    try {
      await axios.put(`${API_URL}/api/users/${userId}`, {
        role: newRole.toLowerCase(),
      });
    } catch (error) {
      fetchUsers(); // Rollback to original data on error
      console.error('Error updating user role:', error);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'error',
      manager: 'primary',
      annotator: 'success',
      reviewer: 'warning',
    };
    return colors[role] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>User Management</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {users.length} users · {users.filter(u => u.is_active).length} active
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} sx={{ opacity: user.is_active ? 1 : 0.5 }}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="annotator">Annotator</MenuItem>
                      <MenuItem value="reviewer">Reviewer</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={user.is_active ? 'Inactive' : 'Active'}>
                    <Switch
                      checked={user.is_active}
                      onChange={() => handleToggleActive(user.id, user.is_active)}
                      color="success"
                      size="small"
                    />
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminUsers;

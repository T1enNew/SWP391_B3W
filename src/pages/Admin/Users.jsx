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
  Switch,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getArray } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const currentUserId = currentUser?.id || null;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`, {});
      setUsers(getArray(response.data));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleToggleActive = async (userId, currentStatus) => {
    if (userId === currentUserId) {
      showSnackbar('Không thể vô hiệu hóa tài khoản đang đăng nhập.', 'warning');
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
    try {
      await axios.put(
        `${API_URL}/api/users/${userId}`,
        { is_active: !currentStatus },
        {},
      );
      showSnackbar(`Tài khoản đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công.`);
    } catch (error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u));
      const msg = error.response?.data?.message || 'Cập nhật thất bại.';
      showSnackbar(msg, 'error');
      console.error('Error toggling user status:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUserId) {
      showSnackbar('Không thể thay đổi role của tài khoản đang đăng nhập.', 'warning');
      return;
    }
    const prevRole = users.find(u => u.id === userId)?.role;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try {
      await axios.put(
        `${API_URL}/api/users/${userId}`,
        { role: newRole.toLowerCase() },
        {},
      );
      showSnackbar('Role đã được cập nhật.');
    } catch (error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: prevRole } : u));
      const msg = error.response?.data?.message || 'Cập nhật thất bại.';
      showSnackbar(msg, 'error');
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
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id} sx={{ opacity: user.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    {user.username}
                    {isSelf && (
                      <Chip label="You" size="small" color="primary" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                  <TableCell>
                    <Tooltip title={isSelf ? 'Không thể thay đổi role của chính mình' : ''}>
                      <FormControl size="small" sx={{ minWidth: 120 }} disabled={isSelf}>
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="manager">Manager</MenuItem>
                          <MenuItem value="annotator">Annotator</MenuItem>
                          <MenuItem value="reviewer">Reviewer</MenuItem>
                        </Select>
                      </FormControl>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Active' : 'Inactive'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={isSelf ? 'Không thể vô hiệu hóa chính mình' : (user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt')}>
                      <span>
                        <Switch
                          checked={user.is_active}
                          onChange={() => handleToggleActive(user.id, user.is_active)}
                          color="success"
                          size="small"
                          disabled={isSelf}
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUsers;

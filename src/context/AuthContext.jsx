import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();
const AUTH_TOKEN_KEY = 'token';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      setUser(e.detail);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  // Restore session on mount — always fetch from backend to get authoritative role
  useEffect(() => {
    const tabToken = sessionStorage.getItem(AUTH_TOKEN_KEY);

    if (tabToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${tabToken}`;
      fetchUser();
    } else {
      delete axios.defaults.headers.common.Authorization;
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      // Backend may return { user: {...} } or just {...} directly
      const u = response.data?.user || response.data;
      if (u) {
        // Normalize role to match what login() sets — always lowercase, default to 'manager'
        u.role = (u.role || 'manager').toLowerCase();
      }
      setUser(u);
    } catch (error) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      delete axios.defaults.headers.common.Authorization;
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });

    // Backend returns: { access_token, refresh_token, expires_in, user }
    const { access_token, refresh_token, user: loggedInUser } = response.data;
    // Handle both { user: {...} } and {...} response shapes
    const u = loggedInUser || response.data;

    sessionStorage.setItem(AUTH_TOKEN_KEY, access_token);
    if (refresh_token) {
      sessionStorage.setItem('refresh_token', refresh_token);
    }
    axios.defaults.headers.common.Authorization = `Bearer ${access_token}`;
    if (u) u.role = (u.role || 'manager').toLowerCase();
    setUser(u);
    setLoading(false);

    return loggedInUser;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    const { access_token, refresh_token, user: registeredUser } = response.data;
    const u = registeredUser || response.data;

    sessionStorage.setItem(AUTH_TOKEN_KEY, access_token);
    if (refresh_token) {
      sessionStorage.setItem('refresh_token', refresh_token);
    }
    axios.defaults.headers.common.Authorization = `Bearer ${access_token}`;
    if (u) u.role = (u.role || 'manager').toLowerCase();
    setUser(u);
    setLoading(false);

    return u;
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch {
      // Ignore logout API errors
    }
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common.Authorization;
    setUser(null);
  };

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

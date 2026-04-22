import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();
const AUTH_TOKEN_KEY = 'token';

const normalizeUser = (u) =>
  u ? { ...u, role: (u.role || 'manager').toLowerCase() } : u;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleProfileUpdate = (e) => setUser(e.detail);
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
      const res = await axios.get(`${API_URL}/api/auth/me`);
      setUser(normalizeUser(res.data?.user || res.data));
    } catch {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      delete axios.defaults.headers.common.Authorization;
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (accessToken, refreshToken, userData) => {
    sessionStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const u = normalizeUser(userData);
    setUser(u);
    setLoading(false);
    return u;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const { access_token, refresh_token, user: loggedInUser } = res.data;
    return saveSession(access_token, refresh_token, loggedInUser || res.data);
  };

  const register = async (userData) => {
    const res = await axios.post(`${API_URL}/api/auth/register`, userData);
    const { access_token, refresh_token, user: registeredUser } = res.data;
    return saveSession(access_token, refresh_token, registeredUser || res.data);
  };

  const logout = async () => {
    try { await axios.post(`${API_URL}/api/auth/logout`); } catch {}
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

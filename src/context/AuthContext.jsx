import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, normalizeUser, getErrorMessage } from '../lib/apiClient';

const AuthContext = createContext(null);
const AUTH_TOKEN_KEY = 'token';
const AUTH_REFRESH_KEY = 'refresh_token';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const applyToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveAuth = (payload) => {
    const token = payload?.access_token || payload?.token;
    const refresh = payload?.refresh_token;
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      applyToken(token);
    }
    if (refresh) sessionStorage.setItem(AUTH_REFRESH_KEY, refresh);
    if (payload?.user) setUser(normalizeUser(payload.user));
  };

  const clearAuth = () => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_REFRESH_KEY);
    applyToken(null);
    setUser(null);
  };

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(normalizeUser(data?.user || data));
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const handleProfileUpdate = (event) => setUser(normalizeUser(event.detail));
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    applyToken(token);
    if (!token) {
      setLoading(false);
      return;
    }
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    saveAuth(data);
    return normalizeUser(data?.user);
  };

  const register = async (userData) => {
    const payload = { ...userData, full_name: userData.full_name || userData.fullName };
    const { data } = await api.post('/api/auth/register', payload);
    saveAuth(data);
    return normalizeUser(data?.user);
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    clearAuth();
  };

  const value = useMemo(() => ({
    user,
    setUser: (next) => setUser(normalizeUser(next)),
    login,
    register,
    logout,
    loading,
    getErrorMessage,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

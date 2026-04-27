export const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token');

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
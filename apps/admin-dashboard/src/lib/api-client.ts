import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  // Try multiple keys for backward compatibility
  const token = localStorage.getItem('accessToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all possible auth tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('admin-auth-storage');
      localStorage.removeItem('user');
      
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

/**
 * @deprecated Use authClient from '@o4o/auth-client' instead.
 * This legacy API client will be removed in v2.0.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import { apiClient } from '@/services/api';
 * const response = await apiClient.get('/users');
 *
 * // After
 * import { authClient } from '@o4o/auth-client';
 * const response = await authClient.api.get('/users');
 * ```
 *
 * Benefits of using authClient:
 * - Automatic token management
 * - Better error handling
 * - Type safety
 * - Centralized configuration
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { apiClient } from './api';

interface FailedRequest {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  config: AxiosRequestConfig;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      if (prom.config.headers && token) {
        prom.config.headers['Authorization'] = `Bearer ${token}`;
      }
      prom.resolve(apiClient(prom.config));
    }
  });
  
  failedQueue = [];
};

export const setupAuthInterceptor = () => {
  // Request interceptor - no changes needed as cookies are sent automatically
  apiClient.interceptors.request.use(
    (config) => {
      // Cookies are automatically included in requests
      // No need to manually add Authorization header when using httpOnly cookies
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle token refresh
  apiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Handle 401 errors (token expired)
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Call refresh endpoint - cookies will be sent automatically
          await apiClient.post('/v1/auth/v2/refresh');
          
          // Retry all queued requests
          processQueue(null);
          
          // Retry the original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear auth and redirect to login
          processQueue(refreshError as AxiosError);
          
          // Clear any local auth state
          localStorage.removeItem('user');
          
          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle other errors
      if (error.response?.status === 403) {
        // Forbidden - user doesn't have permission
        console.error('Access forbidden:', error.response.data);
      } else if (error.response?.status === 429) {
        // Too many requests
        console.error('Rate limit exceeded:', error.response.data);
      } else if (error.response?.status >= 500) {
        // Server error
        console.error('Server error:', error.response.data);
      }

      return Promise.reject(error);
    }
  );
};

// Call this function when the app initializes
export const initializeAuthInterceptor = () => {
  setupAuthInterceptor();
};
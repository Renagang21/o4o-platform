import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { apiClient } from './api';
import toast from 'react-hot-toast';

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
          await apiClient.post('/auth/v2/refresh');
          
          // Retry all queued requests
          processQueue(null);
          
          // Retry the original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear auth and redirect to login
          processQueue(refreshError as AxiosError);

          // Clear any local auth state
          localStorage.removeItem('user');

          // Show session expired notification
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.', {
            duration: 4000,
            position: 'top-center',
          });

          // Redirect to login if not already there
          if (window.location.pathname !== '/login') {
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle other errors
      if (error.response?.status === 403) {
        // Forbidden - user doesn't have permission
    // Error logging - use proper error handler
      } else if (error.response?.status === 429) {
        // Too many requests
    // Error logging - use proper error handler
      } else if (error.response?.status >= 500) {
        // Server error
    // Error logging - use proper error handler
      }

      return Promise.reject(error);
    }
  );
};

// Call this function when the app initializes
export const initializeAuthInterceptor = () => {
  setupAuthInterceptor();
};
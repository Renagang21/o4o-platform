import axios from 'axios';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    // Log request in development
    // if (import.meta.env.DEV) {
    //   console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    // }
    return config;
  },
  (error) => {
    // Error logging - use proper error handler
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    // if (import.meta.env.DEV) {
    //   console.log(`[API] Response:`, response.data);
    // }
    return response;
  },
  (error) => {
    // Log error details
    if (error.response) {
    // Error logging - use proper error handler
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
    // Error logging - use proper error handler
    } else {
    // Error logging - use proper error handler
    }

    return Promise.reject(error);
  }
);
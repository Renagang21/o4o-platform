import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export interface AxiosConfig {
  baseURL?: string;
  timeout?: number;
  tokenGetter?: () => string | null;
  onUnauthorized?: () => void;
}

/**
 * Creates a configured axios instance with interceptors
 */
export function createApiInstance(config: AxiosConfig = {}): AxiosInstance {
  const {
    baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000',
    timeout = 10000,
    tokenGetter = () => localStorage.getItem('token'),
    onUnauthorized = () => {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  } = config;

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenGetter();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        onUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

// Default configuration factory
export const defaultAxiosConfig: AxiosConfig = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  timeout: 10000,
};
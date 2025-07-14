import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  tokenGetter?: () => string | null;
  onTokenExpired?: () => void;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export const createApiClient = (config: ApiClientConfig): AxiosInstance => {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 30000,
    withCredentials: config.withCredentials ?? true,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  });

  // Request interceptor for auth token
  client.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      if (config.tokenGetter) {
        const token = config.tokenGetter();
        if (token && requestConfig.headers) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
      return requestConfig;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<any>) => {
      if (error.response?.status === 401 && config.onTokenExpired) {
        config.onTokenExpired();
      }

      const apiError: ApiError = {
        message: error.response?.data?.message || error.message || 'An error occurred',
        code: error.response?.data?.code || error.code,
        status: error.response?.status,
        details: error.response?.data,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
};

// Helper function to create a default API client
export const createDefaultApiClient = (baseURL?: string): AxiosInstance => {
  return createApiClient({
    baseURL: baseURL || process.env.VITE_API_URL || 'http://localhost:4000/api',
    tokenGetter: () => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
      }
      return null;
    },
    onTokenExpired: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    },
  });
};

// Common API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper functions for API calls
export const apiHelpers = {
  get: async <T = any>(
    client: AxiosInstance,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  post: async <T = any>(
    client: AxiosInstance,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  put: async <T = any>(
    client: AxiosInstance,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async <T = any>(
    client: AxiosInstance,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Export a default client instance for convenience
export const apiClient = createDefaultApiClient();
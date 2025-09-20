import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// API 클라이언트 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 요청 인터셉터 - JWT 토큰 자동 추가
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Public API 호출인 경우 로그인 페이지로 리다이렉트하지 않음
      const isPublicApi = error.config?.url?.includes('/public/') || 
                          error.config?.url?.includes('/settings/') ||
                          error.config?.url?.includes('/pages/');
      
      if (!isPublicApi) {
        // 토큰 만료 또는 인증 실패
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// 타입 정의
export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'manager';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessInfo?: {
    businessName: string;
    businessType: string;
    businessNumber?: string;
    address: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  approvedAt?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  businessInfo: {
    businessName: string;
    businessType: string;
    businessNumber?: string;
    address: string;
    phone: string;
  };
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }),
  
  register: (data: RegisterData) =>
    apiClient.post('/auth/register', data),
  
  getProfile: () =>
    apiClient.get<{ user: User }>('/auth/profile'),
  
  updateProfile: (data: Partial<RegisterData>) =>
    apiClient.put<{ user: User }>('/auth/profile', data),
  
  verifyToken: () =>
    apiClient.get<{ valid: boolean; user: User }>('/auth/verify'),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () =>
    apiClient.get('/admin/dashboard/stats'),
  
  getUsers: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    businessType?: string;
    search?: string;
  }) => apiClient.get('/admin/users', { params }),
  
  getPendingUsers: (params?: {
    page?: number;
    limit?: number;
    businessType?: string;
  }) => apiClient.get('/admin/users/pending', { params }),
  
  approveUser: (userId: string, notes?: string) =>
    apiClient.post(`/admin/users/${userId}/approve`, { notes }),
  
  rejectUser: (userId: string, reason: string) =>
    apiClient.post(`/admin/users/${userId}/reject`, { reason }),
  
  suspendUser: (userId: string, reason: string) =>
    apiClient.post(`/admin/users/${userId}/suspend`, { reason }),
  
  reactivateUser: (userId: string) =>
    apiClient.post(`/admin/users/${userId}/reactivate`),
};

// Services API
export const servicesAPI = {
  getStatus: () =>
    apiClient.get('/services/status'),
  
  getAIServices: () =>
    apiClient.get('/services/ai'),
  
  getRPAServices: () =>
    apiClient.get('/services/rpa'),
  
  getEcommerceServices: () =>
    apiClient.get('/services/ecommerce'),
  
  getCrowdfundingServices: () =>
    apiClient.get('/services/crowdfunding'),
  
  getSignageServices: () =>
    apiClient.get('/services/signage'),
};

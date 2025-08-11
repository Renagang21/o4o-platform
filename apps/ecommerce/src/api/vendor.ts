import axios from 'axios';
import { cookieAuthClient } from '@o4o/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Axios 인스턴스 생성
const vendorApi = axios.create({
  baseURL: `${API_BASE_URL}/vendor`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request 인터셉터 - 인증 토큰 추가
vendorApi.interceptors.request.use(
  async (config: any) => {
    const token = cookieAuthClient.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response 인터셉터 - 토큰 갱신 처리
vendorApi.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await cookieAuthClient.refreshToken();
        const newToken = cookieAuthClient.getAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return vendorApi.request(originalRequest);
        }
      } catch (refreshError: any) {
        // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// 통계 API
export const vendorStatsApi = {
  getDashboardStats: () => 
    vendorApi.get('/stats/dashboard'),
  
  getSalesChartData: (period: '7d' | '30d' | '90d' = '7d') => 
    vendorApi.get('/stats/sales-chart', { params: { period } }),
  
  getRecentOrders: (limit: number = 5) => 
    vendorApi.get('/stats/recent-orders', { params: { limit } }),
  
  getTopProducts: () => 
    vendorApi.get('/stats/top-products')
};

// 상품 관리 API
export const vendorProductApi = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }) => vendorApi.get('/products', { params }),
  
  getProduct: (id: string) => 
    vendorApi.get(`/products/${id}`),
  
  createProduct: (data: any) => 
    vendorApi.post('/products', data),
  
  updateProduct: (id: string, data: any) => 
    vendorApi.put(`/products/${id}`, data),
  
  deleteProduct: (id: string) => 
    vendorApi.delete(`/products/${id}`),
  
  getCategories: () => 
    vendorApi.get('/products/categories')
};

// 주문 관리 API
export const vendorOrderApi = {
  getOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => vendorApi.get('/orders', { params }),
  
  getOrder: (id: string) => 
    vendorApi.get(`/orders/${id}`),
  
  updateOrderStatus: (id: string, data: {
    status?: string;
    trackingNumber?: string;
    carrier?: string;
  }) => vendorApi.put(`/orders/${id}/status`, data),
  
  bulkUpdateOrders: (orderIds: string[], status: string) => 
    vendorApi.post('/orders/bulk-update', { orderIds, status }),
  
  getOrderStats: () => 
    vendorApi.get('/orders/stats')
};

// 프로필 API
export const vendorProfileApi = {
  getProfile: () => 
    vendorApi.get('/profile'),
  
  updateProfile: (data: any) => 
    vendorApi.put('/profile', data)
};

// 설정 API
export const vendorSettingsApi = {
  getSettings: () => 
    vendorApi.get('/settings'),
  
  updateSettings: (data: any) => 
    vendorApi.put('/settings', data)
};
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 첨부
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // 토큰이 만료되었거나 유효하지 않음
      Cookies.remove('authToken');
      Cookies.remove('user');
      
      if (window.location.pathname !== '/login') {
        toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
      }
    } else if (response?.status === 403) {
      toast.error('접근 권한이 없습니다.');
    } else if (response?.status === 429) {
      toast.error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else if (response?.status >= 500) {
      toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    return Promise.reject(error);
  }
);

// 인증 관련 API
export const authAPI = {
  // 회원가입
  register: (data: {
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
  }) => {
    return apiClient.post('/auth/register', data);
  },

  // 로그인
  login: (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },

  // 프로필 조회
  getProfile: () => {
    return apiClient.get('/auth/profile');
  },

  // 프로필 업데이트
  updateProfile: (data: any) => {
    return apiClient.put('/auth/profile', data);
  },

  // 토큰 검증
  verifyToken: () => {
    return apiClient.get('/auth/verify');
  }
};

// 관리자 API
export const adminAPI = {
  // 대시보드 통계
  getDashboardStats: () => {
    return apiClient.get('/admin/dashboard/stats');
  },

  // 모든 사용자 조회
  getAllUsers: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    businessType?: string;
    search?: string;
  }) => {
    return apiClient.get('/admin/users', { params });
  },

  // 승인 대기 사용자 조회
  getPendingUsers: (params?: {
    page?: number;
    limit?: number;
    businessType?: string;
  }) => {
    return apiClient.get('/admin/users/pending', { params });
  },

  // 사용자 승인
  approveUser: (userId: string, notes?: string) => {
    return apiClient.post(`/admin/users/${userId}/approve`, { notes });
  },

  // 사용자 거부
  rejectUser: (userId: string, reason: string) => {
    return apiClient.post(`/admin/users/${userId}/reject`, { reason });
  },

  // 사용자 정지
  suspendUser: (userId: string, reason: string) => {
    return apiClient.post(`/admin/users/${userId}/suspend`, { reason });
  },

  // 사용자 재활성화
  reactivateUser: (userId: string) => {
    return apiClient.post(`/admin/users/${userId}/reactivate`);
  }
};

// 서비스 API
export const serviceAPI = {
  // 서비스 목록 조회
  getServices: () => {
    return apiClient.get('/services');
  },

  // 관리자 패널 목록 조회
  getAdminPanels: () => {
    return apiClient.get('/admin-access');
  },

  // 헬스체크
  healthCheck: () => {
    return apiClient.get('/health');
  },

  // 시스템 상태
  getStatus: () => {
    return apiClient.get('/status');
  }
};

export default apiClient;

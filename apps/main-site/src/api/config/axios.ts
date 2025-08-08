import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      // Public API 호출인 경우 로그인 페이지로 리다이렉트하지 않음
      const isPublicApi = error.config?.url?.includes('/public/') || 
                          error.config?.url?.includes('/settings/') ||
                          error.config?.url?.includes('/pages/');
      
      if (!isPublicApi) {
        // 보호된 API에서만 로그아웃 처리
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 
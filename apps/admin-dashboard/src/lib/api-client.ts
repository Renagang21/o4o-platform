import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Phase 6-7 Cookie Auth Primary: localStorage 토큰만으로는 쿠키 세션에서 항상 401 이었다.
  withCredentials: true,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  // Try multiple keys for backward compatibility
  const token = localStorage.getItem('accessToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 을 여기서 로그아웃으로 확정하지 않는다 (세션 이탈 방지).
    //   refresh 절차가 없는 레거시 클라이언트가 정상 쿠키 세션을 지우고 /login 으로
    //   하드 이동시키던 경로였다. 인증 만료 판정은 canonical 인증 계약이 담당한다.
    return Promise.reject(error);
  }
);
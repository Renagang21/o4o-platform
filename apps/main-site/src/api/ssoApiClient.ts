import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_ENDPOINTS } from './config/endpoints';

// 새로운 SSO/JWT API 클라이언트 설정
const SSO_API_BASE_URL = import.meta.env.VITE_SSO_API_URL || 'https://api.neture.co.kr';

// JWT 토큰 인터페이스 (Phase 1에서 정의한 구조와 동일)
export interface JWTTokens {
  accessToken: string;
  expiresIn: number; // 초 단위
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: SSOUser;
    accessToken: string;
    expiresIn: number;
  };
}

export interface SSOUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: 'customer' | 'admin' | 'seller' | 'supplier' | 'manager';
  permissions: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// SSO API 클라이언트 생성
const ssoApiClient = axios.create({
  baseURL: SSO_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // HttpOnly 쿠키를 위해 필요
});

// 토큰 관리 클래스
class TokenManager {
  private accessToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor() {
    // 로컬 스토리지에서 토큰 복원
    this.accessToken = localStorage.getItem('sso_access_token');
  }

  setTokens(accessToken: string, expiresIn: number) {
    this.accessToken = accessToken;
    localStorage.setItem('sso_access_token', accessToken);
    
    // 자동 갱신 스케줄링 (만료 1분 전에 갱신)
    this.scheduleTokenRefresh(expiresIn - 60);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('sso_access_token');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleTokenRefresh(delayInSeconds: number) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // 최소 30초, 최대 14분으로 제한
    const delay = Math.max(30, Math.min(delayInSeconds, 14 * 60)) * 1000;
    
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, delay);
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // 이미 갱신 중이면 큐에 추가하고 대기
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const response = await axios.post(
        `${SSO_API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        const { accessToken, expiresIn } = response.data.data;
        this.setTokens(accessToken, expiresIn);
        
        // 대기 중인 요청들에 새 토큰 제공
        this.refreshQueue.forEach(resolve => resolve(accessToken));
        this.refreshQueue = [];
        
        return accessToken;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      this.clearTokens();
      
      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  async ensureValidToken(): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    // 토큰이 있지만 갱신이 필요한 경우 갱신 시도
    if (this.shouldRefreshToken()) {
      return await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  private shouldRefreshToken(): boolean {
    // 실제로는 JWT 토큰을 파싱해서 만료 시간을 확인해야 하지만,
    // 여기서는 간단히 주기적 갱신으로 처리
    return false; // 스케줄링된 갱신에 의존
  }
}

// 토큰 매니저 인스턴스
const tokenManager = new TokenManager();

// 요청 인터셉터 - JWT 토큰 자동 추가
ssoApiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenManager.ensureValidToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 에러 및 토큰 갱신 처리
ssoApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenManager.refreshAccessToken();
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return ssoApiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('토큰 갱신 실패:', refreshError);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// SSO Auth API
export const ssoAuthAPI = {
  // 로그인
  login: async (email: string, password: string, domain?: string): Promise<LoginResponse> => {
    const response = await ssoApiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
      domain: domain || 'neture.co.kr'
    });

    if (response.data.success) {
      const { accessToken, expiresIn } = response.data.data;
      tokenManager.setTokens(accessToken, expiresIn);
    }

    return response.data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    try {
      await ssoApiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      tokenManager.clearTokens();
    }
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<SSOUser> => {
    const response = await ssoApiClient.get<{ success: boolean; data: { user: SSOUser } }>(
      API_ENDPOINTS.AUTH.ME
    );
    return response.data.data.user;
  },

  // 토큰 수동 갱신
  refreshToken: async (): Promise<JWTTokens | null> => {
    try {
      const response = await ssoApiClient.post<{ success: boolean; data: JWTTokens }>(
        API_ENDPOINTS.AUTH.REFRESH
      );
      
      if (response.data.success) {
        const tokens = response.data.data;
        tokenManager.setTokens(tokens.accessToken, tokens.expiresIn);
        return tokens;
      }
      return null;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      return null;
    }
  },

  // 토큰 상태 확인
  isAuthenticated: (): boolean => {
    return tokenManager.getAccessToken() !== null;
  },

  // 토큰 매니저 접근
  getTokenManager: () => tokenManager,
};

export default ssoApiClient;
export { tokenManager };
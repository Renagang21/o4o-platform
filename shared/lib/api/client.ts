/**
 * Shared API Client for O4O Platform
 * 모든 서비스에서 동일한 방식으로 API를 호출하기 위한 공유 클라이언트
 */

// 기본 설정
export const API_CONFIG = {
  BASE_URL: 'http://localhost:4000/api',
  TIMEOUT: 30000,
  TOKEN_KEY: 'auth_token',
} as const;

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

// 사용자 타입 (백엔드 API 응답)
export interface ApiUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  businessInfo?: any;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// 로그인 응답
export interface LoginResponse {
  token: string;
  user: ApiUser;
}

// API 클라이언트 클래스
export class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL?: string, timeout?: number) {
    this.baseURL = baseURL || this.getApiBaseUrl();
    this.timeout = timeout || API_CONFIG.TIMEOUT;
  }

  // 환경변수에서 API URL 가져오기
  private getApiBaseUrl(): string {
    // 다양한 환경변수 이름 지원
    if (typeof window !== 'undefined') {
      return (
        (window as any)?.import?.meta?.env?.VITE_API_BASE_URL ||
        (window as any)?.import?.meta?.env?.VITE_API_URL ||
        process.env.REACT_APP_API_URL ||
        API_CONFIG.BASE_URL
      );
    }
    return process.env.API_BASE_URL || API_CONFIG.BASE_URL;
  }

  // 토큰 관리
  private getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(API_CONFIG.TOKEN_KEY);
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
    }
  }

  private removeToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    }
  }

  // HTTP 헤더 생성
  private getHeaders(includeAuth = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // 기본 fetch 래퍼
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(includeAuth),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // 인증 관련 메서드
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<ApiResponse<LoginResponse>>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );

    if (response.success && response.data) {
      this.setToken(response.data.token);
      return response.data;
    }

    throw new Error(response.message || 'Login failed');
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiUser> {
    const response = await this.request<ApiResponse<{ user: ApiUser }>>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      },
      false
    );

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error(response.message || 'Registration failed');
  }

  async verifyToken(): Promise<ApiUser> {
    const response = await this.request<ApiResponse<{ user: ApiUser }>>(
      '/auth/verify'
    );

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error(response.message || 'Token verification failed');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.removeToken();
    }
  }

  // 사용자 관련 메서드
  async getCurrentUser(): Promise<ApiUser> {
    const response = await this.request<ApiResponse<ApiUser>>('/users/profile');
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to get current user');
  }

  async updateProfile(userData: Partial<ApiUser>): Promise<ApiUser> {
    const response = await this.request<ApiResponse<ApiUser>>(
      '/users/profile',
      {
        method: 'PUT',
        body: JSON.stringify(userData),
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to update profile');
  }

  // 일반 API 요청 메서드
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 토큰 상태 확인
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // 토큰 수동 설정 (외부에서 토큰을 설정할 때)
  setAuthToken(token: string): void {
    this.setToken(token);
  }

  // 토큰 제거
  clearAuth(): void {
    this.removeToken();
  }
}

// 기본 인스턴스 생성
export const apiClient = new ApiClient();

// 편의 함수들
export const auth = {
  login: (email: string, password: string) => apiClient.login(email, password),
  register: (userData: Parameters<typeof apiClient.register>[0]) => apiClient.register(userData),
  logout: () => apiClient.logout(),
  verifyToken: () => apiClient.verifyToken(),
  isAuthenticated: () => apiClient.isAuthenticated(),
};

export const user = {
  getCurrentUser: () => apiClient.getCurrentUser(),
  updateProfile: (userData: Partial<ApiUser>) => apiClient.updateProfile(userData),
};

export default apiClient;
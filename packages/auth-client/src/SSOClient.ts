import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  RefreshTokenResponse,
  LoginOptions,
  LogoutOptions,
  SecurityConfig,
  SessionStatus,
  AuthError
} from './types';

/**
 * 중앙화된 SSO 인증 클라이언트
 * main-site와 admin-dashboard에서 공통 사용
 */
export class SSOClient {
  private apiClient: AxiosInstance;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];
  private config: SecurityConfig;

  constructor(
    baseURL: string = 'http://localhost:4000',
    config: Partial<SecurityConfig> = {}
  ) {
    this.config = {
      maxConcurrentSessions: 1,
      sessionTimeout: 8 * 60 * 60 * 1000, // 8시간
      warningBeforeExpiry: 5 * 60 * 1000, // 5분 전 경고
      autoRefresh: true,
      cookieDomain: '.neture.co.kr',
      secureTransport: process.env.NODE_ENV === 'production',
      ...config
    };

    this.apiClient = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 요청 인터셉터: 토큰 자동 추가
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터: 401 처리 및 자동 토큰 갱신
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.apiClient(originalRequest);
            }
          } catch (refreshError) {
            // 토큰 갱신 실패 시 로그아웃 처리
            this.handleAuthError('token_refresh_failed');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 로그인
   */
  async login(
    credentials: LoginCredentials,
    options: LoginOptions = {}
  ): Promise<AuthUser> {
    try {
      const response = await this.apiClient.post<LoginResponse>(
        '/api/v1/business/auth/login',
        credentials
      );

      const { user, accessToken, refreshToken, expiresIn } = response.data;

      // 토큰 저장
      this.setAccessToken(accessToken);
      this.setRefreshToken(refreshToken);

      // 쿠키 설정
      const cookieOptions = {
        domain: this.config.cookieDomain,
        secure: this.config.secureTransport,
        sameSite: 'strict' as const,
        expires: options.maxAge ? new Date(Date.now() + options.maxAge) : undefined
      };

      Cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        httpOnly: false, // 클라이언트에서 접근 가능하도록 (실제로는 httpOnly: true 권장)
        expires: 7 // 7일
      });

      // 자동 토큰 갱신 스케줄링
      if (this.config.autoRefresh) {
        this.scheduleTokenRefresh(expiresIn);
      }

      return user;
    } catch (error: any) {
      const authError: AuthError = {
        code: error.response?.data?.code || 'LOGIN_FAILED',
        message: error.response?.data?.message || '로그인에 실패했습니다.',
        details: error.response?.data
      };
      throw authError;
    }
  }

  /**
   * 로그아웃
   */
  async logout(options: LogoutOptions = {}): Promise<void> {
    try {
      await this.apiClient.post('/api/v1/business/auth/logout', {
        everywhere: options.everywhere
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
      this.clearRefreshTimer();
    }
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await this.apiClient.get<{ user: AuthUser }>(
        '/api/v1/business/auth/current'
      );
      return response.data.user;
    } catch (error) {
      return null;
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // 이미 갱신 중이면 큐에 추가
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.apiClient.post<RefreshTokenResponse>(
        '/api/v1/business/auth/refresh',
        { refreshToken }
      );

      const { accessToken, expiresIn } = response.data;
      this.setAccessToken(accessToken);

      // 대기 중인 요청들에 새 토큰 전달
      this.refreshQueue.forEach(resolve => resolve(accessToken));
      this.refreshQueue = [];

      // 다음 갱신 스케줄링
      if (this.config.autoRefresh) {
        this.scheduleTokenRefresh(expiresIn);
      }

      return accessToken;
    } catch (error) {
      this.refreshQueue.forEach(resolve => resolve(''));
      this.refreshQueue = [];
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 세션 상태 확인
   */
  getSessionStatus(): SessionStatus {
    const token = this.getAccessToken();
    if (!token) {
      return { status: 'invalid' };
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      const remainingTime = expiryTime - currentTime;

      if (remainingTime <= 0) {
        return { status: 'expired' };
      }

      if (remainingTime <= this.config.warningBeforeExpiry) {
        return {
          status: 'expiring_soon',
          remainingSeconds: Math.floor(remainingTime / 1000)
        };
      }

      return { status: 'active' };
    } catch (error) {
      return { status: 'invalid' };
    }
  }

  /**
   * 역할 기반 권한 확인
   */
  hasRole(requiredRole: string): boolean {
    const user = this.getCurrentUserFromToken();
    return user?.role === requiredRole;
  }

  /**
   * 권한 기반 접근 확인
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUserFromToken();
    return user?.permissions?.includes(permission) || false;
  }

  /**
   * 관리자 권한 확인
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * 토큰에서 사용자 정보 추출
   */
  private getCurrentUserFromToken(): AuthUser | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        permissions: payload.permissions || [],
        isApproved: payload.isApproved || false,
        isLocked: payload.isLocked || false,
        lastLogin: payload.lastLogin,
        createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : '',
        updatedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : ''
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 토큰 갱신 스케줄링
   */
  private scheduleTokenRefresh(expiresIn: number) {
    this.clearRefreshTimer();
    
    // 만료 5분 전에 갱신
    const refreshIn = (expiresIn - 300) * 1000;
    
    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken().catch(error => {
          console.error('Scheduled token refresh failed:', error);
          this.handleAuthError('scheduled_refresh_failed');
        });
      }, refreshIn);
    }
  }

  /**
   * 인증 오류 처리
   */
  private handleAuthError(reason: string) {
    this.clearTokens();
    this.clearRefreshTimer();
    
    // 커스텀 이벤트 발생 (컴포넌트에서 리스닝 가능)
    window.dispatchEvent(new CustomEvent('auth-error', {
      detail: { reason }
    }));
  }

  /**
   * 토큰 관리 메서드들
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setAccessToken(token: string) {
    localStorage.setItem('accessToken', token);
  }

  private getRefreshToken(): string | null {
    return Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
  }

  private setRefreshToken(token: string) {
    localStorage.setItem('refreshToken', token);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    Cookies.remove('refreshToken', { domain: this.config.cookieDomain });
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * API 클라이언트 직접 접근 (고급 사용)
   */
  getApiClient(): AxiosInstance {
    return this.apiClient;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// 기본 인스턴스 생성
export const defaultSSOClient = new SSOClient();

export default SSOClient;
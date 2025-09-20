import axiosInstance from '../config/axios';
import { ssoAuthAPI } from '../ssoApiClient';
import { API_ENDPOINTS } from '../config/endpoints';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  SSOUser,
  ssoUserToLegacyUser,
} from './types';

// SSO 활성화 여부를 환경변수로 제어
const USE_SSO = import.meta.env.VITE_USE_SSO === 'true' || true; // 기본적으로 SSO 사용

export const authApi = {
  // 회원가입 (아직 SSO에 구현되지 않음, 레거시 사용)
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await axiosInstance.post<RegisterResponse>(
      API_ENDPOINTS.AUTH.LEGACY_REGISTER,
      data
    );
    return response.data;
  },

  // 로그인 - SSO 또는 레거시 시스템 사용
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    if (USE_SSO) {
      try {
        const ssoResponse = await ssoAuthAPI.login(data.email, data.password);
        
        if (ssoResponse.success) {
          const legacyUser = ssoUserToLegacyUser(ssoResponse.data.user);
          return {
            token: ssoResponse.data.accessToken,
            user: legacyUser
          };
        } else {
          throw new Error(ssoResponse.message || 'Login failed');
        }
      } catch (error: any) {
    // Error logging - use proper error handler
        // SSO 실패 시 레거시 시스템으로 폴백
        return this.legacyLogin(data);
      }
    } else {
      return this.legacyLogin(data);
    }
  },

  // 레거시 로그인 (하위 호환성)
  legacyLogin: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LEGACY_LOGIN,
      data
    );
    
    // 레거시 토큰도 저장
    if (response.data.token) {
      localStorage.setItem('legacy_token', response.data.token);
    }
    
    return response.data;
  },

  // 현재 사용자 정보 조회 - SSO 우선, 레거시 폴백
  getCurrentUser: async (): Promise<User> => {
    if (USE_SSO && ssoAuthAPI.isAuthenticated()) {
      try {
        const ssoUser = await ssoAuthAPI.getCurrentUser();
        return ssoUserToLegacyUser(ssoUser);
      } catch (error: any) {
    // Error logging - use proper error handler
        // SSO 실패 시 레거시로 폴백
      }
    }
    
    // 레거시 시스템 사용
    const response = await axiosInstance.get<User>(API_ENDPOINTS.AUTH.LEGACY_ME);
    return response.data;
  },

  // 로그아웃 - 양쪽 시스템 모두 정리
  logout: async (): Promise<void> => {
    const promises: Promise<void>[] = [];

    // SSO 로그아웃
    if (USE_SSO && ssoAuthAPI.isAuthenticated()) {
      promises.push(
        ssoAuthAPI.logout().catch(error => {
          // Error logging - use proper error handler
          console.error('SSO logout error:', error);
        })
      );
    }

    // 레거시 로그아웃
    const legacyToken = localStorage.getItem('legacy_token');
    if (legacyToken) {
      promises.push(
        axiosInstance.post(API_ENDPOINTS.AUTH.LEGACY_LOGOUT).catch(error => {
          // Error logging - use proper error handler
          console.error('Legacy logout error:', error);
        })
      );
    }

    await Promise.allSettled(promises);

    // 모든 토큰 정리
    localStorage.removeItem('token');
    localStorage.removeItem('legacy_token');
    localStorage.removeItem('sso_access_token');
  },

  // 토큰 저장 (레거시 호환성)
  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },

  // 토큰 가져오기 (SSO 우선, 레거시 폴백)
  getToken: (): string | null => {
    if (USE_SSO && ssoAuthAPI.isAuthenticated()) {
      return ssoAuthAPI.getTokenManager().getAccessToken();
    }
    return localStorage.getItem('token') || localStorage.getItem('legacy_token');
  },

  // 인증 상태 확인
  isAuthenticated: (): boolean => {
    if (USE_SSO && ssoAuthAPI.isAuthenticated()) {
      return true;
    }
    return !!(localStorage.getItem('token') || localStorage.getItem('legacy_token'));
  },

  // SSO 사용 여부 확인
  isUsingSSO: (): boolean => {
    return USE_SSO && ssoAuthAPI.isAuthenticated();
  },

  // SSO 토큰 갱신
  refreshToken: async (): Promise<boolean> => {
    if (USE_SSO) {
      const tokens = await ssoAuthAPI.refreshToken();
      return !!tokens;
    }
    return false;
  },
}; 
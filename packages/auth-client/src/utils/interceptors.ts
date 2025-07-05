import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { SSOClient } from '../SSOClient';

/**
 * Axios 인터셉터 생성 유틸리티
 */
export function createAuthInterceptor(ssoClient: SSOClient) {
  return {
    request: (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },

    responseError: async (error: any) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await ssoClient.refreshAccessToken();
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return ssoClient.getApiClient()(originalRequest);
          }
        } catch (refreshError) {
          // 토큰 갱신 실패 시 로그아웃 이벤트 발생
          window.dispatchEvent(new CustomEvent('auth-logout', {
            detail: { reason: 'token_refresh_failed' }
          }));
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  };
}

/**
 * 레거시 Axios 인스턴스에 SSO 인터셉터 추가
 */
export function addSSOInterceptors(apiClient: AxiosInstance, ssoClient: SSOClient) {
  const interceptor = createAuthInterceptor(ssoClient);
  
  apiClient.interceptors.request.use(interceptor.request);
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    interceptor.responseError
  );
}
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SSOClient, AuthUser, AuthState, SessionStatus, LoginCredentials, LoginOptions, LogoutOptions } from '@o4o/auth-client';

interface AuthContextValue extends AuthState {
  // 인증 액션
  login: (credentials: LoginCredentials, options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // 상태 조회
  getCurrentUser: () => Promise<AuthUser | null>;
  getSessionStatus: () => SessionStatus;
  
  // 권한 확인
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  
  // 유틸리티
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  ssoClient?: SSOClient;
  autoRefresh?: boolean;
  onAuthError?: (error: string) => void;
  onSessionExpiring?: (remainingSeconds: number) => void;
}

/**
 * 공통 SSO 인증 프로바이더
 * main-site와 admin-dashboard에서 공통 사용
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  ssoClient: providedClient,
  autoRefresh = true,
  onAuthError,
  onSessionExpiring
}) => {
  const [ssoClient] = useState(() => providedClient || new SSOClient());
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isSSO: true,
    tokenExpiry: null,
    error: undefined
  });

  // 사용자 상태 초기화
  const initializeAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const user = await ssoClient.getCurrentUser();
      if (user) {
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: undefined
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'initialization_failed'
      }));
    }
  }, [ssoClient]);

  // 로그인
  const login = useCallback(async (credentials: LoginCredentials, options?: LoginOptions) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const user = await ssoClient.login(credentials, options);
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: undefined
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed'
      }));
      throw error;
    }
  }, [ssoClient]);

  // 로그아웃
  const logout = useCallback(async (options?: LogoutOptions) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await ssoClient.logout(options);
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isSSO: true,
        tokenExpiry: null,
        error: undefined
      });
    }
  }, [ssoClient]);

  // 토큰 갱신
  const refreshToken = useCallback(async () => {
    try {
      await ssoClient.refreshAccessToken();
      const user = await ssoClient.getCurrentUser();
      if (user) {
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          error: undefined
        }));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: 'token_refresh_failed'
      }));
    }
  }, [ssoClient]);

  // 현재 사용자 조회
  const getCurrentUser = useCallback(async () => {
    return ssoClient.getCurrentUser();
  }, [ssoClient]);

  // 세션 상태 조회
  const getSessionStatus = useCallback(() => {
    return ssoClient.getSessionStatus();
  }, [ssoClient]);

  // 권한 확인 메서드들
  const hasRole = useCallback((role: string) => {
    return ssoClient.hasRole(role);
  }, [ssoClient]);

  const hasPermission = useCallback((permission: string) => {
    return ssoClient.hasPermission(permission);
  }, [ssoClient]);

  const isAdmin = useCallback(() => {
    return ssoClient.isAdmin();
  }, [ssoClient]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // 인증 이벤트 리스너 설정
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      const { reason } = event.detail;
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: reason
      }));
      onAuthError?.(reason);
    };

    const handleAuthLogout = (event: CustomEvent) => {
      const { reason } = event.detail;
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isSSO: true,
        tokenExpiry: null,
        error: reason
      });
    };

    window.addEventListener('auth-error', handleAuthError as EventListener);
    window.addEventListener('auth-logout', handleAuthLogout as EventListener);

    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener);
      window.removeEventListener('auth-logout', handleAuthLogout as EventListener);
    };
  }, [onAuthError]);

  // 세션 모니터링
  useEffect(() => {
    if (!state.isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      const sessionStatus = getSessionStatus();
      
      if (sessionStatus.status === 'expired') {
        logout({ reason: 'session_expired' });
      } else if (sessionStatus.status === 'expiring_soon' && sessionStatus.remainingSeconds) {
        onSessionExpiring?.(sessionStatus.remainingSeconds);
      }
    }, 30000); // 30초마다 체크

    return () => clearInterval(interval);
  }, [state.isAuthenticated, autoRefresh, getSessionStatus, logout, onSessionExpiring]);

  // 초기화
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const contextValue: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    getCurrentUser,
    getSessionStatus,
    hasRole,
    hasPermission,
    isAdmin,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 컨텍스트 훅
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
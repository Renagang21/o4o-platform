import { FC, useState, ReactNode, useEffect  } from 'react';
import { AuthContext } from './AuthContext';
import { AuthClient } from '@o4o/auth-client';
import type { User, SessionStatus } from '@o4o/types';

interface AuthProviderProps {
  children: ReactNode;
  ssoClient?: AuthClient;
  autoRefresh?: boolean;
  onAuthError?: (error: string) => void;
  onSessionExpiring?: (remainingSeconds: number) => void;
}

export const AuthProvider: FC<AuthProviderProps> = ({ 
  children, 
  ssoClient,
  onAuthError
}) => {
  // 로컬 스토리지에서 초기 상태 읽기
  const getInitialState = () => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('admin-auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.user) {
          return parsed.state.user;
        }
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }
    return null;
  };

  const [user, setUser] = useState<User | null>(getInitialState());
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩 상태를 true로 설정
  const [error, setError] = useState<string | null>(null);
  
  const authClient = ssoClient || new AuthClient(
    typeof window !== 'undefined' && (window as typeof globalThis & { import?: { meta?: { env?: { VITE_API_BASE_URL?: string } } } }).import?.meta?.env?.VITE_API_BASE_URL || ''
  );

  // 초기 인증 상태 확인
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        const storedUser = getInitialState();
        const storedToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          // 저장된 사용자 정보가 있으면 유효성 검증
          setUser(storedUser);
          
          // SSO 세션 확인
          if (ssoClient && typeof window !== 'undefined') {
            try {
              const sessionData = await authClient.checkSession();
              if (!sessionData.isAuthenticated) {
                // SSO 세션이 유효하지 않으면 로그아웃
                setUser(null);
                localStorage.removeItem('admin-auth-storage');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
              }
            } catch (error) {
              console.error('SSO session check failed:', error);
              // SSO 체크 실패 시에도 기존 세션 유지
            }
          }
        } else {
          // 저장된 인증 정보가 없으면 null 설정
          setUser(null);
        }
      } catch (error) {
        console.error('Initial auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialAuth();
  }, [authClient, ssoClient]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.login(credentials);
      setUser(response.user);
      
      // 토큰을 localStorage에 저장
      if (response.token) {
        // accessToken으로도 저장 (AuthClient가 이 키를 찾음)
        localStorage.setItem('accessToken', response.token);
        localStorage.setItem('token', response.token); // 하위 호환성
        
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        
        // admin-auth-storage 구조도 업데이트 (apiClient 호환성을 위해)
        const authStorage = {
          state: {
            user: response.user,
            token: response.token,
            accessToken: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true
          }
        };
        localStorage.setItem('admin-auth-storage', JSON.stringify(authStorage));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onAuthError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authClient.logout();
    setUser(null);
    setError(null);
    
    // 모든 인증 관련 데이터 제거
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('admin-auth-storage');
    localStorage.removeItem('user');
  };

  const clearError = () => {
    setError(null);
  };

  const getSessionStatus = (): SessionStatus | null => {
    if (!user) return null;
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const remainingTime = expiresAt.getTime() - now.getTime();
    
    return {
      isValid: remainingTime > 0,
      expiresAt,
      remainingTime
    };
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    clearError,
    getSessionStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
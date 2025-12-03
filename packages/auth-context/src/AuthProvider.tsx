import { FC, useState, ReactNode, useEffect  } from 'react';
import { AuthContext } from './AuthContext';
import { AuthClient } from '@o4o/auth-client';
import type { User, SessionStatus } from './AuthContext';

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
  // 저장된 사용자 정보가 있으면 로딩을 false로, 없으면 true로 설정
  const [isLoading, setIsLoading] = useState(() => {
    const storedUser = getInitialState();
    const storedToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    // 저장된 인증 정보가 있으면 즉시 사용 가능하도록 false 반환
    return !(storedUser && storedToken);
  });
  const [error, setError] = useState<string | null>(null);
  
  const authClient = ssoClient || new AuthClient(
    typeof window !== 'undefined' ?
      'https://api.neture.co.kr/api' :
      'https://api.neture.co.kr/api'
  );

  // 초기 인증 상태 확인 - 마운트 시 한 번만 실행
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        const storedUser = getInitialState();
        const storedToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          // 저장된 사용자 정보가 있으면 즉시 사용
          // 이미 useState 초기값으로 설정되어 있으므로 setUser 호출 불필요
          
          // SSO 세션 확인은 백그라운드에서 수행 (옵션)
          if (ssoClient && typeof window !== 'undefined') {
            // SSO 체크는 비동기로 수행하되, 실패해도 로컬 세션 유지
            authClient.checkSession().then(sessionData => {
              if (!sessionData.isAuthenticated) {
                // SSO 세션이 없어도 로컬 세션은 유지 (토큰이 유효한 경우)
                // 콘솔 로그 제거 - 정상적인 동작임
              }
            }).catch(() => {
              // SSO 체크 실패 시에도 기존 세션 유지
              // 콘솔 로그 제거 - 정상적인 동작임
            });
          }
          
          setIsLoading(false);
        } else {
          // 저장된 인증 정보가 없으면 null 설정
          setUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Initial auth check failed:', error);
        setUser(null);
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
        // 여러 키로 저장 (다양한 API 클라이언트 호환성)
        localStorage.setItem('accessToken', response.token);
        localStorage.setItem('authToken', response.token); // postApi 호환성
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

  // Check both user.role and user.roles array for admin access
  // Support both string roles and object roles with name field
  const adminRoleNames = ['admin', 'administrator', 'super_admin'];

  const isAdmin = user ? (
    // Check user.role (string)
    (user.role && adminRoleNames.includes(user.role)) ||
    // Check user.activeRole.name (object)
    ((user as any).activeRole?.name && adminRoleNames.includes((user as any).activeRole.name)) ||
    // Check user.roles array (can be strings or objects)
    (Array.isArray((user as any).roles) && (user as any).roles.some((r: any) =>
      typeof r === 'string'
        ? adminRoleNames.includes(r)
        : r?.name && adminRoleNames.includes(r.name)
    ))
  ) : false;

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isAdmin,
    authClient, // Expose authClient for API calls
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
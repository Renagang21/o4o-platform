import { FC, useState, ReactNode, useEffect  } from 'react';
import { AuthContext } from './AuthContext';
import { AuthClient, AuthStrategy } from '@o4o/auth-client';
import type { User, SessionStatus } from './AuthContext';
import {
  getAccessToken,
  setAccessToken,
  clearAllTokens,
  setRefreshToken,
} from './token-storage';

/**
 * Phase 6-7: Cookie Auth Primary
 *
 * Authentication strategy options:
 * - 'cookie': Use httpOnly cookies (DEFAULT for B2C)
 * - 'localStorage': Use localStorage tokens (legacy)
 */
interface AuthProviderProps {
  children: ReactNode;
  ssoClient?: AuthClient;
  autoRefresh?: boolean;
  onAuthError?: (error: string) => void;
  onSessionExpiring?: (remainingSeconds: number) => void;
  /**
   * Phase 6-7: Authentication strategy
   * - 'cookie': Primary strategy, uses /auth/status API to check auth state
   * - 'localStorage': Legacy strategy, uses localStorage tokens
   * @default 'cookie'
   */
  strategy?: AuthStrategy;
}

export const AuthProvider: FC<AuthProviderProps> = ({
  children,
  ssoClient,
  onAuthError,
  strategy = 'cookie' // Phase 6-7: Cookie Auth Primary
}) => {
  // Phase 6-7: localStorage fallback for localStorage strategy only
  const getInitialStateFromStorage = () => {
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

  // Phase 6-7: For cookie strategy, start with null and check via API
  // For localStorage strategy, use stored state as initial value
  const [user, setUser] = useState<User | null>(() => {
    if (strategy === 'localStorage') {
      return getInitialStateFromStorage();
    }
    return null; // Cookie strategy checks via API
  });

  // Phase 6-7: For cookie strategy, always start loading (need API check)
  // For localStorage strategy, check if we have stored auth info
  const [isLoading, setIsLoading] = useState(() => {
    if (strategy === 'cookie') {
      return true; // Cookie strategy needs API verification
    }
    const storedUser = getInitialStateFromStorage();
    const storedToken = getAccessToken();
    return !(storedUser && storedToken);
  });
  const [error, setError] = useState<string | null>(null);

  // Phase 6-7: Create AuthClient with appropriate strategy
  const authClient = ssoClient || new AuthClient(
    typeof window !== 'undefined' ?
      'https://api.neture.co.kr/api' :
      'https://api.neture.co.kr/api',
    { strategy }
  );

  // Phase 6-7: Initial auth check
  // - Cookie strategy: Call /auth/status API to get auth state
  // - localStorage strategy: Use stored tokens (legacy behavior)
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        if (strategy === 'cookie') {
          // Phase 6-7: Cookie strategy - check auth status via API
          // Cookies are sent automatically with withCredentials: true
          try {
            const response = await authClient.api.get('/auth/status');
            const statusData = response.data as any;

            if (statusData.authenticated && statusData.user) {
              const userWithDates = {
                ...statusData.user,
                createdAt: statusData.user.createdAt || new Date().toISOString(),
                updatedAt: statusData.user.updatedAt || new Date().toISOString()
              };
              setUser(userWithDates);
            } else {
              setUser(null);
            }
          } catch (apiError) {
            // API call failed (possibly 401) - user is not authenticated
            setUser(null);
          }
          setIsLoading(false);
        } else {
          // localStorage strategy - legacy behavior
          const storedUser = getInitialStateFromStorage();
          const storedToken = getAccessToken();

          if (storedUser && storedToken) {
            // SSO 세션 확인은 백그라운드에서 수행 (옵션)
            if (ssoClient && typeof window !== 'undefined') {
              authClient.checkSession().then(sessionData => {
                if (!sessionData.isAuthenticated) {
                  // SSO 세션이 없어도 로컬 세션은 유지 (토큰이 유효한 경우)
                }
              }).catch(() => {
                // SSO 체크 실패 시에도 기존 세션 유지
              });
            }
            setIsLoading(false);
          } else {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Initial auth check failed:', error);
        setUser(null);
        setIsLoading(false);
      }
    };

    checkInitialAuth();
  }, [authClient, ssoClient, strategy]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.login(credentials);

      // API 응답 구조: { success, data: { user, accessToken, refreshToken } }
      const loginData = (response as any).data || response;
      const userData = loginData.user;
      const token = loginData.accessToken || loginData.token;
      const refreshToken = loginData.refreshToken;

      const userWithDates = {
        ...userData,
        createdAt: userData?.createdAt || new Date().toISOString(),
        updatedAt: userData?.updatedAt || new Date().toISOString()
      };
      setUser(userWithDates as any);

      // Phase 6-7: Token storage depends on strategy
      // - Cookie strategy: Server sets httpOnly cookies, no localStorage needed
      // - localStorage strategy: Store tokens in localStorage
      if (strategy === 'localStorage' && token) {
        // Use SSOT token storage - single key only
        setAccessToken(token);

        if (refreshToken) {
          setRefreshToken(refreshToken);
        }

        // admin-auth-storage 구조도 업데이트 (apiClient 호환성을 위해)
        const authStorage = {
          state: {
            user: userWithDates,
            token: token,
            accessToken: token,
            refreshToken: refreshToken,
            isAuthenticated: true
          }
        };
        localStorage.setItem('admin-auth-storage', JSON.stringify(authStorage));
      } else if (strategy === 'cookie') {
        // Phase 6-7: Cookie strategy - only store user info for UI
        // Tokens are in httpOnly cookies
        const authStorage = {
          state: {
            user: userWithDates,
            isAuthenticated: true
            // No tokens stored in localStorage for cookie strategy
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

    // Phase 6-7: Clear localStorage for both strategies
    // - Cookie strategy: Server clears httpOnly cookies, clear local user cache
    // - localStorage strategy: Clear all tokens
    if (strategy === 'localStorage') {
      clearAllTokens();
    }
    // Clear user info cache
    localStorage.removeItem('admin-auth-storage');
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
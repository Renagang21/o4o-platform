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

  // Phase 6-7 Optimized: Check localStorage for cached user first
  // This allows instant UI render while API verification happens in background
  const [user, setUser] = useState<User | null>(() => {
    return getInitialStateFromStorage();
  });

  // Phase 6-7 Optimized: If we have cached user, don't show loading
  // API verification happens in background without blocking render
  const [isLoading, setIsLoading] = useState(() => {
    const storedUser = getInitialStateFromStorage();
    if (storedUser) {
      return false; // Instant render with cached user
    }
    if (strategy === 'cookie') {
      return true; // No cache, need API verification
    }
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

  // Phase 6-7 Optimized: Background auth verification
  // - If cached user exists, verify in background (non-blocking)
  // - If no cached user, blocking check is needed
  useEffect(() => {
    const checkInitialAuth = async () => {
      const cachedUser = getInitialStateFromStorage();

      try {
        if (strategy === 'cookie') {
          // Phase 6-7 Optimized: Cookie strategy
          // If we have cached user, verify in background without blocking
          // If no cached user, do blocking verification
          try {
            const response = await authClient.api.get('/auth/status');
            const statusData = response.data as any;

            if (statusData.authenticated && statusData.user) {
              const userWithDates = {
                ...statusData.user,
                createdAt: statusData.user.createdAt || new Date().toISOString(),
                updatedAt: statusData.user.updatedAt || new Date().toISOString()
              };
              // Only update if different from cached (prevents unnecessary re-renders)
              if (!cachedUser || cachedUser.id !== userWithDates.id) {
                setUser(userWithDates);
              }
            } else {
              // Session expired - clear user
              setUser(null);
              localStorage.removeItem('admin-auth-storage');
            }
          } catch (apiError) {
            // API call failed (possibly 401) - session invalid
            if (!cachedUser) {
              setUser(null);
            }
            // If we had cached user, keep it but it may fail on next API call
            // This prevents flash of login screen on temporary network issues
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
        if (!cachedUser) {
          setUser(null);
        }
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
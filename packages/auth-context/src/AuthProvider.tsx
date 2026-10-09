import { FC, useState, ReactNode, useEffect, useRef, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { AuthClient, AuthStrategy } from '@o4o/auth-client';
import type { User, SessionStatus } from './AuthContext';
import {
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

/**
 * 세션 사용자 교체 표식 (CHECK-O4O-URL-FIRST-CENSUS-V1 §19-1 · §21-2).
 *
 * 쿠키 세션은 같은 `.neture.co.kr` 쿠키를 쓰는 다른 경로에서 다른 사용자로 바뀔 수 있다.
 * 캐시된 사용자와 `/auth/status` 사용자가 다르면 새 사용자를 조용히 채택하지 않고
 * 이 표식을 남긴다. 표식이 있는 동안은 새로고침해도 서버 세션을 채택하지 않으며,
 * 명시적 로그인(loginWithGoogle) 성공이나 명시적 logout 에서만 지운다.
 * `logout()` 은 호출하지 않는다 — 서버 logout 은 쿠키 주인(다른 사용자)의 브라우저 세션을 끊는다.
 */
export const SESSION_CONFLICT_STORAGE_KEY = 'admin-session-conflict';

const hasSessionConflictMark = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SESSION_CONFLICT_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const sameUserId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

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

  // Cached identity is used only to detect account replacement after server verification.
  const sessionGeneration = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionConflict, setSessionConflict] = useState<boolean>(() => hasSessionConflictMark());

  /** 사용자 교체 감지 → 화면 비움 · 캐시 제거 · 표식 기록. 서버 logout 은 호출하지 않는다. */
  const enterSessionConflict = () => {
    try {
      localStorage.setItem(
        SESSION_CONFLICT_STORAGE_KEY,
        JSON.stringify({ detectedAt: new Date().toISOString() }),
      );
    } catch {
      // storage 불가 환경에서도 이번 화면은 비운다
    }
    localStorage.removeItem('admin-auth-storage');
    setUser(null);
    setSessionConflict(true);
    onAuthError?.('session_user_changed');
  };

  const clearSessionConflict = () => {
    try {
      localStorage.removeItem(SESSION_CONFLICT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSessionConflict(false);
  };

  // Phase 6-7: Create AuthClient with appropriate strategy
  const authClient = useMemo(() => ssoClient || new AuthClient(
    'https://api.neture.co.kr/api/v1', { strategy }
  ), [ssoClient, strategy]);

  useEffect(() => {
    const clearSession = () => {
      sessionGeneration.current += 1;
      setUser(null);
      setIsLoading(false);
      localStorage.removeItem('admin-auth-storage');
    };
    window.addEventListener('auth:token-cleared', clearSession);
    return () => window.removeEventListener('auth:token-cleared', clearSession);
  }, []);

  // Restore identity only after server verification; cache alone never grants access.
  useEffect(() => {
    const checkInitialAuth = async () => {
      const generation = sessionGeneration.current;
      const cachedUser = getInitialStateFromStorage();

      try {
        if (strategy === 'cookie') {
          // Keep isLoading until the cookie status has been checked.
          try {
            const response = await authClient.api.get('/auth/status');
            if (generation !== sessionGeneration.current) return;

            // WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1
            //   백엔드는 표준 봉투로 응답한다(CLAUDE.md §8):
            //     { success: true, data: { authenticated, user } }
            //   기존 코드는 봉투를 벗기지 않고 response.data.authenticated 를 읽어
            //   항상 undefined → "세션 만료" 로 오판 → 유효한 세션 캐시를 삭제 →
            //   AdminProtectedRoute 가 /login 으로 보냈다(새로고침·새 탭·딥링크 전부).
            //   근거: IR-O4O-ADMIN-DEEP-LINK-REFRESH-AUTH-BOOTSTRAP-V1
            //
            //   봉투/비봉투 양쪽을 모두 허용한다. `data` 가 없으면 본문 자체를 쓴다.
            const responseBody = response.data as any;
            const statusData = (responseBody?.data ?? responseBody) as any;

            // 세 상태를 명확히 구분한다.
            //   A. 인증 복원 성공      authenticated === true 이고 user 가 있다
            //   B. 서버가 미인증 확인  authenticated === false (명시적)
            //   C. 판정 불가           그 외(구조 이상 / boolean 아님 / true 인데 user 없음)
            //   C 에서는 캐시를 삭제하지 않는다 — 일시적 응답 이상으로 정상 세션을 파기하지 않기 위해.
            const isAuthenticatedFlag =
              typeof statusData?.authenticated === 'boolean' ? statusData.authenticated : null;

            if (isAuthenticatedFlag === true && statusData?.user) {
              // A. 인증 복원 성공
              const userWithDates = {
                ...statusData.user,
                createdAt: statusData.user.createdAt || new Date().toISOString(),
                updatedAt: statusData.user.updatedAt || new Date().toISOString()
              };
              if (hasSessionConflictMark()) {
                // 사용자 교체 표식이 남아 있다 — 명시적 재로그인 전에는 어떤 서버 세션도 채택하지 않는다.
                setUser(null);
              } else if (cachedUser && !sameUserId(cachedUser.id, userWithDates.id)) {
                // 캐시된 사용자와 서버 세션 사용자가 다르다 — 조용히 채택하지 않는다(§19-1).
                enterSessionConflict();
              } else {
                setUser(userWithDates);
              }
            } else if (isAuthenticatedFlag === false) {
              // B. 서버가 명시적으로 미인증이라고 확인 → 정상 로그아웃 (기존 동작 유지)
              setUser(null);
              localStorage.removeItem('admin-auth-storage');
            } else {
              // C. 판정 불가 — 세션 만료로 단정하지 않는다.
              //    캐시가 없으면 미인증 상태로 두되(무한 loading 방지), 캐시는 지우지 않는다.
              //    서버가 인증하지 않은 캐시로 보호 화면을 열지 않는다.
              if (!cachedUser) {
                setUser(null);
              }
            }
          } catch (apiError: any) {
            if (generation !== sessionGeneration.current) return;
            // API call failed - check if it's a definitive auth failure (401)
            // vs a transient network error
            if (apiError?.response?.status === 401) {
              // Definitive: server says unauthorized → clear cached user
              setUser(null);
              localStorage.removeItem('admin-auth-storage');
            } else if (!cachedUser) {
              setUser(null);
            }
            // Preserve the cache for account comparison on a later verified login.
          }
          setIsLoading(false);
        } else {
          const session = await authClient.checkSession();
          if (generation !== sessionGeneration.current) return;
          if (session.isAuthenticated && session.user && !hasSessionConflictMark()) {
            if (cachedUser && !sameUserId(cachedUser.id, session.user.id)) enterSessionConflict();
            else setUser(session.user as User);
          } else setUser(null);
          setIsLoading(false);
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
    // 초기 1회 판정 — enterSessionConflict 는 setState 만 쓰므로 재실행 트리거가 아니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authClient, ssoClient, strategy]);

  // 세션 도중 사용자 교체 감지(§19-1): 창으로 돌아올 때 `/auth/status` 사용자를 다시 대조한다.
  //   페이지 로드 때만 비교하면 새로고침 전까지 다른 사용자 권한으로 API 가 나간다.
  useEffect(() => {
    if (strategy !== 'cookie' || typeof window === 'undefined' || !user) return;
    let lastCheck = 0;
    const recheck = async () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastCheck < 5000) return;
      lastCheck = now;
      const generation = sessionGeneration.current;
      try {
        const response = await authClient.api.get('/auth/status');
        if (generation !== sessionGeneration.current) return;
        const body = response.data as any;
        const statusData = (body?.data ?? body) as any;
        if (statusData?.authenticated === true && statusData?.user && !sameUserId(statusData.user.id, user.id)) {
          enterSessionConflict();
        } else if (statusData?.authenticated === false) {
          setUser(null); localStorage.removeItem('admin-auth-storage');
        }
      } catch (failure) {
        if (generation === sessionGeneration.current && (failure as { response?: { status?: number } }).response?.status === 401) {
          setUser(null); localStorage.removeItem('admin-auth-storage');
        }
        // 판정 불가 — 기존 세션 처리(401 인터셉터 등)에 맡긴다
      }
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authClient, strategy, user?.id]);

  /** 로그인 응답 → 세션 채택(Google 로그인 단일 경로). */
  const adoptLoginResponse = (response: unknown) => {
    sessionGeneration.current += 1;
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
    // 명시적 로그인 성공 = 재인증 완료 → 사용자 교체 표식 해제
    clearSessionConflict();

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
  };

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: email+password login 은 은퇴했다.

  /**
   * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google ID token 로그인(admin 은 로그인만 — 가입은 서비스 화면에서).
   * 실패는 throw 로 전파한다(기존 login 계약과 동일). 호출부는 `err.response.data.code`
   * (GOOGLE_SIGNUP_REQUIRED · ACCOUNT_NOT_ACTIVE 등)로 안내를 나눈다.
   */
  const loginWithGoogle = async (idToken: string, serviceKey?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.loginWithGoogle(idToken, serviceKey ? { serviceKey } : undefined);
      adoptLoginResponse(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onAuthError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getGoogleAuthConfig = () => authClient.getGoogleAuthConfig();

  const logout = () => {
    sessionGeneration.current += 1;
    setIsLoading(false);
    void Promise.resolve(authClient.logout()).catch(() => {
      onAuthError?.('서버 세션 종료에 실패했습니다. 다시 로그인한 뒤 로그아웃을 시도해 주세요.');
    });
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
    clearSessionConflict();
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

  // Check both user.role and user.roles array for admin/operator access
  // Support both string roles and object roles with name field
  // Phase3-E: Support both unprefixed and domain-prefixed role names
  // WO-OPERATOR-FIX-V1: Include operator roles for dashboard access
  const isDashboardRole = (role: string): boolean => {
    const exactRoles = ['admin', 'administrator', 'super_admin', 'operator',
      'platform:super_admin'];
    if (exactRoles.includes(role)) return true;
    // Service-prefixed admin/operator roles (e.g., kpa:admin, neture:operator)
    if (role.includes(':') && (role.endsWith(':admin') || role.endsWith(':operator'))) return true;
    return false;
  };

  const isAdmin = user ? (
    // Check user.role (string)
    (user.role && isDashboardRole(user.role)) ||
    // Check user.activeRole.name (object)
    ((user as any).activeRole?.name && isDashboardRole((user as any).activeRole.name)) ||
    // Check user.roles array (can be strings or objects)
    (Array.isArray((user as any).roles) && (user as any).roles.some((r: any) =>
      typeof r === 'string'
        ? isDashboardRole(r)
        : r?.name && isDashboardRole(r.name)
    ))
  ) : false;

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isAdmin,
    authClient, // Expose authClient for API calls
    loginWithGoogle,
    getGoogleAuthConfig,
    logout,
    clearError,
    getSessionStatus,
    sessionConflict
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

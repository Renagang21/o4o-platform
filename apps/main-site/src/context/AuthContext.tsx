/**
 * AuthContext
 *
 * 사용자 인증 상태를 관리하는 전역 Context.
 * RBAC 권한 체크 기능을 포함합니다.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authClient, useRBAC, type MeResponse, type AuthResponse } from '@o4o/auth-client';

// 사용자 타입 (확장)
export interface User extends MeResponse {
  primaryOrganizationId?: string;
}

// Context 값 타입
export interface AuthContextValue {
  // 현재 사용자
  user: User | null;
  // 인증 상태
  isAuthenticated: boolean;
  // 로딩 상태
  isLoading: boolean;
  // 에러 상태
  error: string | null;
  // 로그인
  login: (email: string, password: string) => Promise<boolean>;
  // 로그아웃
  logout: () => Promise<void>;
  // 사용자 정보 새로고침
  refreshUser: () => Promise<void>;
  // RBAC 유틸리티
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
}

// Context 생성
const AuthContext = createContext<AuthContextValue | null>(null);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider
 *
 * 앱 전체에 인증 컨텍스트를 제공합니다.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // RBAC 훅
  const rbac = useRBAC(user);

  // 사용자 정보 로드
  const loadUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await authClient.api.get('/users/me');
      return response.data;
    } catch (err) {
      console.error('Failed to load user:', err);
      return null;
    }
  }, []);

  // 사용자 정보 새로고침
  const refreshUser = useCallback(async (): Promise<void> => {
    const userData = await loadUser();
    setUser(userData);
  }, [loadUser]);

  // 로그인
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.login({ email, password }) as AuthResponse;

      if (response.token) {
        // 토큰 저장
        localStorage.setItem('accessToken', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }

        // 사용자 정보 로드
        const userData = await loadUser();
        setUser(userData);

        return true;
      }

      setError('로그인에 실패했습니다.');
      return false;
    } catch (err: any) {
      const message = err.response?.data?.message || '로그인 중 오류가 발생했습니다.';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadUser]);

  // 로그아웃
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // 상태 초기화
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('selectedOrganizationId');
      setIsLoading(false);

      // 로그인 페이지로 이동
      navigate('/login');
    }
  }, [navigate]);

  // 권한 체크 함수
  const can = useCallback((permission: string): boolean => {
    return rbac.hasPermission(permission);
  }, [rbac]);

  // 역할 체크 함수
  const hasRole = useCallback((role: string): boolean => {
    return rbac.hasRole(role);
  }, [rbac]);

  // 초기 로드
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await loadUser();
        setUser(userData);
      } catch (err) {
        console.error('Auth init error:', err);
        // 토큰이 유효하지 않으면 제거
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadUser]);

  // Context 값 메모이제이션
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    can,
    hasRole,
    isAdmin: rbac.isAdmin,
  }), [user, isLoading, error, login, logout, refreshUser, can, hasRole, rbac.isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 *
 * AuthContext 사용을 위한 커스텀 훅
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * RequireAuth Component
 *
 * 인증이 필요한 페이지를 보호하는 컴포넌트
 */
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RequireAuth({
  children,
  fallback,
  redirectTo = '/login',
}: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 현재 경로를 저장해서 로그인 후 돌아올 수 있게 함
      navigate(redirectTo, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [isLoading, isAuthenticated, navigate, redirectTo, location.pathname]);

  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * RequirePermission Component
 *
 * 특정 권한이 필요한 UI를 보호하는 컴포넌트
 */
interface RequirePermissionProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
}

export function RequirePermission({
  children,
  permission,
  fallback = null,
}: RequirePermissionProps) {
  const { can } = useAuth();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * RequireRole Component
 *
 * 특정 역할이 필요한 UI를 보호하는 컴포넌트
 */
interface RequireRoleProps {
  children: ReactNode;
  role: string | string[];
  fallback?: ReactNode;
}

export function RequireRole({
  children,
  role,
  fallback = null,
}: RequireRoleProps) {
  const { hasRole } = useAuth();

  const roles = Array.isArray(role) ? role : [role];
  const hasAnyRole = roles.some(r => hasRole(r));

  if (!hasAnyRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Forbidden Component
 *
 * 권한이 없을 때 표시하는 컴포넌트
 */
export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
      <p className="text-gray-600 mb-6">
        이 페이지에 접근할 권한이 없습니다. 관리자에게 문의하세요.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        이전 페이지로
      </button>
    </div>
  );
}

export default AuthContext;

import { FC, createContext, useContext, useEffect, useState, ReactNode  } from 'react';

// HP-1: Toast System 전역화
import { useToast } from '@/hooks/useToast';

// P0 RBAC: cookieAuthClient 사용
import { cookieAuthClient } from '@o4o/auth-client';

// 공통 타입 import
import {
  User,
  UserRole,
  AuthContextType,
  UserPermissions,
  RoleAssignment
} from '../types/user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // R-3-1: Active role state management
  const [activeRole, setActiveRoleState] = useState<string | null>(null);

  // HP-1: Toast System
  const toast = useToast();

  // Stage 1 Hotfix: Detect if running in iframe
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // R-4-2: isAuthenticated check (active or approved status)
  const isAuthenticated = !!user && (user.status === 'active' || user.status === 'approved');

  // R-4-2: hasRole helper - checks active assignments (using isActive)
  const hasRole = (role: string): boolean => {
    return user?.assignments?.some(a => a.role === role && a.isActive) ?? false;
  };

  // R-3-1: Set active role with localStorage persistence
  const setActiveRole = (role: string | null) => {
    setActiveRoleState(role);
    if (role) {
      localStorage.setItem('activeRole', role);
    } else {
      localStorage.removeItem('activeRole');
    }
  };

  // R-4-2: Get available roles from assignments (using isActive)
  const getAvailableRoles = (): string[] => {
    return user?.assignments?.filter(a => a.isActive).map(a => a.role) ?? [];
  };

  // R-4-2: 로그인 - cookieAuthClient 사용 (MeResponse flat 구조)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // 1. 로그인 요청
      await cookieAuthClient.login({ email, password });

      // 2. /me 호출하여 사용자 정보 가져오기 (R-4-2: flat 구조)
      const meResponse = await cookieAuthClient.getCurrentUser();

      if (meResponse) {
        // R-4-2: meResponse is now flat structure (MeResponse)
        setUser(meResponse as any); // Type cast to User for backward compatibility

        // Set auth hint for future sessions
        localStorage.setItem('auth_session_hint', '1');

        toast.success('로그인되었습니다.');
        return true;
      } else {
        toast.error('사용자 정보를 가져올 수 없습니다.');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
      const errorCode = error.response?.data?.code;

      switch (errorCode) {
        case 'INVALID_CREDENTIALS':
          toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
          break;
        case 'ACCOUNT_PENDING':
          toast.warning('계정 승인 대기 중입니다. 관리자 승인 후 이용하실 수 있습니다.');
          break;
        case 'ACCOUNT_REJECTED':
          toast.error('계정이 거부되었습니다. 관리자에게 문의하세요.');
          break;
        case 'ACCOUNT_SUSPENDED':
          toast.error('계정이 정지되었습니다. 관리자에게 문의하세요.');
          break;
        default:
          toast.error(errorMessage);
      }
      return false;
    }
  };

  // P0 RBAC: 로그아웃 - cookieAuthClient 사용
  const logout = async () => {
    try {
      await cookieAuthClient.logout();
    } catch (error) {
      // Logout error handled silently
    } finally {
      setUser(null);
      // Clear auth hint
      localStorage.removeItem('auth_session_hint');
      toast.info('로그아웃되었습니다.');
    }
  };

  // 사용자 정보 업데이트
  const updateUser = (userData: Partial<User>) => {
    // Handle both update existing user AND set new user (for OAuth callback)
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    } else {
      // First login via OAuth - set user directly
      setUser(userData as User);
    }

    // CRITICAL: Set auth hint for session persistence (same as login function)
    localStorage.setItem('auth_session_hint', '1');
  };

  // R-4-2: 인증 상태 확인 - /me 기반 (MeResponse flat 구조)
  const checkAuthStatus = async (retryCount = 0) => {
    // CRITICAL: Skip ALL auth checks in iframe (no retries)
    // This prevents cross-origin auth calls from admin.neture.co.kr → neture.co.kr
    if (isInIframe) {
      setIsLoading(false);
      return;
    }

    // Skip API call if no auth session hint (prevents 401 on first visit)
    const hasAuthHint = typeof window !== 'undefined' && localStorage.getItem('auth_session_hint');

    if (!hasAuthHint) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    try {
      setIsLoading(true);

      // R-4-2: /me 호출하여 사용자 정보 가져오기 (flat 구조)
      const meResponse = await cookieAuthClient.getCurrentUser();

      if (meResponse) {
        // R-4-2: meResponse is now flat structure (MeResponse)
        setUser(meResponse as any); // Type cast to User for backward compatibility
      } else {
        setUser(null);
        // Clear hint if session is invalid
        localStorage.removeItem('auth_session_hint');
      }
    } catch (error: any) {
      // Auth check error handled silently
      setUser(null);
      // Clear hint on error
      localStorage.removeItem('auth_session_hint');
    } finally {
      setIsLoading(false);
    }
  };


  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // R-3-1: Initialize activeRole when user changes
  useEffect(() => {
    if (!user) {
      setActiveRole(null);
      return;
    }

    const availableRoles = getAvailableRoles();
    if (availableRoles.length === 0) {
      setActiveRole(null);
      return;
    }

    // Try to restore from localStorage
    const savedRole = localStorage.getItem('activeRole');
    if (savedRole && availableRoles.includes(savedRole)) {
      setActiveRole(savedRole);
      return;
    }

    // Default to first available role
    setActiveRole(availableRoles[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Listen for session expiry events from cookie-client
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSessionExpiry = (event: StorageEvent) => {
      if (event.key === 'auth-session-expired' && event.newValue) {
        // Session expired - clear user state
        setUser(null);
        localStorage.removeItem('auth_session_hint');

        // Show toast once
        toast.info('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');

        // Redirect to login with current URL as redirect param
        const currentPath = window.location.pathname + window.location.search;
        const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;

        // Small delay to ensure toast is visible
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      }
    };

    window.addEventListener('storage', handleSessionExpiry);

    return () => {
      window.removeEventListener('storage', handleSessionExpiry);
    };
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        checkAuthStatus,
        hasRole, // P0 RBAC: hasRole 추가
        activeRole, // R-3-1: activeRole 추가
        setActiveRole, // R-3-1: setActiveRole 추가
        getAvailableRoles, // R-3-1: getAvailableRoles 추가
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// AuthContext export
export { AuthContext };

// 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 권한 확인 훅 (P1: assignments 기반으로 수정)
export const usePermissions = (): UserPermissions => {
  const { user, hasRole } = useAuth();

  return {
    isAdmin: hasRole('admin') || hasRole('administrator') || hasRole('super_admin'),
    isManager: hasRole('manager'),
    isPartner: hasRole('partner'),
    isUser: hasRole('user') || hasRole('customer'),
    isManagerOrAdmin: hasRole('admin') || hasRole('administrator') || hasRole('super_admin') || hasRole('manager'),
    hasRole: (roles: UserRole[]) => roles.some(role => hasRole(role)),
    canAccessAdmin: hasRole('admin') || hasRole('administrator') || hasRole('super_admin') || hasRole('manager'),
  };
};

// 타입 재export (호환성)
export type { User, UserRole, AuthContextType, UserPermissions };

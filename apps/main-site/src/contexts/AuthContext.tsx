import { FC, createContext, useContext, useEffect, useState, ReactNode  } from 'react';
import toast from 'react-hot-toast';

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

  // Stage 1 Hotfix: Detect if running in iframe
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const isAuthenticated = !!user && user.status === 'approved';

  // P0 RBAC: hasRole helper - checks active assignments
  const hasRole = (role: string): boolean => {
    return user?.assignments?.some(a => a.role === role && a.active) ?? false;
  };

  // P0 RBAC: 로그인 - cookieAuthClient 사용
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // 1. 로그인 요청
      await cookieAuthClient.login({ email, password });

      // 2. /me 호출하여 사용자 정보 + assignments 가져오기
      const meResponse = await cookieAuthClient.getCurrentUser();

      if (meResponse) {
        setUser({
          ...meResponse.user,
          assignments: meResponse.assignments
        });
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
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      toast.info('로그아웃되었습니다.');
    }
  };

  // 사용자 정보 업데이트
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  // P0 RBAC: 인증 상태 확인 - /me 기반
  const checkAuthStatus = async (retryCount = 0) => {
    // CRITICAL: Skip ALL auth checks in iframe (no retries)
    // This prevents cross-origin auth calls from admin.neture.co.kr → neture.co.kr
    if (isInIframe) {
      console.warn('[AuthContext] Skipping auth check completely in iframe (cross-origin blocked)');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // /me 호출하여 사용자 정보 + assignments 가져오기
      const meResponse = await cookieAuthClient.getCurrentUser();

      if (meResponse) {
        setUser({
          ...meResponse.user,
          assignments: meResponse.assignments
        });
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

// 권한 확인 훅
export const usePermissions = (): UserPermissions => {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isPartner: user?.role === 'partner', 
    isUser: user?.role === 'user',
    isManagerOrAdmin: user?.role === 'admin' || user?.role === 'manager',
    hasRole: (roles: UserRole[]) => user ? roles.includes(user.role) : false,
    canAccessAdmin: user?.role === 'admin' || user?.role === 'manager',
  };
};

// 타입 재export (호환성)
export type { User, UserRole, AuthContextType, UserPermissions };

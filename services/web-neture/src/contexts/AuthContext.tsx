/**
 * AuthContext - 인증 및 역할 관리
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseAuthResponse, mapApiRoles, normalizeUser, resolveAuthError } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { authClient, api } from '../lib/apiClient';

// Re-export for consumers that import getAccessToken from AuthContext
export { getAccessToken };

export type UserRole = 'admin' | 'supplier' | 'partner' | 'seller' | 'operator' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  memberships?: { serviceKey: string; status: string }[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole; roles?: UserRole[] }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  supplier: '공급자',
  partner: '파트너',
  seller: '셀러',
  operator: '운영자',
  user: '사용자',
};

// WO-O4O-NETURE-ROUTE-UNIFICATION-BIG-SWITCH-V1: 역할별 대표 진입 경로
// admin + operator → 통합 /operator
const ROUTE_OVERRIDES: Record<string, string> = {
  admin: '/operator',
  operator: '/operator',
  supplier: '/supplier/dashboard',
  partner: '/partner/dashboard',
  seller: '/seller/overview',
};

// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: 서비스별 역할 매핑 테이블
const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  super_admin: 'admin',
  operator: 'operator',
  supplier: 'supplier',
  partner: 'partner',
  seller: 'seller',
  customer: 'user',
  user: 'user',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/auth/me');
        const data = response.data;
        const { user: apiUser } = parseAuthResponse(data);
        if (apiUser) {
          const roles = mapApiRoles(apiUser, ROLE_MAP, 'user' as UserRole);
          const base = normalizeUser(apiUser);
          const memberships = (apiUser as any).memberships || [];
          setUser({ ...base, roles, memberships });
        }
      } catch {
        // 세션 없음 - 정상
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole; roles?: UserRole[] }> => {
    try {
      setIsLoading(true);

      // WO-NETURE-OPERATOR-AUTH-SCOPE-COMPAT-FIX-V1: use authClient.login()
      // which stores tokens to localStorage (api.post() alone does not)
      const result = await authClient.login({ email, password });
      const apiUser = result.user as any;
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'user' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
        // WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1: 전체 roles 반환
        return { success: true, role: roles[0], roles };
      }

      return { success: false, error: '로그인 응답이 올바르지 않습니다.' };
    } catch (error: any) {
      const responseData = error?.response?.data;
      const status = error?.response?.status;

      if (responseData) {
        return { success: false, error: resolveAuthError(responseData, status) };
      }

      // CORS/네트워크 오류 vs 서버 오류 구분
      if (error instanceof TypeError || error?.code === 'ERR_NETWORK') {
        return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' };
      }
      return { success: false, error: '로그인에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // WO-O4O-AUTH-CLIENT-API-HARDENING-V1: authClient.logout() handles API call + token cleanup
    await authClient.logout();
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      const reordered = [role, ...user.roles.filter(r => r !== role)];
      setUser({ ...user, roles: reordered });
    }
  };

  const hasMultipleRoles = user ? user.roles.length > 1 : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
        hasMultipleRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { ROLE_LABELS, ROUTE_OVERRIDES };

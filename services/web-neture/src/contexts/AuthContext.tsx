/**
 * AuthContext - 인증 및 역할 관리
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefix 유지, mapApiRoles 제거
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseAuthResponse, normalizeUser, resolveAuthError, extractRoles } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { authClient, api } from '../lib/apiClient';

// Re-export for consumers that import getAccessToken from AuthContext
export { getAccessToken };

// WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1: dashboard config → config/dashboard.ts로 분리, 하위 호환 re-export
export { ROLE_LABELS, NETURE_ROLE_PRIORITY, NETURE_DASHBOARD_MAP, getNetureDashboardRoute } from '../config/dashboard';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role format
 * e.g., 'neture:admin', 'neture:operator', 'platform:super_admin'
 */
export type UserRole = string;

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
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          const roles = extractRoles(apiUser);
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

      const result = await authClient.login({ email, password });
      const apiUser = result.user as any;
      if (apiUser) {
        const roles = extractRoles(apiUser);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
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
    await authClient.logout();
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      const reordered = [role, ...user.roles.filter(r => r !== role)];
      setUser({ ...user, roles: reordered });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
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
        updateUser,
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


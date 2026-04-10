/**
 * AuthContext - K-Cosmetics 인증 및 역할 관리
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefix 유지, mapApiRoles 제거
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import { parseAuthResponse, normalizeUser, resolveAuthError, extractRoles } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { authClient, api } from '../lib/apiClient';

// Re-export for backward compatibility
export { getAccessToken };

// WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1: dashboard config → config/dashboard.ts로 분리, 하위 호환 re-export
export { ROLE_LABELS, KCOSMETICS_ROLE_PRIORITY, KCOSMETICS_DASHBOARD_MAP, getKCosmeticsDashboardRoute } from '../config/dashboard';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role format
 * e.g., 'k-cosmetics:admin', 'k-cosmetics:operator', 'platform:super_admin'
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
  isSessionChecked: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  checkSession: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // Lazy session check - only called when entering protected routes
  const checkSession = async () => {
    if (isSessionChecked) return; // Already checked

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
      setIsSessionChecked(true);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    try {
      setIsLoading(true);

      // WO-O4O-AUTH-TOKEN-STORAGE-HOTFIX-V1: use authClient.login()
      // which stores tokens to localStorage (api.post() alone does not)
      const result = await authClient.login({ email, password });
      const apiUser = result.user as any;
      if (apiUser) {
        const roles = extractRoles(apiUser);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
        setIsSessionChecked(true);
        return { success: true, role: roles[0] };
      }

      return { success: false, error: '로그인 응답이 올바르지 않습니다.' };
    } catch (error: any) {
      const errData = error?.response?.data;
      if (errData) {
        return { success: false, error: resolveAuthError(errData, error?.response?.status) };
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
      setUser({ ...user, roles: [role, ...user.roles.filter(r => r !== role)] });
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
        isSessionChecked,
        login,
        logout,
        switchRole,
        hasMultipleRoles,
        checkSession,
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

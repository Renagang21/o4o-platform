/**
 * AuthContext - 인증 및 역할 관리
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefix 유지, mapApiRoles 제거
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   세션 복구 · 토큰 정리 이벤트 · login/logout/logoutAll 은 @o4o/auth-react 의 useServiceAuth 로 이동.
 *   이 파일에는 **Neture 고유분**만 남는다 — serviceKey/user 변환 주입 + 역할 전환 UI 상태.
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { buildPlatformUser } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { useServiceAuth, type AuthLoginResult } from '@o4o/auth-react';
import { authClient, api } from '../lib/apiClient';

// Re-export for consumers that import getAccessToken from AuthContext
export { getAccessToken };

// WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1: dashboard config → config/dashboard.ts로 분리, 하위 호환 re-export
export { ROLE_LABELS, NETURE_ROLE_PRIORITY, NETURE_DASHBOARD_MAP, getNetureDashboardRoute, getNetureRoleLabel } from '../config/dashboard';

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

/** 기존 호출부 계약 보존 — success 시 role/roles 도 함께 준다. */
type NetureLoginResult = AuthLoginResult<User> & { role?: UserRole; roles?: UserRole[] };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<NetureLoginResult>;
  logout: () => void;
  logoutAll: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // WO-...-COMMONIZATION-V1: Core 는 공통 인증 상태·행동만. Neture 차이는 아래 주입값이 전부다.
  const core = useServiceAuth<User>(
    useMemo(
      () => ({
        // canonical service key (service_memberships.service_key). role prefix 가 아니다.
        serviceKey: 'neture',
        authClient,
        getAccessToken,
        toUser: (apiUser) => buildPlatformUser(apiUser as never) as User,
      }),
      [],
    ),
  );

  const { user, setUser } = core;

  const login = async (email: string, password: string): Promise<NetureLoginResult> => {
    const result = await core.login(email, password);
    if (result.success && result.user) {
      return { ...result, role: result.user.roles[0], roles: result.user.roles };
    }
    return result;
  };

  const logoutAll = async () => {
    // Neture 는 기존에 로컬 user 를 비우지 않고 서버 호출만 했다 — 동작 보존.
    await api.post('/auth/logout-all');
  };

  const switchRole = (role: UserRole) => {
    setUser((prev) => {
      if (!prev || !prev.roles.includes(role)) return prev;
      return { ...prev, roles: [role, ...prev.roles.filter((r) => r !== role)] };
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const hasMultipleRoles = user ? user.roles.length > 1 : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: core.isAuthenticated,
        isLoading: core.isLoading,
        login,
        logout: core.logout,
        logoutAll,
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

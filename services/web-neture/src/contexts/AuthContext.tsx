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

import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { buildPlatformUser } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { useServiceAuth, useRoleSelection, type AuthLoginResult } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';

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
        // 기존 동작 보존: 서버 호출만 하고 로컬 user 는 비우지 않는다.
        clearSessionOnLogoutAll: false,
      }),
      [],
    ),
  );

  const { user } = core;

  /**
   * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1 §4·§8
   *
   * 대표 로그아웃 뒤 개인화 화면이 남지 않도록 두 경로에서 인증 상태를 실제 토큰으로 다시 맞춘다.
   *   - bfcache 복원(pageshow persisted): 뒤로가기로 되살아난 화면은 토큰이 없으면 비로그인으로.
   *   - 다른 같은-origin 탭의 로그아웃/로그인(storage 이벤트: 토큰 키 변경 · clear).
   * refresh() 는 토큰이 없으면 user=null, 있으면 /auth/me 로 재확인한다(기존 Core 동작 재사용).
   */
  const { refresh } = core;
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'o4o_accessToken') void refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  // 역할 전환·부분 갱신은 3서비스 동일 구현이었다 → 공통 Core(useRoleSelection).
  const { switchRole, updateUser, hasMultipleRoles } = useRoleSelection(core);

  const login = async (email: string, password: string): Promise<NetureLoginResult> => {
    const result = await core.login(email, password);
    if (result.success && result.user) {
      return { ...result, role: result.user.roles[0], roles: result.user.roles };
    }
    return result;
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: core.isAuthenticated,
        isLoading: core.isLoading,
        login,
        logout: core.logout,
        logoutAll: core.logoutAll,
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

/**
 * AuthContext - K-Cosmetics 인증 및 역할 관리
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefix 유지, mapApiRoles 제거
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   세션 복구 · 토큰 정리 이벤트 · login/logout/logoutAll 은 @o4o/auth-react 의 useServiceAuth 로 이동.
 *   K-Cosmetics 고유분(lazy session check 계약)만 남는다.
 */

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { buildPlatformUser } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { useServiceAuth, useRoleSelection, type AuthLoginResult } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';

// Re-export for backward compatibility
export { getAccessToken };

// WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1: dashboard config → config/dashboard.ts로 분리, 하위 호환 re-export
export { ROLE_LABELS, KCOSMETICS_ROLE_PRIORITY, KCOSMETICS_DASHBOARD_MAP, getKCosmeticsDashboardRoute } from '../config/dashboard';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role format
 * e.g., 'cosmetics:admin', 'cosmetics:operator', 'platform:super_admin'
 */
export type UserRole = string;

export interface User {
  id: string;
  email: string;
  name: string;
  /** WO-FORUM-NICKNAME-UNIFICATION-V1: 포럼 공개 표시명 */
  nickname?: string;
  phone?: string;
  roles: UserRole[];
  memberships?: { serviceKey: string; status: string }[];
}

/** 기존 호출부 계약 보존 — success 시 role/roles 도 함께 준다. */
type KCosLoginResult = AuthLoginResult<User> & { role?: UserRole; roles?: UserRole[] };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionChecked: boolean;
  login: (email: string, password: string) => Promise<KCosLoginResult>;
  logout: () => void;
  logoutAll: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  checkSession: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const core = useServiceAuth<User>(
    useMemo(
      () => ({
        // canonical service key — role prefix('cosmetics')가 아니라 service_memberships.service_key.
        serviceKey: 'k-cosmetics',
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
  // 역할 전환·부분 갱신은 3서비스 동일 구현이었다 → 공통 Core(useRoleSelection).
  const { switchRole, updateUser, hasMultipleRoles } = useRoleSelection(core);

  // WO-O4O-STORE-OWNER-GUARD-CHECKSESSION-FIX-V1 계약 보존:
  //   RoleGuard 가 lazy 로 checkSession() 을 부르되 중복 호출은 하지 않는다.
  //   Core 가 mount 시 1회 세션 복구를 수행하므로, 그 완료를 isSessionChecked 로 노출한다.
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const isSessionCheckedRef = useRef(false);
  // Core 의 mount 세션 복구가 진행 중인지 — 자식(RoleGuard) effect 는 부모 effect 보다 먼저 돈다.
  // isSessionCheckedRef 는 복구가 "끝난 뒤"에야 true 가 되므로, 진행 중 여부는 별도로 본다.
  const coreIsLoadingRef = useRef(core.isLoading);
  coreIsLoadingRef.current = core.isLoading;
  useEffect(() => {
    if (!core.isLoading && !isSessionCheckedRef.current) {
      isSessionCheckedRef.current = true;
      setIsSessionChecked(true);
    }
  }, [core.isLoading]);

  const checkSession = useCallback(async () => {
    if (isSessionCheckedRef.current) return; // 기존 dedup 계약
    // mount 세션 복구가 in-flight → 같은 mount 에서 /auth/me 가 2회 나가지 않게 한다.
    // 복구가 끝나면 isSessionChecked 가 true 로 바뀌고 RoleGuard effect 가 재실행되어 정상 skip 된다.
    if (coreIsLoadingRef.current) return;
    await core.refresh();
  }, [core.refresh]);

  const login = async (email: string, password: string): Promise<KCosLoginResult> => {
    const result = await core.login(email, password);
    if (result.success && result.user) {
      isSessionCheckedRef.current = true;
      setIsSessionChecked(true);
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
        isSessionChecked,
        login,
        logout: core.logout,
        logoutAll: core.logoutAll,
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

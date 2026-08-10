/**
 * AuthContext - GlycoPharm 인증 및 역할 관리
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * - authClient.api (Axios) 경유 -> 401 자동 갱신
 * - localStorage 전략 (o4o_accessToken / o4o_refreshToken)
 */

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { normalizeUser, extractRoles, normalizeMemberships, AUTH_TOKEN_CLEARED_EVENT } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
// WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
import { useServiceAuth, type AuthLoginResult } from '@o4o/auth-react';
import { authClient, api } from '../lib/apiClient';
// Re-export for backward compatibility (API files, pages 등에서 import)
export { getAccessToken } from '@o4o/auth-client';

// Re-export UserRole for use by other components
export type { UserRole } from '@/types';

// ============================================================================
// Phase 2: Service User 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
// ============================================================================

// Service User types
export interface ServiceUser {
  providerUserId: string;
  provider: 'google' | 'kakao' | 'naver';
  email: string;
  displayName?: string;
  profileImage?: string;
  serviceId: string;
  storeId?: string;
}

export interface ServiceLoginCredentials {
  provider: 'google' | 'kakao' | 'naver';
  oauthToken: string; // OAuth profile JSON for Phase 1 testing
  serviceId: string;
  storeId?: string;
}

// Service User token storage keys (Phase 2: WO-AUTH-SERVICE-IDENTITY-PHASE2)
const SERVICE_ACCESS_TOKEN_KEY = 'glycopharm_service_access_token';
const SERVICE_REFRESH_TOKEN_KEY = 'glycopharm_service_refresh_token';

// Service User token management
function storeServiceTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(SERVICE_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(SERVICE_REFRESH_TOKEN_KEY, refreshToken);
}

function clearServiceTokens() {
  localStorage.removeItem(SERVICE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(SERVICE_REFRESH_TOKEN_KEY);
}

// Export for use in Service API clients
export function getServiceAccessToken(): string | null {
  return localStorage.getItem(SERVICE_ACCESS_TOKEN_KEY);
}

interface AuthContextType {
  // Platform User
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthLoginResult<User>>;
  logout: () => void;
  logoutAll: () => Promise<void>;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  availableRoles: UserRole[];
  updateUser: (updates: Partial<User>) => void;
  // Phase 2: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  serviceUser: ServiceUser | null;
  isServiceUserAuthenticated: boolean;
  serviceUserLogin: (credentials: ServiceLoginCredentials) => Promise<void>;
  serviceUserLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1: dashboard config → config/dashboard.ts로 분리, 하위 호환 re-export
export { GLYCOPHARM_ROLE_PRIORITY, GLYCOPHARM_DASHBOARD_MAP, getGlycopharmDashboardRoute } from '../config/dashboard';

// WO-O4O-GLYCOPHARM-MENU-KPA-ALIGNMENT-V1: role-constants.ts로 분리, 하위 호환 re-export
export { GLYCOPHARM_ROLES, isPharmacistRole, ROLE_LABELS, ROLE_ICONS } from '../lib/role-constants';

export function AuthProvider({ children }: { children: ReactNode }) {
  // 토큰이 있으면 세션 확인 필요, 없으면 바로 로딩 완료
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

  // Phase 2: Service User state (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  const [serviceUser, setServiceUser] = useState<ServiceUser | null>(null);

  // WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
  //   세션 복구·로그인/로그아웃·토큰 정리 이벤트는 공통 Core 가 수행한다.
  //   GlycoPharm 차이는 user 변환(status 기본값 'approved' 포함)과 availableRoles 파생뿐이다.
  const core = useServiceAuth<User>(
    useMemo(
      () => ({
        serviceKey: 'glycopharm', // canonical == role prefix (self-map)
        authClient,
        getAccessToken,
        toUser: (apiUser: Record<string, unknown>) =>
          ({
            ...apiUser,
            ...normalizeUser(apiUser as never),
            roles: extractRoles(apiUser as never, []),
            memberships: normalizeMemberships(apiUser as never),
            status: (apiUser.status as string) || 'approved',
          }) as User,
        onAuthenticated: (u) => setAvailableRoles(u.roles as UserRole[]),
      }),
      [],
    ),
  );

  const { user, setUser } = core;

  /**
   * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
   *   기존 login 은 성공 시 User 반환 / 실패 시 code 를 붙인 Error 를 throw 했다.
   *   공통 계약(result object)으로 통일한다 — 호출부(LoginModal/LoginPage/ServiceLoginPage)도 함께 수정.
   *   `resolveAuthError` 한국어 메시지와 `code` 전달은 Core 가 동일하게 수행하므로 문구 변화 없음.
   */
  const login = core.login;

  const logout = async () => {
    await core.logout();
    setAvailableRoles([]);
  };

  const logoutAll = async () => {
    // 기존 동작 보존: 서버 호출만 하고 로컬 user 는 비우지 않는다.
    await api.post('/auth/logout-all');
  };

  const selectRole = (role: UserRole) => {
    setUser((prev) => {
      if (!prev || !availableRoles.includes(role)) return prev;
      return { ...prev, roles: [role, ...prev.roles.filter((r) => r !== role)] };
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const switchRole = selectRole;
  const hasMultipleRoles = availableRoles.length > 1;

  // WO-O4O-AUTH-TOKEN-CLEARED-UNIFICATION-V1: 토큰 갱신 실패 시 stale auth 정리
  useEffect(() => {
    const handleTokenCleared = () => { setUser(null); setAvailableRoles([]); };
    window.addEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
    return () => window.removeEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
  }, []);

  // ============================================================================
  // Phase 2: Service User Login (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  // ============================================================================

  /**
   * Service User 로그인
   *
   * Phase 1 API 기반: /api/v1/auth/service/login
   * Service User는 Platform User와 완전히 분리됨
   */
  const serviceUserLogin = async (credentials: ServiceLoginCredentials) => {
    const response = await api.post('/auth/service/login', { credentials });
    const data = response.data;

    // Service JWT 저장 (tokenType: 'service')
    const tokens = data.tokens;
    if (tokens?.accessToken && tokens?.refreshToken) {
      storeServiceTokens(tokens.accessToken, tokens.refreshToken);
    }

    // Service User 상태 설정
    const serviceUserData: ServiceUser = {
      providerUserId: data.user.providerUserId,
      provider: data.user.provider,
      email: data.user.email,
      displayName: data.user.displayName,
      profileImage: data.user.profileImage,
      serviceId: data.user.serviceId,
      storeId: data.user.storeId,
    };

    setServiceUser(serviceUserData);
  };

  /**
   * Service User 로그아웃
   */
  const serviceUserLogout = () => {
    clearServiceTokens();
    setServiceUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        // Platform User
        user,
        isAuthenticated: core.isAuthenticated,
        isLoading: core.isLoading,
        login,
        logout,
        logoutAll,
        selectRole,
        switchRole,
        hasMultipleRoles,
        availableRoles,
        updateUser,
        // Phase 2: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
        serviceUser,
        isServiceUserAuthenticated: !!serviceUser,
        serviceUserLogin,
        serviceUserLogout,
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

/**
 * AuthContext — Pharmacy-Hub
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 기존 서비스와 동일 계약:
 *   - authClient.login({ email, password, serviceKey }) → backend 가 service_memberships 검증
 *   - 미가입자는 401 SERVICE_NOT_MEMBER 로 차단 (자동 편입 없음)
 *   - 세션 복구는 GET /auth/me
 *
 * Foundation 범위이므로 역할 선택/전환 UI 는 넣지 않는다 (후속 WO).
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  normalizeUser,
  normalizeMemberships,
  extractRoles,
  type UserLike,
} from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
// WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
import { useServiceAuth, type AuthLoginResult } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';
import { SERVICE_KEY } from '../config/service';

export interface PharmacyHubUser extends UserLike {
  id?: string;
  email?: string;
  name?: string;
}

interface AuthContextValue {
  user: PharmacyHubUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthLoginResult<PharmacyHubUser>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(apiUser: Record<string, unknown>): PharmacyHubUser {
  return {
    ...apiUser,
    ...normalizeUser(apiUser as never),
    roles: extractRoles(apiUser as never, []),
    memberships: normalizeMemberships(apiUser as never),
  } as PharmacyHubUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
   *   Pharmacy-Hub 는 제한형 서비스라 Core 계약 그대로면 충분하다(고유 확장 없음).
   *   기존 login 은 throw 방식이었으나 공통 계약(result object)으로 통일한다.
   */
  const core = useServiceAuth<PharmacyHubUser>(
    useMemo(
      () => ({
        // config/service.ts 의 canonical service key 를 그대로 쓴다.
        serviceKey: SERVICE_KEY,
        authClient,
        getAccessToken,
        toUser: (apiUser) => toUser(apiUser),
      }),
      [],
    ),
  );

  return (
    <AuthContext.Provider
      value={{
        user: core.user,
        isAuthenticated: core.isAuthenticated,
        isLoading: core.isLoading,
        login: core.login,
        logout: () => { void core.logout(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

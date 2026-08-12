/**
 * AuthContext — KPA Branch
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 기존 O4O auth 계약을 그대로 재사용한다 (신규 인증 구조 금지):
 *   - authClient.login({ email, password, serviceKey }) → backend 가 service_memberships 검증
 *   - 세션 복구는 GET /auth/me
 *   - 공통 훅 `useServiceAuth` (@o4o/auth-react) 사용
 *
 * 이 컨텍스트는 **서비스 축**(가입/역할)만 다룬다. 분회 축(어느 분회 소속인가)은
 * branch_memberships 기반이며 `useBranchTenant` / `/me/branch` 로 별도 조회한다.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  normalizeUser,
  normalizeMemberships,
  extractRoles,
  type UserLike,
} from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { useServiceAuth, type AuthLoginResult } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';
import { SERVICE_KEY } from '../config/service';

export interface BranchUser extends UserLike {
  id?: string;
  email?: string;
  name?: string;
}

interface AuthContextValue {
  user: BranchUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthLoginResult<BranchUser>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(apiUser: Record<string, unknown>): BranchUser {
  return {
    ...apiUser,
    ...normalizeUser(apiUser as never),
    roles: extractRoles(apiUser as never, []),
    memberships: normalizeMemberships(apiUser as never),
  } as BranchUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const core = useServiceAuth<BranchUser>(
    useMemo(
      () => ({
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
        logout: () => {
          void core.logout();
        },
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

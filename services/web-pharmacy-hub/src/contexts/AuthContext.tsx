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

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  parseAuthResponse,
  normalizeUser,
  normalizeMemberships,
  extractRoles,
  resolveAuthError,
  type UserLike,
} from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { authClient, api } from '../lib/apiClient';
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
  login: (email: string, password: string) => Promise<PharmacyHubUser>;
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
  const [user, setUser] = useState<PharmacyHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!getAccessToken()) {
          setIsLoading(false);
          return;
        }
        const response = await api.get('/auth/me');
        const { user: apiUser } = parseAuthResponse(response.data);
        if (apiUser) setUser(toUser(apiUser as Record<string, unknown>));
      } catch {
        // 세션 없음 또는 refresh 실패 — 정상 (비로그인 상태로 진행)
      } finally {
        setIsLoading(false);
      }
    };
    void checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await authClient.login({ email, password, serviceKey: SERVICE_KEY });
      const apiUser = result.user as Record<string, unknown> | undefined;
      if (!apiUser) throw new Error('로그인 응답이 올바르지 않습니다.');
      const typed = toUser(apiUser);
      setUser(typed);
      return typed;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { code?: string }; status?: number } };
      const data = err.response?.data;
      if (data) {
        const wrapped = new Error(
          resolveAuthError(data, err.response?.status ?? 0),
        ) as Error & { code?: string };
        if (typeof data.code === 'string') wrapped.code = data.code;
        throw wrapped;
      }
      throw new Error('로그인에 실패했습니다.');
    }
  };

  const logout = () => {
    void authClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

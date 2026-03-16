/**
 * AuthContext - GlycoPharm 인증 및 역할 관리
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * - authClient.api (Axios) 경유 -> 401 자동 갱신
 * - localStorage 전략 (o4o_accessToken / o4o_refreshToken)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { parseAuthResponse, mapApiRoles, normalizeUser, resolveAuthError } from '@o4o/auth-utils';
import { getAccessToken, clearAllTokens } from '@o4o/auth-client';
import { api } from '../lib/apiClient';

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
  login: (email: string, password: string) => Promise<User>;
  passwordSync: (email: string, syncToken: string, newPassword: string) => Promise<User>;
  logout: () => void;
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

// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: 서비스별 역할 매핑 테이블
const ROLE_MAP: Record<string, UserRole> = {
  pharmacy: 'pharmacy',
  seller: 'pharmacy',
  customer: 'pharmacy',
  user: 'pharmacy',
  admin: 'admin',
  super_admin: 'admin',
  operator: 'operator',
  supplier: 'supplier',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  pharmacy: '약국',
  supplier: '공급자',
  operator: '운영자',
  consumer: '소비자',
};


export const ROLE_ICONS: Record<UserRole, string> = {
  admin: '👑',
  pharmacy: '💊',
  supplier: '📦',
  operator: '🛡️',
  consumer: '👤',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // 토큰이 있으면 세션 확인 필요, 없으면 바로 로딩 완료
  const [isLoading, setIsLoading] = useState(() => !!getAccessToken());
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

  // Phase 2: Service User state (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  const [serviceUser, setServiceUser] = useState<ServiceUser | null>(null);

  // authClient.api 기반 세션 확인 — 401 시 자동 refresh
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await api.get('/auth/me');
        const data = response.data;
        const { user: apiUser } = parseAuthResponse(data);
        if (apiUser) {
          const mappedRoles = mapApiRoles(apiUser, ROLE_MAP, 'consumer' as UserRole);
          const base = normalizeUser(apiUser);
          const userData: User = {
            ...apiUser,
            ...base,
            roles: mappedRoles,
            memberships: (apiUser as any).memberships || [],
            status: (apiUser.status as string) || 'approved',
          } as User;
          setUser(userData);
          setAvailableRoles(mappedRoles);
        }
      } catch {
        // 세션 없음 또는 refresh 실패 — 정상
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    // Axios 기반 로그인 — 401 자동 갱신 지원
    try {
      const response = await api.post('/auth/login', { email, password, includeLegacyTokens: true });
      const data = response.data;

      // Token 저장 (authClient interceptor가 이후 자동 갱신)
      if (data.data?.tokens?.accessToken) {
        localStorage.setItem('o4o_accessToken', data.data.tokens.accessToken);
      }
      if (data.data?.tokens?.refreshToken) {
        localStorage.setItem('o4o_refreshToken', data.data.tokens.refreshToken);
      }

      const { user: apiUser } = parseAuthResponse(data);

      if (apiUser) {
        const mappedRoles = mapApiRoles(apiUser, ROLE_MAP, 'consumer' as UserRole);
        const base = normalizeUser(apiUser);
        const typedUser: User = {
          ...apiUser,
          ...base,
          roles: mappedRoles,
          memberships: (apiUser as any).memberships || [],
          status: (apiUser.status as string) || 'approved',
        } as User;

        setUser(typedUser);
        setAvailableRoles(mappedRoles);
        return typedUser;
      }

      throw new Error('로그인 응답이 올바르지 않습니다.');
    } catch (error: any) {
      // Axios는 non-2xx 시 throw — error.response.data로 서버 에러 접근
      const data = error.response?.data;
      if (data?.code === 'PASSWORD_MISMATCH' && data?.passwordSyncAvailable) {
        const err = new Error(data.error || '비밀번호가 일치하지 않습니다.');
        (err as any).passwordSyncAvailable = true;
        (err as any).syncToken = data.syncToken;
        throw err;
      }
      if (data) {
        throw new Error(resolveAuthError(data, error.response?.status));
      }
      throw new Error('로그인에 실패했습니다.');
    }
  };

  const passwordSync = async (email: string, syncToken: string, newPassword: string): Promise<User> => {
    try {
      const response = await api.post('/auth/password-sync', { email, syncToken, newPassword });
      const data = response.data;

      // Token 저장
      if (data.data?.tokens?.accessToken) {
        localStorage.setItem('o4o_accessToken', data.data.tokens.accessToken);
      }
      if (data.data?.tokens?.refreshToken) {
        localStorage.setItem('o4o_refreshToken', data.data.tokens.refreshToken);
      }

      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const mappedRoles = mapApiRoles(apiUser, ROLE_MAP, 'consumer' as UserRole);
        const base = normalizeUser(apiUser);
        const typedUser: User = {
          ...apiUser,
          ...base,
          roles: mappedRoles,
          memberships: (apiUser as any).memberships || [],
          status: (apiUser.status as string) || 'approved',
        } as User;
        setUser(typedUser);
        setAvailableRoles(mappedRoles);
        return typedUser;
      }
      throw new Error('응답이 올바르지 않습니다.');
    } catch (error: any) {
      const msg = error.response?.data?.error;
      throw new Error(msg || error.message || '비밀번호 변경에 실패했습니다.');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // 로그아웃 실패해도 로컬 상태 정리
    }
    clearAllTokens();
    setUser(null);
    setAvailableRoles([]);
  };

  const selectRole = (role: UserRole) => {
    if (user && availableRoles.includes(role)) {
      const reordered = [role, ...user.roles.filter(r => r !== role)];
      setUser({ ...user, roles: reordered });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const switchRole = selectRole;
  const hasMultipleRoles = availableRoles.length > 1;

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
        isAuthenticated: !!user,
        isLoading,
        login,
        passwordSync,
        logout,
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

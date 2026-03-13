/**
 * AuthContext - 인증 및 역할 관리
 * httpOnly Cookie 기반 인증
 *
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseAuthResponse, mapApiRoles, normalizeUser, resolveAuthError } from '@o4o/auth-utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export type UserRole = 'admin' | 'supplier' | 'partner' | 'seller' | 'operator' | 'user';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole; passwordSyncAvailable?: boolean; syncToken?: string }>;
  passwordSync: (email: string, syncToken: string, newPassword: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  supplier: '공급자',
  partner: '파트너',
  seller: '셀러',
  operator: '운영자',
  user: '사용자',
};

const ROUTE_OVERRIDES: Record<string, string> = {
  admin: '/workspace/admin',
  operator: '/workspace/operator',
  supplier: '/account/supplier',
  partner: '/account/partner',
  seller: '/seller/overview',
};

// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: 서비스별 역할 매핑 테이블
const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  super_admin: 'admin',
  operator: 'operator',
  supplier: 'supplier',
  partner: 'partner',
  seller: 'seller',
  customer: 'user',
  user: 'user',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // httpOnly Cookie 기반 세션 확인
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const { user: apiUser } = parseAuthResponse(data);
          if (apiUser) {
            const roles = mapApiRoles(apiUser, ROLE_MAP, 'user' as UserRole);
            const base = normalizeUser(apiUser);
            const memberships = (apiUser as any).memberships || [];
            setUser({ ...base, roles, memberships });
          }
        }
      } catch {
        // 세션 없음 - 정상
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole; passwordSyncAvailable?: boolean; syncToken?: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PASSWORD_MISMATCH' && data.passwordSyncAvailable) {
          return { success: false, error: data.error, passwordSyncAvailable: true, syncToken: data.syncToken };
        }
        return { success: false, error: resolveAuthError(data, response.status) };
      }

      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'user' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
        return { success: true, role: roles[0] };
      }

      return { success: false, error: '로그인 응답이 올바르지 않습니다.' };
    } catch (error) {
      // CORS/네트워크 오류 vs 서버 오류 구분
      if (error instanceof TypeError) {
        return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' };
      }
      return { success: false, error: '로그인에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  };

  const passwordSync = async (email: string, syncToken: string, newPassword: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/password-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, syncToken, newPassword }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || '비밀번호 변경에 실패했습니다.' };
      }
      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'user' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
        return { success: true, role: roles[0] };
      }
      return { success: false, error: '응답이 올바르지 않습니다.' };
    } catch {
      return { success: false, error: '비밀번호 변경에 실패했습니다.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // 로그아웃 실패해도 로컬 상태 정리
    }
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      const reordered = [role, ...user.roles.filter(r => r !== role)];
      setUser({ ...user, roles: reordered });
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
        passwordSync,
        logout,
        switchRole,
        hasMultipleRoles,
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

export { ROLE_LABELS, ROUTE_OVERRIDES };

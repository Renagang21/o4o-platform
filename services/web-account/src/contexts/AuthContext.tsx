/**
 * AuthContext - Account Center 인증 컨텍스트
 * httpOnly Cookie 기반 인증 (web-neture 패턴)
 *
 * WO-O4O-ACCOUNT-CENTER-UI-V1
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
            const memberships = (apiUser as Record<string, unknown>).memberships as User['memberships'] || [];
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

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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
        return { success: false, error: resolveAuthError(data, response.status) };
      }

      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'user' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as Record<string, unknown>).memberships as User['memberships'] || [];
        setUser({ ...base, roles, memberships });
        return { success: true };
      }

      return { success: false, error: '로그인 응답이 올바르지 않습니다.' };
    } catch (error) {
      if (error instanceof TypeError) {
        return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' };
      }
      return { success: false, error: '로그인에 실패했습니다.' };
    } finally {
      setIsLoading(false);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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

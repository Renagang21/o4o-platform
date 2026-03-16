/**
 * AuthContext - K-Cosmetics 인증 및 역할 관리
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import { parseAuthResponse, mapApiRoles, normalizeUser, resolveAuthError } from '@o4o/auth-utils';
import { getAccessToken, clearAllTokens } from '@o4o/auth-client';
import { api } from '../lib/apiClient';

// Re-export for backward compatibility
export { getAccessToken };

export type UserRole = 'admin' | 'supplier' | 'seller' | 'partner' | 'operator';

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
  isSessionChecked: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole; passwordSyncAvailable?: boolean; syncToken?: string }>;
  passwordSync: (email: string, syncToken: string, newPassword: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  supplier: '공급자',
  seller: '판매자',
  partner: '파트너',
  operator: '운영자',
};


// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: 서비스별 역할 매핑 테이블
const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  super_admin: 'admin',
  operator: 'operator',
  supplier: 'supplier',
  seller: 'seller',
  partner: 'partner',
  customer: 'seller',
  user: 'seller',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // Lazy session check - only called when entering protected routes
  const checkSession = async () => {
    if (isSessionChecked) return; // Already checked

    setIsLoading(true);
    try {
      const response = await api.get('/auth/me');
      const data = response.data;
      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'seller' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
      }
    } catch {
      // 세션 없음 - 정상
    } finally {
      setIsLoading(false);
      setIsSessionChecked(true);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole; passwordSyncAvailable?: boolean; syncToken?: string }> => {
    try {
      setIsLoading(true);

      const response = await api.post('/auth/login', { email, password, includeLegacyTokens: true });
      const data = response.data;

      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'seller' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
        setIsSessionChecked(true);
        return { success: true, role: roles[0] };
      }

      return { success: false, error: data.message || data.error || '로그인 응답이 올바르지 않습니다.' };
    } catch (error: any) {
      // Handle PASSWORD_MISMATCH from error response
      const errData = error?.response?.data;
      if (errData?.code === 'PASSWORD_MISMATCH' && errData?.passwordSyncAvailable) {
        return { success: false, error: errData.error, passwordSyncAvailable: true, syncToken: errData.syncToken };
      }
      if (errData) {
        return { success: false, error: resolveAuthError(errData, error?.response?.status) };
      }
      return { success: false, error: '로그인에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  };

  const passwordSync = async (email: string, syncToken: string, newPassword: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    try {
      const response = await api.post('/auth/password-sync', { email, syncToken, newPassword });
      const data = response.data;
      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'seller' as UserRole);
        const base = normalizeUser(apiUser);
        const memberships = (apiUser as any).memberships || [];
        setUser({ ...base, roles, memberships });
        setIsSessionChecked(true);
        return { success: true, role: roles[0] };
      }
      return { success: false, error: '응답이 올바르지 않습니다.' };
    } catch {
      return { success: false, error: '비밀번호 변경에 실패했습니다.' };
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
  };

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      setUser({ ...user, roles: [role, ...user.roles.filter(r => r !== role)] });
    }
  };

  const hasMultipleRoles = user ? user.roles.length > 1 : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSessionChecked,
        login,
        passwordSync,
        logout,
        switchRole,
        hasMultipleRoles,
        checkSession,
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

export { ROLE_LABELS };

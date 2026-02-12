/**
 * AuthContext - 인증 및 역할 관리
 * httpOnly Cookie 기반 인증
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export type UserRole = 'admin' | 'supplier' | 'partner' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  currentRole: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  supplier: '공급자',
  partner: '파트너',
  user: '사용자',
};

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/workspace/admin',
  supplier: '/workspace/supplier/dashboard',
  partner: '/workspace/partner',
  user: '/',
};

// API 역할을 web 역할로 매핑
function mapApiRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'admin': 'admin',
    'super_admin': 'admin',
    'supplier': 'supplier',
    'partner': 'partner',
    'seller': 'user',
    'customer': 'user',
    'user': 'user',
  };
  return roleMap[apiRole] || 'user';
}

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
          // API 응답 구조: { success: true, data: { user: {...} } }
          const userData = data.data?.user || data.user;
          if (userData) {
            const apiUser = userData;
            const mappedRole = mapApiRole(apiUser.role);
            const newUser: User = {
              id: apiUser.id,
              email: apiUser.email,
              name: apiUser.fullName || apiUser.email,
              roles: [mappedRole],
              currentRole: mappedRole,
            };
            setUser(newUser);
          }
        }
      } catch {
        // 세션 없음 - 정상
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
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
        const code = data.code;
        let errorMsg = data.message || data.error || '로그인에 실패했습니다.';
        if (code === 'INVALID_USER') errorMsg = '등록되지 않은 이메일입니다.';
        else if (code === 'INVALID_CREDENTIALS') errorMsg = '비밀번호가 올바르지 않습니다.';
        else if (code === 'ACCOUNT_NOT_ACTIVE') errorMsg = '가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.';
        else if (code === 'ACCOUNT_LOCKED') errorMsg = '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.';
        else if (response.status === 429) errorMsg = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
        return { success: false, error: errorMsg };
      }

      // API 응답 구조: { success: true, data: { user: {...} } }
      const userData = data.data?.user || data.user;
      if (userData) {
        const apiUser = userData;
        const mappedRole = mapApiRole(apiUser.role);
        const newUser: User = {
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.fullName || apiUser.email,
          roles: [mappedRole],
          currentRole: mappedRole,
        };
        setUser(newUser);
        return { success: true, role: mappedRole };
      }

      return { success: false, error: '로그인 응답이 올바르지 않습니다.' };
    } catch (error) {
      // CORS/네트워크 오류 vs 서버 오류 구분
      if (error instanceof TypeError) {
        // fetch가 TypeError를 던지면 네트워크 오류 또는 CORS 차단
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

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      setUser({ ...user, currentRole: role });
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

export { ROLE_LABELS, ROLE_DASHBOARDS };

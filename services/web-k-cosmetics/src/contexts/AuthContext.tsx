/**
 * AuthContext - K-Cosmetics 인증 및 역할 관리
 * httpOnly Cookie 기반 인증
 */

import { createContext, useContext, useState, ReactNode } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export type UserRole = 'admin' | 'supplier' | 'seller' | 'partner';

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
  isSessionChecked: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
};

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/admin',
  supplier: '/supplier',
  seller: '/seller',
  partner: '/partner',
};

// API 역할을 web 역할로 매핑
function mapApiRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'admin': 'admin',
    'super_admin': 'admin',
    'supplier': 'supplier',
    'seller': 'seller',
    'partner': 'partner',
    'customer': 'seller',
    'user': 'seller',
  };
  return roleMap[apiRole] || 'seller';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // Lazy session check - only called when entering protected routes
  const checkSession = async () => {
    if (isSessionChecked) return; // Already checked

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // API 응답 구조: { success: true, data: { user: {...} } } 또는 { user: {...} }
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
    } finally {
      setIsLoading(false);
      setIsSessionChecked(true);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || data.error || '로그인에 실패했습니다.' };
      }

      // API 응답 구조: { success: true, data: { user: {...} } } 또는 { user: {...} }
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
        setIsSessionChecked(true);
        return { success: true };
      }

      return { success: false, error: data.message || data.error || '로그인 응답이 올바르지 않습니다.' };
    } catch (error) {
      return { success: false, error: '로그인에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
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
        isSessionChecked,
        login,
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

export { ROLE_LABELS, ROLE_DASHBOARDS };

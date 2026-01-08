import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';

// Re-export UserRole for use by other components
export type { UserRole } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  availableRoles: UserRole[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API 서버 역할을 glycopharm-web 역할로 매핑
function mapApiRoleToWebRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'seller': 'pharmacy',
    'customer': 'pharmacy',
    'user': 'pharmacy',
    'admin': 'operator',
    'super_admin': 'operator',
    'supplier': 'supplier',
    'partner': 'partner',
  };
  return roleMap[apiRole] || 'consumer';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  pharmacy: '약국',
  supplier: '공급자',
  partner: '파트너',
  operator: '운영자',
  consumer: '소비자',
};

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  pharmacy: '/pharmacy',
  supplier: '/supplier',
  partner: '/partner',
  operator: '/operator',
  consumer: '/consumer',
};

export const ROLE_ICONS: Record<UserRole, string> = {
  pharmacy: '💊',
  supplier: '📦',
  partner: '🤝',
  operator: '🛡️',
  consumer: '👤',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    // httpOnly Cookie 기반 세션 확인
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const apiUser = data.user as { role: string; [key: string]: unknown };
            const mappedRole = mapApiRoleToWebRole(apiUser.role);
            const userData: User = {
              ...apiUser,
              role: mappedRole,
              name: apiUser.fullName as string || apiUser.email as string,
              status: (apiUser.status as string) || 'approved',
              createdAt: apiUser.createdAt as string,
              updatedAt: apiUser.updatedAt as string,
            } as User;
            setUser(userData);
            setAvailableRoles([userData.role]);
          }
        }
      } catch {
        // 세션 없음 - 정상
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '로그인에 실패했습니다.');
      }

      if (data.user) {
        const apiUser = data.user as { role: string; [key: string]: unknown };
        const mappedRole = mapApiRoleToWebRole(apiUser.role);
        const typedUser: User = {
          ...apiUser,
          role: mappedRole,
          name: apiUser.fullName as string || apiUser.email as string,
          status: (apiUser.status as string) || 'approved',
          createdAt: apiUser.createdAt as string,
          updatedAt: apiUser.updatedAt as string,
        } as User;

        setUser(typedUser);
        setAvailableRoles([typedUser.role]);
        return;
      }

      throw new Error('로그인 응답이 올바르지 않습니다.');
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
    setAvailableRoles([]);
  };

  const selectRole = (role: UserRole) => {
    if (user && availableRoles.includes(role)) {
      setUser({ ...user, role });
    }
  };

  const switchRole = selectRole;
  const hasMultipleRoles = availableRoles.length > 1;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        selectRole,
        switchRole,
        hasMultipleRoles,
        availableRoles,
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

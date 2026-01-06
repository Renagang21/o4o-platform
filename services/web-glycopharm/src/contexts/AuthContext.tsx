import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { authApi, apiClient } from '@/services/api';

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
// API Server -> glycopharm-web
// seller/customer -> pharmacy (glycopharm은 약국 중심 서비스)
// admin/super_admin -> operator
// supplier -> supplier
// partner -> partner
// Note: customer는 glycopharm에서 약국(pharmacy) 역할로 간주됨
// 일반 소비자(consumer)는 별도 역할 체계 필요시 추가 정의 예정
function mapApiRoleToWebRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'seller': 'pharmacy',
    'customer': 'pharmacy', // glycopharm 약국 계정
    'user': 'pharmacy',     // glycopharm 약국 계정
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
    // Check for existing session
    const checkSession = async () => {
      const token = localStorage.getItem('glycopharm_token');
      if (token) {
        apiClient.setToken(token);
        try {
          const response = await authApi.me();
          if (response.data) {
            // API 역할을 웹 역할로 매핑
            const apiUser = response.data.user as { role: string; [key: string]: unknown };
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
            localStorage.setItem('glycopharm_user', JSON.stringify(userData));
            setAvailableRoles([userData.role]);
          } else {
            localStorage.removeItem('glycopharm_token');
            localStorage.removeItem('glycopharm_user');
            apiClient.setToken(null);
          }
        } catch {
          localStorage.removeItem('glycopharm_token');
          localStorage.removeItem('glycopharm_user');
          apiClient.setToken(null);
        }
      } else {
        // Check for saved user (test mode)
        const savedUser = localStorage.getItem('glycopharm_user');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setAvailableRoles(userData.availableRoles || [userData.role]);
          } catch {
            localStorage.removeItem('glycopharm_user');
          }
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);

      if (response.error) {
        throw new Error(response.error.message || '로그인에 실패했습니다.');
      }

      if (response.data) {
        const { user: userData, accessToken } = response.data;
        // API 역할을 웹 역할로 매핑
        const apiUser = userData as { role: string; [key: string]: unknown };
        const mappedRole = mapApiRoleToWebRole(apiUser.role);
        const typedUser: User = {
          ...apiUser,
          role: mappedRole,
          name: apiUser.fullName as string || apiUser.email as string,
          status: (apiUser.status as string) || 'approved',
          createdAt: apiUser.createdAt as string,
          updatedAt: apiUser.updatedAt as string,
        } as User;

        apiClient.setToken(accessToken);
        localStorage.setItem('glycopharm_token', accessToken);
        setUser(typedUser);
        setAvailableRoles([typedUser.role]);
        localStorage.setItem('glycopharm_user', JSON.stringify(typedUser));
        return;
      }

      throw new Error('로그인 응답이 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setAvailableRoles([]);
    localStorage.removeItem('glycopharm_user');
    localStorage.removeItem('glycopharm_token');
    apiClient.setToken(null);
  };

  const selectRole = (role: UserRole) => {
    if (user && availableRoles.includes(role)) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('glycopharm_user', JSON.stringify({ ...updatedUser, availableRoles }));
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

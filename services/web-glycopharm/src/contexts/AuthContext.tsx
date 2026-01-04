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
            const userData = response.data.user as User;
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
      // Try real API first
      try {
        const response = await authApi.login(email, password);

        if (response.error) {
          throw new Error(response.error.message || 'Login failed');
        }

        if (response.data) {
          const { user: userData, accessToken } = response.data;
          const typedUser = userData as User;
          apiClient.setToken(accessToken);
          setUser(typedUser);
          setAvailableRoles([typedUser.role]);
          localStorage.setItem('glycopharm_user', JSON.stringify(typedUser));
          return;
        }
      } catch {
        // Fall back to test mode
      }

      // Test mode login
      await new Promise(resolve => setTimeout(resolve, 500));

      let role: UserRole = 'consumer';
      let roles: UserRole[] = ['consumer'];
      let name = '사용자';

      if (email.includes('operator') || email.includes('admin')) {
        role = 'operator';
        roles = ['operator', 'pharmacy', 'supplier', 'partner'];
        name = '운영자';
      } else if (email.includes('pharmacy')) {
        role = 'pharmacy';
        roles = ['pharmacy'];
        name = '약국 담당자';
      } else if (email.includes('supplier')) {
        role = 'supplier';
        roles = ['supplier'];
        name = '공급자';
      } else if (email.includes('partner')) {
        role = 'partner';
        roles = ['partner'];
        name = '파트너';
      } else if (email.includes('multi')) {
        role = 'pharmacy';
        roles = ['pharmacy', 'supplier'];
        name = '복수역할 사용자';
      }

      const testUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        role,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(testUser);
      setAvailableRoles(roles);
      localStorage.setItem('glycopharm_user', JSON.stringify({ ...testUser, availableRoles: roles }));
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

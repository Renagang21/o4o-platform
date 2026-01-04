/**
 * AuthContext - 인증 및 역할 관리
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 저장된 세션 복원
    const savedUser = localStorage.getItem('neture_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('neture_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // 실제로는 API 호출
      // const response = await fetch('/api/v1/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password: _password }),
      //   credentials: 'include',
      // });

      // 임시 로그인 처리 (테스트용)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 테스트 계정별 역할 설정
      let roles: UserRole[] = ['seller'];
      let name = '사용자';

      if (email.includes('admin')) {
        roles = ['admin', 'supplier', 'seller', 'partner'];
        name = '관리자';
      } else if (email.includes('supplier')) {
        roles = ['supplier'];
        name = '공급자';
      } else if (email.includes('partner')) {
        roles = ['partner', 'seller'];
        name = '파트너';
      } else if (email.includes('multi')) {
        roles = ['supplier', 'seller'];
        name = '복수역할 사용자';
      }

      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        roles,
        currentRole: roles[0],
      };

      setUser(newUser);
      localStorage.setItem('neture_user', JSON.stringify(newUser));

      return { success: true };
    } catch (error) {
      return { success: false, error: '로그인에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('neture_user');
  };

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      const updatedUser = { ...user, currentRole: role };
      setUser(updatedUser);
      localStorage.setItem('neture_user', JSON.stringify(updatedUser));
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

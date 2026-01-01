import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for development
const mockUsers: Record<string, User> = {
  'pharmacy@test.com': {
    id: '1',
    email: 'pharmacy@test.com',
    name: '김약사',
    phone: '010-1234-5678',
    role: 'pharmacy',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'supplier@test.com': {
    id: '2',
    email: 'supplier@test.com',
    name: '이공급',
    phone: '010-2345-6789',
    role: 'supplier',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'partner@test.com': {
    id: '3',
    email: 'partner@test.com',
    name: '박파트너',
    phone: '010-3456-7890',
    role: 'partner',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'operator@test.com': {
    id: '4',
    email: 'operator@test.com',
    name: '최운영자',
    phone: '010-4567-8901',
    role: 'operator',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'consumer@test.com': {
    id: '5',
    email: 'consumer@test.com',
    name: '정소비자',
    phone: '010-5678-9012',
    role: 'consumer',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('glycopharm_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('glycopharm_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockUser = mockUsers[email.toLowerCase()];
      if (!mockUser) {
        throw new Error('Invalid credentials');
      }

      setUser(mockUser);
      localStorage.setItem('glycopharm_user', JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('glycopharm_user');
  };

  const selectRole = (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('glycopharm_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        selectRole,
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

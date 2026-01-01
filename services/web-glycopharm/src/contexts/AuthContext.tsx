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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const token = localStorage.getItem('glycopharm_token');
      if (token) {
        apiClient.setToken(token);
        const response = await authApi.me();
        if (response.data) {
          const userData = response.data.user as User;
          setUser(userData);
          localStorage.setItem('glycopharm_user', JSON.stringify(userData));
        } else {
          // Token expired or invalid
          localStorage.removeItem('glycopharm_token');
          localStorage.removeItem('glycopharm_user');
          apiClient.setToken(null);
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
        throw new Error(response.error.message || 'Login failed');
      }

      if (response.data) {
        const { user: userData, accessToken } = response.data;
        apiClient.setToken(accessToken);
        setUser(userData as User);
        localStorage.setItem('glycopharm_user', JSON.stringify(userData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    localStorage.removeItem('glycopharm_user');
    localStorage.removeItem('glycopharm_token');
    apiClient.setToken(null);
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

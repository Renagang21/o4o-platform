/**
 * Authentication Context
 * =============================================================================
 * Provides authentication state throughout the application.
 *
 * Rules (from web-server-architecture.md):
 * - Use authClient for all auth operations
 * - JWT is managed by authClient (localStorage + auto-refresh)
 * - User data is stored in memory only
 * =============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authClient } from '@o4o/auth-client';

interface User {
  id: string;
  email: string;
  name?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Extract roles from assignments
function extractRoles(assignments?: Array<{ role: string; isActive: boolean }>): string[] {
  if (!assignments) return [];
  return assignments
    .filter((a) => a.isActive)
    .map((a) => a.role);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      // Check session with Core API via authClient
      const result = await authClient.checkSession();

      if (result.isAuthenticated && result.user) {
        setUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name ?? undefined,
          roles: result.user.roles || [],
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authClient.login({ email, password });

      // Store tokens (authClient handles this, but we ensure it's done)
      // AuthResponse uses 'token' not 'accessToken'
      if (response.token) {
        localStorage.setItem('accessToken', response.token);
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      // Set user from response
      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name ?? undefined,
          roles: extractRoles(response.user.assignments),
        });
      } else {
        // If no user in response, check auth to get user
        await checkAuth();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authClient.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
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
        checkAuth,
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

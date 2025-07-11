import React, { useState, ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { AuthClient } from '@o4o/auth-client';
import type { User, SessionStatus } from '@o4o/types';

interface AuthProviderProps {
  children: ReactNode;
  ssoClient?: AuthClient;
  autoRefresh?: boolean;
  onAuthError?: (error: string) => void;
  onSessionExpiring?: (remainingSeconds: number) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  ssoClient,
  onAuthError
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const authClient = ssoClient || new AuthClient(process.env.VITE_API_BASE_URL || '');

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.login(credentials);
      setUser(response.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onAuthError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authClient.logout();
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const getSessionStatus = (): SessionStatus | null => {
    if (!user) return null;
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const remainingTime = expiresAt.getTime() - now.getTime();
    
    return {
      isValid: remainingTime > 0,
      expiresAt,
      remainingTime
    };
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    clearError,
    getSessionStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
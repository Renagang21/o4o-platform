import React, { useState, ReactNode, useEffect } from 'react';
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
  // 로컬 스토리지에서 초기 상태 읽기
  const getInitialState = () => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('admin-auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.user) {
          return parsed.state.user;
        }
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }
    return null;
  };

  const [user, setUser] = useState<User | null>(getInitialState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const authClient = ssoClient || new AuthClient(
    typeof window !== 'undefined' && (window as any).import?.meta?.env?.VITE_API_BASE_URL || ''
  );

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
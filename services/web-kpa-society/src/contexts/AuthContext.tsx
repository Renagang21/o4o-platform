/**
 * Auth Context
 *
 * Phase H8-4: KPA Society Core Auth v2 Integration
 * httpOnly cookie 기반 인증 (credentials: 'include')
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
  };
}

interface MeResponse {
  success: boolean;
  data: User;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: MeResponse = await response.json();
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/v2/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '로그인에 실패했습니다.');
    }

    const data: AuthResponse = await response.json();
    if (data.success && data.data?.user) {
      setUser(data.data.user);
    } else {
      throw new Error('로그인 응답 형식이 올바르지 않습니다.');
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v2/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
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

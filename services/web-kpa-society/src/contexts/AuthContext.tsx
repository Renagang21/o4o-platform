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

/**
 * WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정 정의
 * - 지부 운영자: district_admin
 * - 분회 운영자: branch_admin
 * - 약사: pharmacist
 */
export type TestAccountType = 'district_admin' | 'branch_admin' | 'pharmacist';

export const TEST_ACCOUNTS: Record<TestAccountType, User> = {
  district_admin: {
    id: 'test-district-admin-001',
    email: 'district-admin@kpa-test.kr',
    name: '지부 운영자 (테스트)',
    role: 'district_admin',
  },
  branch_admin: {
    id: 'test-branch-admin-001',
    email: 'branch-admin@kpa-test.kr',
    name: '분회 운영자 (테스트)',
    role: 'branch_admin',
  },
  pharmacist: {
    id: 'test-pharmacist-001',
    email: 'pharmacist@kpa-test.kr',
    name: '테스트 약사',
    role: 'pharmacist',
  },
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsTestAccount: (accountType: TestAccountType) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface ApiUser {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  [key: string]: unknown;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: ApiUser;
  };
}

interface MeResponse {
  success: boolean;
  data: ApiUser;
}

/**
 * API 서버 역할을 KPA Society 역할로 매핑
 */
function mapApiRoleToKpaRole(apiRole: string | undefined): string {
  if (!apiRole) return 'pharmacist';

  const roleMap: Record<string, string> = {
    // KPA 전용 역할
    'pharmacist': 'pharmacist',
    'membership_district_admin': 'district_admin',
    'membership_branch_admin': 'branch_admin',
    'membership_super_admin': 'super_admin',
    // 일반 역할 매핑
    'admin': 'district_admin',
    'super_admin': 'super_admin',
    'customer': 'pharmacist',
    'user': 'pharmacist',
  };

  return roleMap[apiRole] || 'pharmacist';
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
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: MeResponse = await response.json();
        if (data.success && data.data) {
          const apiUser = data.data;
          const mappedRole = mapApiRoleToKpaRole(apiUser.role);
          const userData: User = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.fullName || apiUser.name || apiUser.email,
            role: mappedRole,
          };
          setUser(userData);
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
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
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
      const apiUser = data.data.user;
      const mappedRole = mapApiRoleToKpaRole(apiUser.role);
      const userData: User = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.fullName || apiUser.name || apiUser.email,
        role: mappedRole,
      };
      setUser(userData);
    } else {
      throw new Error('로그인 응답 형식이 올바르지 않습니다.');
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
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

  /**
   * WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정으로 즉시 로그인
   * - 실제 API 호출 없이 로컬 상태만 변경
   * - 테스트 환경 전용
   */
  const loginAsTestAccount = (accountType: TestAccountType) => {
    const testUser = TEST_ACCOUNTS[accountType];
    setUser(testUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsTestAccount,
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

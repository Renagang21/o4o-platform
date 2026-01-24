/**
 * Auth Context
 *
 * Uses @o4o/auth-client with localStorage strategy for cross-domain auth.
 * Server auto-detects cross-origin and includes tokens in response.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthClient, getAccessToken } from '@o4o/auth-client';

// Re-export for client.ts to use
export { getAccessToken };

// ============================================================================
// Auth Client Instance
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// Create auth client with localStorage strategy for cross-domain authentication
const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',
});

// ============================================================================
// Types
// ============================================================================

/**
 * 약사 직능 (Function) - WO-KPA-FUNCTION-GATE-V1
 * 직능은 권한(Role)이 아닌 화면/업무 흐름을 위한 속성
 */
export type PharmacistFunction = 'pharmacy' | 'hospital' | 'industry' | 'other';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  pharmacistFunction?: PharmacistFunction;  // 직능 (최초 1회 선택)
}

/**
 * WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정 정의
 *
 * 권한 계층 (Role):
 * - 지부 운영자: district_admin (지부 관리 권한)
 * - 분회 운영자: branch_admin (분회 관리 권한)
 * - 약사: pharmacist (일반 회원 권한)
 *
 * 직책 (Position) - KPA-AUTH-ROLE-POSITION-PRINCIPLES:
 * - 지부임원: district_officer (직책 표시용, 권한은 pharmacist와 동일)
 * - 분회임원: branch_officer (직책 표시용, 권한은 pharmacist와 동일)
 *
 * Note: 임원은 직책이며 권한이 아님. 권한은 별도로 부여해야 함.
 */
export type TestAccountType =
  | 'district_admin'
  | 'branch_admin'
  | 'pharmacist'
  | 'district_officer'
  | 'branch_officer';

export interface TestUser extends User {
  position?: string;  // 직책 (표시용)
}

export const TEST_ACCOUNTS: Record<TestAccountType, TestUser> = {
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
  district_officer: {
    id: 'test-district-officer-001',
    email: 'district-officer@kpa-test.kr',
    name: '지부 부회장 (테스트)',
    role: 'pharmacist',  // 권한은 일반 회원
    position: 'vice_president',  // 직책: 부회장
  },
  branch_officer: {
    id: 'test-branch-officer-001',
    email: 'branch-officer@kpa-test.kr',
    name: '분회 이사 (테스트)',
    role: 'pharmacist',  // 권한은 일반 회원
    position: 'director',  // 직책: 이사
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
  login: (email: string, password: string) => Promise<User>;
  loginAsTestAccount: (accountType: TestAccountType) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setPharmacistFunction: (fn: PharmacistFunction) => void;
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

/**
 * API 응답에서 User 객체 생성
 */
function createUserFromApiResponse(apiUser: ApiUser): User {
  const mappedRole = mapApiRoleToKpaRole(apiUser.role);
  const savedFunction = localStorage.getItem(`kpa_function_${apiUser.id}`) as PharmacistFunction | null;

  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    role: mappedRole,
    pharmacistFunction: savedFunction || undefined,
  };
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
      const response = await authClient.api.get('/auth/me');
      const data = response.data as { success: boolean; data: ApiUser };

      if (data.success && data.data) {
        setUser(createUserFromApiResponse(data.data));
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

  const login = async (email: string, password: string): Promise<User> => {
    const response = await authClient.login({ email, password });

    if (response.success && response.user) {
      const userData = createUserFromApiResponse(response.user as ApiUser);
      setUser(userData);
      return userData;
    } else {
      throw new Error('로그인 응답 형식이 올바르지 않습니다.');
    }
  };

  const logout = async () => {
    try {
      await authClient.logout();
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

  /**
   * WO-KPA-FUNCTION-GATE-V1: 약사 직능 설정
   * - 최초 1회 선택 후 저장
   * - localStorage에 저장 (추후 API 연동 가능)
   */
  const setPharmacistFunction = (fn: PharmacistFunction) => {
    if (user) {
      const updatedUser = { ...user, pharmacistFunction: fn };
      setUser(updatedUser);
      // 로컬 저장 (사용자별)
      localStorage.setItem(`kpa_function_${user.id}`, fn);
    }
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
        setPharmacistFunction,
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

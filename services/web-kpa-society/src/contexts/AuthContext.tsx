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
  login: (email: string, password: string) => Promise<User>;  // WO-KPA-FUNCTION-GATE-V1: User 반환
  loginAsTestAccount: (accountType: TestAccountType) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setPharmacistFunction: (fn: PharmacistFunction) => void;  // WO-KPA-FUNCTION-GATE-V1
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
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}

interface MeResponse {
  success: boolean;
  data: ApiUser;
}

// ============================================================================
// Token Storage (Cross-domain authentication)
// ============================================================================

const TOKEN_KEY = 'kpa_access_token';
const REFRESH_TOKEN_KEY = 'kpa_refresh_token';

function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
      const token = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (response.ok) {
        const data: MeResponse = await response.json();
        if (data.success && data.data) {
          const apiUser = data.data;
          const mappedRole = mapApiRoleToKpaRole(apiUser.role);
          // WO-KPA-FUNCTION-GATE-V1: 저장된 직능 불러오기
          const savedFunction = localStorage.getItem(`kpa_function_${apiUser.id}`) as PharmacistFunction | null;
          const userData: User = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.fullName || apiUser.name || apiUser.email,
            role: mappedRole,
            pharmacistFunction: savedFunction || undefined,
          };
          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        clearTokens();
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearTokens();
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
      // includeLegacyTokens: true to receive tokens in response body for cross-domain auth
      body: JSON.stringify({ email, password, includeLegacyTokens: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '로그인에 실패했습니다.');
    }

    const data: AuthResponse = await response.json();
    if (data.success && data.data?.user) {
      const apiUser = data.data.user;
      const mappedRole = mapApiRoleToKpaRole(apiUser.role);
      // WO-KPA-FUNCTION-GATE-V1: 저장된 직능 불러오기
      const savedFunction = localStorage.getItem(`kpa_function_${apiUser.id}`) as PharmacistFunction | null;
      const userData: User = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.fullName || apiUser.name || apiUser.email,
        role: mappedRole,
        pharmacistFunction: savedFunction || undefined,
      };

      // Cross-domain auth: Store tokens in localStorage
      if (data.data.tokens) {
        saveTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      }

      setUser(userData);
      return userData;  // WO-KPA-FUNCTION-GATE-V1: User 반환
    } else {
      throw new Error('로그인 응답 형식이 올바르지 않습니다.');
    }
  };

  const logout = async () => {
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearTokens();
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

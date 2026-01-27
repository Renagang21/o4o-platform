/**
 * Auth Context
 *
 * Uses @o4o/auth-client with localStorage strategy for cross-domain auth.
 * Server auto-detects cross-origin and includes tokens in response.
 *
 * Phase 2-b: Service User 인증 추가 (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
 * - Platform User와 Service User 완전 분리
 * - Service User는 약국 서비스 전용 인증
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthClient, getAccessToken } from '@o4o/auth-client';

// Re-export for client.ts to use
export { getAccessToken };

// ============================================================================
// Phase 2-b: Service User 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
// ============================================================================

// Service User token storage keys
const SERVICE_ACCESS_TOKEN_KEY = 'kpa_pharmacy_service_access_token';
const SERVICE_REFRESH_TOKEN_KEY = 'kpa_pharmacy_service_refresh_token';

// Service User types
export interface ServiceUser {
  providerUserId: string;
  provider: 'google' | 'kakao' | 'naver';
  email: string;
  displayName?: string;
  profileImage?: string;
  serviceId: string;
  storeId?: string;
}

export interface ServiceLoginCredentials {
  provider: 'google' | 'kakao' | 'naver';
  oauthToken: string; // OAuth profile JSON for Phase 1 testing
  serviceId: string;
  storeId?: string;
}

// Service User token management
function getStoredServiceTokens() {
  return {
    accessToken: localStorage.getItem(SERVICE_ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(SERVICE_REFRESH_TOKEN_KEY),
  };
}

function storeServiceTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(SERVICE_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(SERVICE_REFRESH_TOKEN_KEY, refreshToken);
}

function clearServiceTokens() {
  localStorage.removeItem(SERVICE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(SERVICE_REFRESH_TOKEN_KEY);
}

// Export for use in Service API clients
export function getServiceAccessToken(): string | null {
  return localStorage.getItem(SERVICE_ACCESS_TOKEN_KEY);
}

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
    name: '김지부 (지부운영자)',
    role: 'district_admin',
  },
  branch_admin: {
    id: 'test-branch-admin-001',
    email: 'branch-admin@kpa-test.kr',
    name: '이분회 (분회운영자)',
    role: 'branch_admin',
  },
  district_officer: {
    id: 'test-district-officer-001',
    email: 'district-officer@kpa-test.kr',
    name: '박임원 (지부임원)',
    role: 'pharmacist',  // 권한은 일반 회원
    position: 'vice_president',  // 직책: 부회장
  },
  branch_officer: {
    id: 'test-branch-officer-001',
    email: 'branch-officer@kpa-test.kr',
    name: '최임원 (분회임원)',
    role: 'pharmacist',  // 권한은 일반 회원
    position: 'director',  // 직책: 이사
  },
  pharmacist: {
    id: 'test-pharmacist-001',
    email: 'pharmacist@kpa-test.kr',
    name: '홍길동 (약사)',
    role: 'pharmacist',
  },
};

interface AuthContextType {
  // Platform User
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginAsTestAccount: (accountType: TestAccountType) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setPharmacistFunction: (fn: PharmacistFunction) => void;
  // Phase 2-b: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
  serviceUser: ServiceUser | null;
  isServiceUserAuthenticated: boolean;
  serviceUserLogin: (credentials: ServiceLoginCredentials) => Promise<void>;
  serviceUserLogout: () => void;
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

  // Phase 2-b: Service User state (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
  const [serviceUser, setServiceUser] = useState<ServiceUser | null>(null);

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

  const logoutAll = async () => {
    try {
      await authClient.api.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout all request failed:', error);
      throw error;
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

  // ============================================================================
  // Phase 2-b: Service User Login (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
  // ============================================================================

  /**
   * Service User 로그인
   *
   * Phase 1 API 기반: /api/v1/auth/service/login
   * Service User는 Platform User와 완전히 분리됨
   * serviceId: 'kpa-pharmacy' 고정
   */
  const serviceUserLogin = async (credentials: ServiceLoginCredentials) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/service/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Service User 로그인에 실패했습니다.');
    }

    // Service JWT 저장 (tokenType: 'service')
    const tokens = data.tokens;
    if (tokens?.accessToken && tokens?.refreshToken) {
      storeServiceTokens(tokens.accessToken, tokens.refreshToken);
    }

    // Service User 상태 설정
    const serviceUserData: ServiceUser = {
      providerUserId: data.user.providerUserId,
      provider: data.user.provider,
      email: data.user.email,
      displayName: data.user.displayName,
      profileImage: data.user.profileImage,
      serviceId: data.user.serviceId,
      storeId: data.user.storeId,
    };

    setServiceUser(serviceUserData);
  };

  /**
   * Service User 로그아웃
   */
  const serviceUserLogout = () => {
    clearServiceTokens();
    setServiceUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        // Platform User
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsTestAccount,
        logout,
        logoutAll,
        checkAuth,
        setPharmacistFunction,
        // Phase 2-b: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
        serviceUser,
        isServiceUserAuthenticated: !!serviceUser,
        serviceUserLogin,
        serviceUserLogout,
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

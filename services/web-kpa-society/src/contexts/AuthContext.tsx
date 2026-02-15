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

/**
 * 약사 직역 (Role) - WO-PHARMACIST-PROFILE-ROLE-ONBOARDING-V1
 * 직역은 안내/온보딩 용도 메타데이터 (권한과 무관)
 * - general: 일반 약사 (근무약사/산업약사 등)
 * - pharmacy_owner: 약국 개설자 (약국 경영)
 * - hospital: 병원 약사
 * - other: 기타
 */
export type PharmacistRole = 'general' | 'pharmacy_owner' | 'hospital' | 'other';

export type MembershipType = 'pharmacist' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;  // Legacy single role (backward compatibility)
  roles?: string[];  // P2-T1: Phase 4 support - array of roles (legacy + prefixed)
  membershipType?: MembershipType;  // Phase 3: 약사/약대생 구분
  pharmacistFunction?: PharmacistFunction;  // 직능 (최초 1회 선택)
  pharmacistRole?: PharmacistRole;          // 직역 (최초 1회 선택, 프로필에서 수정 가능)

  // ============================================
  // P2-T4: Super Operator 확장 지점
  // WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
  // ============================================
  // 향후 Super Operator 개념 도입 시:
  // - isSuperOperator?: boolean;
  // - operatorScopes?: string[];  // 서비스별 운영 권한
  // - operatorLevel?: 'platform' | 'service' | 'branch';
  // 구현 없음 (확장 지점만 표시)
  // ============================================
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
    role: 'kpa:district_admin',
    roles: ['kpa:district_admin'],
  },
  branch_admin: {
    id: 'test-branch-admin-001',
    email: 'branch-admin@kpa-test.kr',
    name: '이분회 (분회운영자)',
    role: 'kpa:branch_admin',
    roles: ['kpa:branch_admin'],
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
  setPharmacistRole: (role: PharmacistRole) => void;
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
 * WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1
 * Role 자동 매핑 제거됨
 *
 * KPA는 더 이상 API role을 해석하지 않음
 * 운영자 여부는 서버 응답(KpaMember 기반)으로만 판단
 */

/**
 * API 응답에서 User 객체 생성
 *
 * WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1:
 * - role 매핑 제거 (API role을 그대로 사용)
 * - KPA 프론트는 role 문자열을 해석하지 않음
 *
 * P2-T1 (WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1):
 * - roles 배열 보존 (Phase 4 prefixed roles 지원)
 * - Backward compatibility: role 필드 유지
 */
function createUserFromApiResponse(apiUser: ApiUser): User {
  // P1-T3: Get pharmacistFunction/Role from API response (not localStorage)
  // Phase 3: membershipType 매핑 추가
  const role = apiUser.role || 'pharmacist';
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    role, // 매핑 없이 그대로 사용 (Backward compatibility)
    roles: apiUser.roles || [role], // P2-T1: Phase 4 support
    membershipType: (role === 'student' ? 'student' : 'pharmacist') as MembershipType,
    pharmacistFunction: (apiUser as any).pharmacistFunction as PharmacistFunction | undefined,
    pharmacistRole: (apiUser as any).pharmacistRole as PharmacistRole | undefined,
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
   * P1-T3: 약사 직능 설정
   * - DB에 저장 (localStorage 제거)
   * - API 호출하여 서버에 업데이트
   */
  const setPharmacistFunction = async (fn: PharmacistFunction) => {
    if (user) {
      // TODO: API call to update pharmacistFunction on server
      // await authClient.api.put('/auth/me/pharmacist-function', { pharmacistFunction: fn });
      const updatedUser = { ...user, pharmacistFunction: fn };
      setUser(updatedUser);
    }
  };

  /**
   * P1-T3: 약사 직역 설정
   * - DB에 저장 (localStorage 제거)
   * - API 호출하여 서버에 업데이트
   */
  const setPharmacistRole = async (role: PharmacistRole) => {
    if (user) {
      // TODO: API call to update pharmacistRole on server
      // await authClient.api.put('/auth/me/pharmacist-role', { pharmacistRole: role });
      const updatedUser = { ...user, pharmacistRole: role };
      setUser(updatedUser);
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
        setPharmacistRole,
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

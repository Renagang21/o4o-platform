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
import { parseAuthResponse, normalizeMemberships, AUTH_TOKEN_CLEARED_EVENT, type ApiUser } from '@o4o/auth-utils';
import { configureStoreProductsApi } from '@o4o/store-products-ui';

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
// Exported so KPA API modules share this single instance (localStorage strategy)
// instead of the @o4o/auth-client singleton which defaults to cookie strategy.
export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',
});

// WO-O4O-STORE-PRODUCTS-AUTHCLIENT-INJECTION-FIX-V1:
// store-products-ui 공통 패키지가 KPA의 localStorage-strategy authClient 를 사용하도록 주입.
// 미주입 시 /store/my-products 가 AUTH_REQUIRED 401 로 회귀하므로 모듈 로드 시점에 1회 호출.
configureStoreProductsApi(authClient.api);

// ============================================================================
// Types
// ============================================================================

/**
 * WO-ROLE-NORMALIZATION-PHASE3-C-V1: activityType 기반 라벨 매핑
 * kpa_pharmacist_profiles.activity_type → 표시명
 */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  pharmacy_owner: '약국 개설자',
  pharmacy_employee: '약국 근무 약사',
  hospital: '병원 약사',
  manufacturer: '제조업',
  importer: '수입업',
  wholesaler: '도매업',
  other_industry: '산업체',
  government: '공무원',
  school: '학교',
  other: '기타',
  inactive: '비활동',
};

export type MembershipType = 'pharmacist' | 'student';

/**
 * WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: KPA Membership Context
 * /auth/me 응답의 kpaMembership 필드와 1:1 대응
 */
export interface KpaMembershipContext {
  status: string | null;           // kpa_members.status
  role: string | null;             // kpa_members.role
  membershipType: string | null;   // kpa_members.membership_type (pharmacist | student)
  organizationId: string | null;   // kpa_members.organization_id
  organizationName: string | null;
  organizationType: string | null;
  organizationRole: string | null; // organization_members.role
  serviceAccess: 'full' | 'community-only' | 'pending' | 'blocked' | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  /** WO-FORUM-NICKNAME-UNIFICATION-V1: 포럼 공개 표시명 */
  nickname?: string;
  role?: string;  // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE2-V1: deprecated, use roles[]
  roles: string[];  // Primary role array
  membershipType?: MembershipType;  // Phase 3: 약사/약대생 구분
  // WO-ROLE-NORMALIZATION-PHASE3-C-V1: qualification + business 기반
  isStoreOwner: boolean;
  activityType?: string;  // kpa_pharmacist_profiles.activity_type

  // WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: 통합 KPA membership context
  kpaMembership?: KpaMembershipContext;

  // ── 하위 호환 필드 (kpaMembership에서 derive) ──
  // WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: KpaMember.role (SSOT)
  membershipRole?: string;  // 'member' | 'operator' | 'admin' | undefined (비소속)
  membershipOrgId?: string;
  membershipOrgName?: string;
  membershipOrgType?: string;   // 'association' | 'branch' | 'group'
  membershipParentId?: string;
  membershipStatus?: string;    // 'pending' | 'active' | 'suspended' | 'withdrawn'
  memberships?: { serviceKey: string; status: string }[];
}

/**
 * WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정 정의
 *
 * WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1:
 *   district_admin / branch_admin / district_officer / branch_officer 제거.
 *   KPA에는 kpa-society 운영자(kpa:operator)와 일반 회원(pharmacist)만 존재.
 *
 * 권한 계층 (Role):
 * - 약사: pharmacist (일반 회원 권한)
 */
export type TestAccountType = 'pharmacist';

export interface TestUser extends User {
  position?: string;  // 직책 (표시용)
}

export const TEST_ACCOUNTS: Record<TestAccountType, TestUser> = {
  pharmacist: {
    id: 'test-pharmacist-001',
    email: 'pharmacist@kpa-test.kr',
    name: '홍길동 (약사)',
    role: 'pharmacist',
    roles: ['pharmacist'],
    isStoreOwner: false,
  },
};

interface AuthContextType {
  // Platform User
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context 로딩 완료 여부 */
  isKpaContextLoaded: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginAsTestAccount: (accountType: TestAccountType) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  /** WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1: activityType + optional businessInfo */
  setActivityType: (activityType: string, businessInfo?: Record<string, any>) => Promise<void>;
  // Phase 2-b: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
  serviceUser: ServiceUser | null;
  isServiceUserAuthenticated: boolean;
  serviceUserLogin: (credentials: ServiceLoginCredentials) => Promise<void>;
  serviceUserLogout: () => void;
}

// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: ApiUser is imported from @o4o/auth-utils

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
  // Phase 3: membershipType 매핑 — kpaMembership.membershipType 우선
  const role = apiUser.role || 'pharmacist';
  const kpaMembership = (apiUser as any).kpaMembership;
  const membershipType: MembershipType =
    kpaMembership?.membershipType === 'student' ? 'student'
    : role === 'student' ? 'student'
    : 'pharmacist';
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    // WO-O4O-KPA-FORUM-DISPLAYNAME-NICKNAME-ALIGNMENT-V1:
    //   포럼 공개 표시명 canonical: nickname → name → email local-part.
    //   서버 /auth/me 응답이 nickname 을 포함하지 않으면 undefined 유지.
    nickname: (apiUser as any).nickname || undefined,
    role, // 매핑 없이 그대로 사용 (Backward compatibility)
    roles: apiUser.roles || [role], // P2-T1: Phase 4 support
    membershipType,
    // WO-ROLE-NORMALIZATION-PHASE3-C-V1: isStoreOwner + activityType
    isStoreOwner: !!(apiUser as any).isStoreOwner,
    activityType: (apiUser as any).activityType || undefined,
    memberships: normalizeMemberships(apiUser),
  };
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // WO-O4O-KPA-AUTH-ISLOADING-SMART-INIT-V1: Neture/GlycoPharm 패턴 정렬
  // 토큰 없는 비로그인 방문자: false로 즉시 시작 / 토큰 있는 사용자: true로 시작
  const [isLoading, setIsLoading] = useState(() => !!getAccessToken());
  // WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context 비동기 로딩 상태
  // true = 로딩 불필요 또는 로딩 완료 / false = 아직 로딩 중
  const [isKpaContextLoaded, setIsKpaContextLoaded] = useState(true);

  // Phase 2-b: Service User state (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
  const [serviceUser, setServiceUser] = useState<ServiceUser | null>(null);

  /**
   * WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context를 별도 API로 비동기 조회
   *
   * /auth/login, /auth/me 에서 제거된 KPA enrichment를 대체.
   * functional setUser로 현재 user 상태에 KPA 필드를 merge.
   * login()/checkAuth()에서 fire-and-forget으로 호출 → 로그인/화면진입을 차단하지 않음.
   * AuthGate는 isKpaContextLoaded=false 동안 KPA 게이트를 건너뛴다.
   */
  const fetchKpaContext = useCallback(async () => {
    try {
      const response = await authClient.api.get('/kpa/me-context');
      const data = response.data as { success: boolean; data: any };
      if (data.success && data.data) {
        const ctx = data.data;
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          updated.activityType = ctx.activityType || undefined;
          updated.isStoreOwner = !!ctx.isStoreOwner;
          if (ctx.kpaMembership) {
            updated.kpaMembership = ctx.kpaMembership;
            // 하위 호환 필드 populate
            updated.membershipRole = ctx.kpaMembership.role || undefined;
            updated.membershipOrgId = ctx.kpaMembership.organizationId || undefined;
            updated.membershipOrgName = ctx.kpaMembership.organizationName || undefined;
            updated.membershipOrgType = ctx.kpaMembership.organizationType || undefined;
            updated.membershipStatus = ctx.kpaMembership.status || undefined;
            if (ctx.kpaMembership.membershipType === 'student') {
              updated.membershipType = 'student';
            }
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('[KPA] me-context fetch failed:', error);
    } finally {
      setIsKpaContextLoaded(true);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    // WO-KPA-A-AUTH-LOOP-GUARD-STABILIZATION-V1:
    // 토큰 없으면 /auth/me 호출 자체를 생략 → 불필요한 401 방지
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      setIsKpaContextLoaded(true);
      return;
    }

    try {
      const response = await authClient.api.get('/auth/me');
      const data = response.data as { success: boolean; data: any };

      if (data.success && data.data) {
        // WO-O4O-AUTH-CHAIN-UNIFICATION-V1: parseAuthResponse로 user 추출 통일
        const { user: apiUser } = parseAuthResponse(data);
        if (!apiUser) { setUser(null); setIsLoading(false); setIsKpaContextLoaded(true); return; }
        const userData = createUserFromApiResponse(apiUser);

        // 즉시 user 설정 → 화면 표시 차단 해제
        setUser(userData);
        // WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context는 비동기 후속 로딩
        setIsKpaContextLoaded(false);
        void fetchKpaContext();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchKpaContext]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 토큰 갱신 실패 시 user 상태 정리 (api/token-refresh.ts에서 이벤트 발행)
  useEffect(() => {
    const handleTokenCleared = () => setUser(null);
    window.addEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
    return () => window.removeEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await authClient.login({ email, password });

    if (response.success && response.user) {
      const apiUser = response.user as any;
      const userData = createUserFromApiResponse(apiUser as ApiUser);

      // 즉시 user 설정 → 로그인 모달 닫기 + 화면 진입
      setUser(userData);
      // WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context는 비동기 후속 로딩
      setIsKpaContextLoaded(false);
      void fetchKpaContext();

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
   * WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1:
   * activityType + optional businessInfo 저장
   * - API PATCH로 서버 저장 → 서버가 isStoreOwner 재계산
   * - fetchKpaContext()로 KPA context 갱신 (await — AuthGate 정합성 보장)
   * - error re-throw: ActivitySetupPage에서 에러 UI 표시 가능
   */
  const setActivityType = async (activityType: string, businessInfo?: Record<string, any>) => {
    if (user) {
      const payload: Record<string, any> = { activityType };
      if (businessInfo) payload.businessInfo = businessInfo;
      await authClient.api.patch('/auth/me/profile', payload);
      // WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context만 갱신 (await로 AuthGate 정합성 보장)
      setIsKpaContextLoaded(false);
      await fetchKpaContext();
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
        isKpaContextLoaded,
        login,
        loginAsTestAccount,
        logout,
        logoutAll,
        checkAuth,
        setActivityType,
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

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';

// Re-export UserRole for use by other components
export type { UserRole } from '@/types';

// API Base URL: 공용 API 서버 사용 (glycopharm.co.kr -> api.neture.co.kr)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// Token storage keys
const ACCESS_TOKEN_KEY = 'glycopharm_access_token';
const REFRESH_TOKEN_KEY = 'glycopharm_refresh_token';

// Service User token storage keys (Phase 2: WO-AUTH-SERVICE-IDENTITY-PHASE2)
const SERVICE_ACCESS_TOKEN_KEY = 'glycopharm_service_access_token';
const SERVICE_REFRESH_TOKEN_KEY = 'glycopharm_service_refresh_token';

// Token management functions
function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Export for use in API clients
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// ============================================================================
// Phase 2: Service User 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
// ============================================================================

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

interface AuthContextType {
  // Platform User
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  availableRoles: UserRole[];
  updateUser: (updates: Partial<User>) => void;
  // Phase 2: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  serviceUser: ServiceUser | null;
  isServiceUserAuthenticated: boolean;
  serviceUserLogin: (credentials: ServiceLoginCredentials) => Promise<void>;
  serviceUserLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API 서버 역할을 glycopharm-web 역할로 매핑
function mapApiRoleToWebRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'pharmacy': 'pharmacy',  // glycopharm 전용 역할
    'seller': 'pharmacy',
    'customer': 'pharmacy',
    'user': 'pharmacy',
    'admin': 'operator',
    'super_admin': 'operator',
    'operator': 'operator',
    'supplier': 'supplier',
    'partner': 'partner',
  };
  return roleMap[apiRole] || 'consumer';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  pharmacy: '약국',
  supplier: '공급자',
  partner: '파트너',
  operator: '운영자',
  consumer: '소비자',
};

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/admin',
  pharmacy: '/care',  // WO-GLYCOPHARM-SOFT-GUARD-INTRO-V1: auth-utils.ts와 통일
  supplier: '/supplier',
  partner: '/partner',
  operator: '/operator',
  consumer: '/',
};

export const ROLE_ICONS: Record<UserRole, string> = {
  admin: '👑',
  pharmacy: '💊',
  supplier: '📦',
  partner: '🤝',
  operator: '🛡️',
  consumer: '👤',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // 토큰이 있으면 세션 확인 필요, 없으면 바로 로딩 완료
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem(ACCESS_TOKEN_KEY));
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

  // Phase 2: Service User state (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  const [serviceUser, setServiceUser] = useState<ServiceUser | null>(null);

  // Token refresh function
  const refreshAccessToken = async (): Promise<boolean> => {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const tokens = data.data?.tokens || data.tokens || data.data;
        if (tokens?.accessToken) {
          storeTokens(tokens.accessToken, tokens.refreshToken || refreshToken);
          return true;
        }
      }
    } catch {
      // Refresh failed
    }

    clearStoredTokens();
    setUser(null);
    return false;
  };

  useEffect(() => {
    // Bearer Token 기반 세션 확인
    // Cross-domain에서는 httpOnly 쿠키가 작동하지 않으므로 localStorage 토큰 사용
    const checkSession = async () => {
      const { accessToken } = getStoredTokens();

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // API 응답 구조: { success: true, data: { id, email, ... } }
          const apiUser = data.data || data.user || data;
          if (apiUser && apiUser.id) {
            // RBAC: roles 배열 우선, 없으면 role(singular) 폴백
            const apiRoles: string[] = Array.isArray(apiUser.roles) && apiUser.roles.length > 0
              ? apiUser.roles
              : apiUser.role ? [apiUser.role] : ['consumer'];
            const mappedRoles = [...new Set(apiRoles.map(mapApiRoleToWebRole))];
            const userData: User = {
              ...apiUser,
              roles: mappedRoles,
              name: apiUser.fullName as string || apiUser.email as string,
              status: (apiUser.status as string) || 'approved',
              createdAt: apiUser.createdAt as string,
              updatedAt: apiUser.updatedAt as string,
            } as User;
            setUser(userData);
            setAvailableRoles(mappedRoles);
          }
        } else if (response.status === 401) {
          // Token expired, try refresh
          await refreshAccessToken();
        }
      } catch {
        // 세션 없음 - 정상
        clearStoredTokens();
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    // 로그인 API 호출 (isLoading은 버튼 상태용으로 LoginPage에서 별도 관리)
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Still include for cookie-based fallback
    });

    const data = await response.json();

    if (!response.ok) {
      const code = data.code;
      let errorMsg = data.message || data.error || '로그인에 실패했습니다.';
      if (code === 'INVALID_USER') errorMsg = '등록되지 않은 이메일입니다.';
      else if (code === 'INVALID_CREDENTIALS') errorMsg = '비밀번호가 올바르지 않습니다.';
      else if (code === 'ACCOUNT_NOT_ACTIVE') errorMsg = '가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.';
      else if (code === 'ACCOUNT_LOCKED') errorMsg = '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.';
      else if (response.status === 429) errorMsg = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
      throw new Error(errorMsg);
    }

    // Cross-domain 환경에서는 응답 body에서 토큰을 추출하여 localStorage에 저장
    // API 응답 구조: { success: true, data: { message, user: {...}, tokens: {...} } }
    const tokens = data.data?.tokens || data.tokens;
    if (tokens?.accessToken && tokens?.refreshToken) {
      storeTokens(tokens.accessToken, tokens.refreshToken);
    }

    const apiUser = data.data?.user || data.user;
    if (apiUser && apiUser.id) {
      // RBAC: roles 배열 우선, 없으면 role(singular) 폴백
      const apiRoles: string[] = Array.isArray(apiUser.roles) && apiUser.roles.length > 0
        ? apiUser.roles
        : apiUser.role ? [apiUser.role] : ['consumer'];
      const mappedRoles = [...new Set(apiRoles.map(mapApiRoleToWebRole))];
      const typedUser: User = {
        ...apiUser,
        roles: mappedRoles,
        name: apiUser.fullName as string || apiUser.email as string,
        status: (apiUser.status as string) || 'approved',
        createdAt: apiUser.createdAt as string,
        updatedAt: apiUser.updatedAt as string,
      } as User;

      setUser(typedUser);
      setAvailableRoles(mappedRoles);
      return typedUser;
    }

    throw new Error('로그인 응답이 올바르지 않습니다.');
  };

  const logout = async () => {
    const { accessToken } = getStoredTokens();
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: accessToken ? {
          'Authorization': `Bearer ${accessToken}`,
        } : undefined,
      });
    } catch {
      // 로그아웃 실패해도 로컬 상태 정리
    }
    clearStoredTokens();
    setUser(null);
    setAvailableRoles([]);
  };

  const selectRole = (role: UserRole) => {
    if (user && availableRoles.includes(role)) {
      const reordered = [role, ...user.roles.filter(r => r !== role)];
      setUser({ ...user, roles: reordered });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const switchRole = selectRole;
  const hasMultipleRoles = availableRoles.length > 1;

  // ============================================================================
  // Phase 2: Service User Login (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
  // ============================================================================

  /**
   * Service User 로그인
   *
   * Phase 1 API 기반: /api/v1/auth/service/login
   * Service User는 Platform User와 완전히 분리됨
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
        logout,
        selectRole,
        switchRole,
        hasMultipleRoles,
        availableRoles,
        updateUser,
        // Phase 2: Service User (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
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

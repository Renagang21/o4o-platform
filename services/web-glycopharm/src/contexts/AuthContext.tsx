import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';

// Re-export UserRole for use by other components
export type { UserRole } from '@/types';

// API Base URL: 각 서비스 도메인에서 자체 API 서브도메인 사용 (same-origin cookie auth)
// e.g., glycopharm.co.kr → api.glycopharm.co.kr
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.glycopharm.co.kr';

// Token storage keys
const ACCESS_TOKEN_KEY = 'glycopharm_access_token';
const REFRESH_TOKEN_KEY = 'glycopharm_refresh_token';

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  hasMultipleRoles: boolean;
  availableRoles: UserRole[];
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
    'supplier': 'supplier',
    'partner': 'partner',
  };
  return roleMap[apiRole] || 'consumer';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  pharmacy: '약국',
  supplier: '공급자',
  partner: '파트너',
  operator: '운영자',
  consumer: '소비자',
};

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  pharmacy: '/pharmacy',
  supplier: '/supplier',
  partner: '/partner',
  operator: '/operator',
  consumer: '/consumer',
};

export const ROLE_ICONS: Record<UserRole, string> = {
  pharmacy: '💊',
  supplier: '📦',
  partner: '🤝',
  operator: '🛡️',
  consumer: '👤',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

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
            const mappedRole = mapApiRoleToWebRole(apiUser.role);
            const userData: User = {
              ...apiUser,
              role: mappedRole,
              name: apiUser.fullName as string || apiUser.email as string,
              status: (apiUser.status as string) || 'approved',
              createdAt: apiUser.createdAt as string,
              updatedAt: apiUser.updatedAt as string,
            } as User;
            setUser(userData);
            setAvailableRoles([userData.role]);
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
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Still include for cookie-based fallback
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || '로그인에 실패했습니다.');
      }

      // Cross-domain 환경에서는 응답 body에서 토큰을 추출하여 localStorage에 저장
      // API 응답 구조: { success: true, data: { message, user: {...}, tokens: {...} } }
      const tokens = data.data?.tokens || data.tokens;
      if (tokens?.accessToken && tokens?.refreshToken) {
        storeTokens(tokens.accessToken, tokens.refreshToken);
      }

      const apiUser = data.data?.user || data.user;
      if (apiUser && apiUser.id) {
        const mappedRole = mapApiRoleToWebRole(apiUser.role);
        const typedUser: User = {
          ...apiUser,
          role: mappedRole,
          name: apiUser.fullName as string || apiUser.email as string,
          status: (apiUser.status as string) || 'approved',
          createdAt: apiUser.createdAt as string,
          updatedAt: apiUser.updatedAt as string,
        } as User;

        setUser(typedUser);
        setAvailableRoles([typedUser.role]);
        return;
      }

      throw new Error('로그인 응답이 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
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
      setUser({ ...user, role });
    }
  };

  const switchRole = selectRole;
  const hasMultipleRoles = availableRoles.length > 1;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        selectRole,
        switchRole,
        hasMultipleRoles,
        availableRoles,
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

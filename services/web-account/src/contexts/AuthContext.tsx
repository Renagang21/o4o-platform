/**
 * AuthContext - Account Center 인증 컨텍스트
 * httpOnly Cookie 기반 인증 (web-neture 패턴)
 *
 * WO-O4O-ACCOUNT-CENTER-UI-V1
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefix 유지, mapApiRoles 제거
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   `login(email, password)` 과 raw `POST /auth/login` 호출을 제거했다. 계정센터는 인증 진입점이 아니라
 *   세션 소비자다 — 세션은 `/handoff?token=…`(cookie 교환) 또는 같은 도메인 쿠키로 들어오고,
 *   이 컨텍스트는 `GET /auth/me` 로 확인만 한다. 로그인 자체는 각 서비스의 Google 정본 화면이 담당한다.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { parseAuthResponse, normalizeUser } from '@o4o/auth-utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role format
 * e.g., 'platform:super_admin', 'neture:admin', 'kpa-society:operator'
 */
export type UserRole = string;

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  memberships?: { serviceKey: string; status: string }[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** 세션 재확인 — handoff 직후 등. 로그인 함수는 없다(Google 정본 화면이 담당). */
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * JWT roles를 그대로 사용 (prefix 유지).
 * 빈 배열이면 ['user'] fallback.
 */
function extractRoles(apiUser: any): string[] {
  const raw: string[] =
    Array.isArray(apiUser.roles) && apiUser.roles.length > 0
      ? apiUser.roles
      : apiUser.role
        ? [apiUser.role]
        : [];
  return raw.length > 0 ? raw : ['user'];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** 쿠키 세션 확인 — 계정센터의 유일한 인증 경로다(자격증명 전송 없음). */
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const { user: apiUser } = parseAuthResponse(data);
        if (apiUser) {
          const roles = extractRoles(apiUser);
          const base = normalizeUser(apiUser);
          const memberships = (apiUser as any).memberships || [];
          setUser({ ...base, roles, memberships });
        }
      }
    } catch {
      // 세션 없음 - 정상
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // 로그아웃 실패해도 로컬 상태 정리
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        refresh,
        logout,
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

/**
 * GlucoseView Auth Context
 *
 * H8-3: Core Auth v2 integration (httpOnly cookie based)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type AuthUser } from '../services/api';

// 사용자 역할
export type UserRole = 'pharmacist' | 'admin';

// 승인 상태
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 사용자 타입
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  pharmacyName?: string;
  pharmacyAddress?: string;
  phone?: string;
  licenseNumber?: string;
  displayName?: string;
  chapterId?: string;
  chapterName?: string;
  branchName?: string;
  rejectionReason?: string;
}

// 인증 컨텍스트 타입
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isPending: boolean;
  isRejected: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthUser에서 역할 추출
 */
function extractUserRole(authUser: AuthUser): UserRole {
  const roleMap: Record<string, UserRole> = {
    pharmacist: 'pharmacist',
    pharmacy: 'pharmacist',
    admin: 'admin',
    operator: 'admin',
  };

  if (authUser.roleAssignments) {
    for (const assignment of authUser.roleAssignments) {
      if (assignment.isActive && roleMap[assignment.role]) {
        return roleMap[assignment.role];
      }
    }
  }

  return 'pharmacist'; // 기본값
}

/**
 * AuthUser에서 승인 상태 추출
 */
function extractApprovalStatus(authUser: AuthUser): ApprovalStatus {
  switch (authUser.status?.toLowerCase()) {
    case 'approved':
    case 'active':
      return 'approved';
    case 'rejected':
    case 'banned':
      return 'rejected';
    case 'pending':
    default:
      return 'pending';
  }
}

/**
 * AuthUser를 User로 변환
 */
function convertAuthUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: extractUserRole(authUser),
    approvalStatus: extractApprovalStatus(authUser),
    displayName: authUser.name,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 세션 확인 (Core Auth v2 /me 호출)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.getMe();
        if (response.success && response.data) {
          setUser(convertAuthUser(response.data));
        }
      } catch {
        // 세션 없음 - 정상 케이스
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);

      if (response.success && response.data?.user) {
        const convertedUser = convertAuthUser(response.data.user);
        setUser(convertedUser);

        // 승인 상태에 따른 메시지
        if (convertedUser.approvalStatus === 'pending') {
          return { success: true, message: 'pending' };
        }
        if (convertedUser.approvalStatus === 'rejected') {
          return { success: true, message: 'rejected' };
        }

        return { success: true };
      }

      return { success: false, message: response.message || '로그인에 실패했습니다.' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // 로그아웃 API 실패해도 로컬 상태는 정리
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const isApproved = user?.approvalStatus === 'approved';
  const isAdmin = user?.role === 'admin' && isApproved;
  const isPending = user?.approvalStatus === 'pending';
  const isRejected = user?.approvalStatus === 'rejected';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isApproved,
      isAdmin,
      isPending,
      isRejected,
      isLoading,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

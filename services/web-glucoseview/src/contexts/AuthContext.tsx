import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

// 테스트 사용자 데이터
const testUsers = [
  {
    id: 'pharmacist-test-1',
    name: '테스트 약사',
    email: 'pharmacist@test.test',
    password: 'testID1234',
    role: 'pharmacist' as UserRole,
    approvalStatus: 'approved' as ApprovalStatus,
    pharmacyName: '테스트약국',
    phone: '010-1234-5678',
    licenseNumber: 'PH-12345',
    displayName: '테스트약사',
    chapterId: 'a1111111-1111-1111-1111-111111111111',
    chapterName: '강남분회',
    branchName: '서울지부',
  },
  {
    id: 'admin-test-1',
    name: '테스트 관리자',
    email: 'admin@test.test',
    password: 'adminID1234',
    role: 'admin' as UserRole,
    approvalStatus: 'approved' as ApprovalStatus,
    pharmacyName: '관리약국',
    phone: '010-9876-5432',
    licenseNumber: 'PH-00001',
    displayName: '관리자',
    chapterId: 'a1111111-1111-1111-1111-111111111111',
    chapterName: '강남분회',
    branchName: '서울지부',
  },
  // 기존 테스트 계정 (하위 호환)
  {
    id: 'user-1',
    name: 'Rena',
    email: 'test@test.test',
    password: 'testID1234',
    role: 'pharmacist' as UserRole,
    approvalStatus: 'approved' as ApprovalStatus,
    pharmacyName: '',
    phone: '',
    licenseNumber: '',
    displayName: 'Rena',
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 페이지 로드 시 저장된 세션 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('glucoseview_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('glucoseview_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // 실제로는 API 호출
    const foundUser = testUsers.find(
      u => u.email === email && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('glucoseview_user', JSON.stringify(userWithoutPassword));

      // 승인 상태에 따른 메시지
      if (foundUser.approvalStatus === 'pending') {
        return { success: true, message: 'pending' };
      }
      if (foundUser.approvalStatus === 'rejected') {
        return { success: true, message: 'rejected' };
      }

      return { success: true };
    }
    return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('glucoseview_user');
    // 사용자별 데이터는 유지 (다른 계정으로 로그인 시 사용)
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('glucoseview_user', JSON.stringify(updatedUser));
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

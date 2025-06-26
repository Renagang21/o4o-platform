import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Supplier, Retailer, LoginRequest } from '../types/user';
import { allMockUsers, TEST_PASSWORD } from '../mocks/users';

interface AuthState {
  user: User | Supplier | Retailer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User | Supplier | Retailer) => void;
  clearError: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async ({ email, password, userType }) => {
        set({ isLoading: true, error: null });
        
        try {
          // Mock 로그인 로직 - 실제로는 API 호출
          await new Promise(resolve => setTimeout(resolve, 1000)); // 로딩 시뮬레이션
          
          // Mock 데이터에서 사용자 찾기
          const user = allMockUsers.find(
            u => u.email === email && u.userType === userType
          );
          
          if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
          }
          
          // 비밀번호 확인 (Mock에서는 모두 같은 비밀번호)
          if (password !== TEST_PASSWORD) {
            throw new Error('비밀번호가 올바르지 않습니다.');
          }
          
          // 상태 확인
          if (user.status === 'inactive') {
            throw new Error('비활성화된 계정입니다.');
          }
          
          if (user.status === 'pending') {
            throw new Error('승인 대기 중인 계정입니다.');
          }
          
          // 공급자/리테일러의 경우 승인 상태 확인
          if ('approvalStatus' in user && user.approvalStatus !== 'approved') {
            if (user.approvalStatus === 'pending') {
              throw new Error('관리자 승인을 기다리고 있습니다.');
            } else if (user.approvalStatus === 'rejected') {
              throw new Error('승인이 거부된 계정입니다.');
            }
          }
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // 로그인 시간 업데이트 (실제로는 API에서 처리)
          console.log('로그인 성공:', user);
          
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
        
        // 로컬 스토리지에서 인증 정보 제거
        localStorage.removeItem('auth-storage');
        
        console.log('로그아웃 완료');
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: () => {
        // 페이지 새로고침 시 인증 상태 확인
        const state = get();
        if (state.user && state.isAuthenticated) {
          console.log('인증 상태 유지:', state.user);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// 사용자 타입별 권한 확인 헬퍼 함수
export const isAdmin = (user: User | Supplier | Retailer | null): boolean => {
  return user?.userType === 'admin';
};

export const isSupplier = (user: User | Supplier | Retailer | null): boolean => {
  return user?.userType === 'supplier';
};

export const isRetailer = (user: User | Supplier | Retailer | null): boolean => {
  return user?.userType === 'retailer';
};

export const isCustomer = (user: User | Supplier | Retailer | null): boolean => {
  return user?.userType === 'customer';
};

// 리테일러 등급 확인 헬퍼 함수
export const getRetailerGrade = (user: User | Supplier | Retailer | null): string | null => {
  if (user && 'grade' in user) {
    return user.grade;
  }
  return null;
};
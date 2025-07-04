import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Supplier, Retailer, LoginRequest } from '../types/user';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

interface AuthState {
  user: User | Supplier | Retailer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User | Supplier | Retailer) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async ({ email, password }) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
          }

          const data = await response.json();
          const { token, user: apiUser } = data;
          
          // Convert API user data to frontend user type
          const user: User = {
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name || '',
            userType: mapRoleToUserType(apiUser.role),
            status: mapApiStatusToFrontendStatus(apiUser.status),
            createdAt: new Date(apiUser.createdAt || Date.now()),
            lastLoginAt: new Date(),
          };

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          console.log('로그인 성공:', user);
          
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          });
        }
      },

      logout: () => {
        const { token } = get();
        
        // API에 로그아웃 요청 (선택사항)
        if (token) {
          fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }).catch(console.error);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        
        // 로컬 스토리지에서 인증 정보 제거
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('auth_token');
        
        console.log('로그아웃 완료');
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const apiUser = data.user;
            
            const user: User = {
              id: apiUser.id,
              email: apiUser.email,
              name: apiUser.name || '',
              userType: mapRoleToUserType(apiUser.role),
              status: mapApiStatusToFrontendStatus(apiUser.status),
              createdAt: new Date(apiUser.createdAt || Date.now()),
              lastLoginAt: new Date(apiUser.lastLoginAt || Date.now()),
            };
            
            set({ user, isAuthenticated: true });
            console.log('인증 상태 유지:', user);
          } else {
            // Token invalid, logout
            get().logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// API 역할을 프론트엔드 사용자 타입으로 매핑
const mapRoleToUserType = (role: string): 'admin' | 'supplier' | 'retailer' | 'customer' => {
  switch (role) {
    case 'admin':
    case 'administrator':
    case 'manager':
      return 'admin';
    case 'business':
      return 'supplier'; // 비즈니스 사용자를 공급자로 매핑
    case 'affiliate':
      return 'retailer'; // 제휴사를 리테일러로 매핑
    default:
      return 'customer';
  }
};

// API 상태를 프론트엔드 상태로 매핑
const mapApiStatusToFrontendStatus = (status: string): 'active' | 'inactive' | 'pending' => {
  switch (status) {
    case 'approved':
      return 'active';
    case 'suspended':
      return 'inactive';
    case 'pending':
      return 'pending';
    default:
      return 'pending';
  }
};

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
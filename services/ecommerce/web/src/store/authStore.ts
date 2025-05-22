import create from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const res = await fetch('/store/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error('로그인 실패');
        const data = await res.json();
        set({ token: data.access_token, isAuthenticated: true });
        // 사용자 정보도 불러오기
        const userRes = await fetch('/store/customers/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          set({ user: userData.customer });
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('auth');
      },
      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        const res = await fetch('/store/customers/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          set({ user: data.customer, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false, token: null });
        }
      },
    }),
    { name: 'auth' }
  )
); 
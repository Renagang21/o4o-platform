import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthState {
  admin: { email: string; role: 'superadmin' | 'manager' | 'editor' | 'viewer' } | null;
  token: string | null;
  isAdminAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAdminAuthenticated: false,
      login: async (email, password) => {
        // 데모: 이메일에 따라 역할 부여
        let role: 'superadmin' | 'manager' | 'editor' | 'viewer' = 'viewer';
        if (email.startsWith('admin@super')) role = 'superadmin';
        else if (email.startsWith('admin@manager')) role = 'manager';
        else if (email.startsWith('admin@editor')) role = 'editor';
        else if (email.startsWith('admin@')) role = 'viewer';
        else throw new Error('관리자 계정이 아닙니다.');
        set({ token: 'admin-jwt-demo', isAdminAuthenticated: true, admin: { email, role } });
      },
      logout: () => {
        set({ admin: null, token: null, isAdminAuthenticated: false });
        localStorage.removeItem('admin-auth');
      },
      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAdminAuthenticated: false, admin: null });
          return;
        }
        // 실제 운영에서는 토큰 검증 필요
        set({ isAdminAuthenticated: true });
      },
    }),
    { name: 'admin-auth' }
  )
);

export async function logAdminAction(action: string, target: string, detail: string) {
  const state = useAdminAuthStore.getState();
  const admin = state.admin;
  if (!admin) return;
  const log = {
    timestamp: new Date().toISOString(),
    adminEmail: admin.email,
    action,
    target,
    detail,
  };
  // 실제 구현 시 서버로 전송
  try {
    await fetch('/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
  } catch (e) {
    // 네트워크 오류 등 무시(로컬 데모)
  }
} 
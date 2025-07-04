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

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAdminAuthenticated: false,
      login: async (email, password) => {
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
          const { token, user } = data;
          
          // Check if user has admin privileges
          if (!['admin', 'administrator', 'manager', 'editor'].includes(user.role)) {
            throw new Error('Insufficient privileges');
          }

          // Map role to admin roles
          let adminRole: 'superadmin' | 'manager' | 'editor' | 'viewer' = 'viewer';
          if (user.role === 'admin' || user.role === 'administrator') adminRole = 'superadmin';
          else if (user.role === 'manager') adminRole = 'manager';
          else if (user.role === 'editor') adminRole = 'editor';
          
          set({ 
            token, 
            isAdminAuthenticated: true, 
            admin: { email: user.email, role: adminRole } 
          });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },
      logout: () => {
        set({ admin: null, token: null, isAdminAuthenticated: false });
        localStorage.removeItem('admin-auth');
        localStorage.removeItem('auth_token');
      },
      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAdminAuthenticated: false, admin: null });
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
            const user = data.user;
            
            // Check admin privileges
            if (['admin', 'administrator', 'manager', 'editor'].includes(user.role)) {
              let adminRole: 'superadmin' | 'manager' | 'editor' | 'viewer' = 'viewer';
              if (user.role === 'admin' || user.role === 'administrator') adminRole = 'superadmin';
              else if (user.role === 'manager') adminRole = 'manager';
              else if (user.role === 'editor') adminRole = 'editor';
              
              set({ 
                isAdminAuthenticated: true,
                admin: { email: user.email, role: adminRole }
              });
            } else {
              // Not an admin, logout
              get().logout();
            }
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
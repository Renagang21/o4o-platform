import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthUser } from '@/types'
import { apiClient } from './client'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  getCurrentUser: () => Promise<void>
  clearError: () => void
  isAdmin: () => boolean
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiClient.post('/auth/login', { email, password })
          const { user, token } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false
          })
          
          // Set authorization header for future requests
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            loading: false
          })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
        
        // Clear authorization header
        delete apiClient.defaults.headers.common['Authorization']
      },

      getCurrentUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          const response = await apiClient.get('/auth/me')
          set({ user: response.data, isAuthenticated: true })
        } catch {
          // Token might be expired
          get().logout()
        }
      },

      clearError: () => set({ error: null }),

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin' || user?.permissions?.includes('admin.access') || false
      },

      hasPermission: (permission: string) => {
        const { user } = get()
        if (!user) return false
        
        // Super admin has all permissions
        if (user.role === 'admin') return true
        
        // Check specific permission
        return user.permissions?.includes(permission) || false
      }
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // Set authorization header on app load
        if (state?.token) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
      }
    }
  )
)
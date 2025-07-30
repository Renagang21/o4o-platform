import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ssoService } from '@/api/sso'

interface User {
  id: string
  email: string
  name: string
  role: string
  roles?: string[]
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
  checkSSOSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        })
        
        // localStorage에도 토큰 저장 (호환성을 위해)
        localStorage.setItem('authToken', token)
        
        // Set SSO cookie for cross-domain authentication
        ssoService.setCrossDomainCookie(token)
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
        
        // Clear SSO cookie
        ssoService.clearCrossDomainCookie()
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      checkSSOSession: async () => {
        try {
          set({ isLoading: true })
          const response = await ssoService.checkSession()
          
          if (response.isAuthenticated && response.user) {
            // Get token from cookie or generate a temporary one
            const token = ssoService.getTokenFromCookie() || get().token || 'sso-token'
            
            set({
              user: {
                id: response.user.id,
                email: response.user.email,
                name: response.user.name,
                role: response.user.roles?.[0] || 'user',
                roles: response.user.roles
              },
              token,
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            })
          }
        } catch (error: any) {
          console.error('[Auth] SSO session check failed:', error)
          // 401 에러 시 자동 로그아웃
          if (error?.response?.status === 401) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            })
            // localStorage 정리
            localStorage.removeItem('auth-storage')
            localStorage.removeItem('authToken')
          } else {
            set({ isLoading: false })
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
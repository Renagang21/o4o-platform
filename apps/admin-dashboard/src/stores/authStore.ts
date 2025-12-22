import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ssoService } from '@/api/sso'

export interface User {
  id: string
  email: string
  name: string
  role: string
  roles?: string[]
  permissions?: string[]
  avatar?: string
  createdAt?: string
  // Domain extension properties (WO-DOMAIN-TYPE-EXTENSION)
  organizationId?: string
  organizationName?: string
  supplierId?: string
  phone?: string
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
      isLoading: true, // 초기 로딩 상태를 true로 설정

      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        })
        
        // localStorage에도 토큰 저장 (호환성을 위해)
        localStorage.setItem('authToken', token)
        localStorage.setItem('accessToken', token)
        
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
        
        // localStorage 정리
        localStorage.removeItem('admin-auth-storage')
        localStorage.removeItem('authToken')
        localStorage.removeItem('accessToken')
        
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
          // 페이지 새로고침 시 저장된 토큰으로 먼저 인증 상태 복원 시도
          const storedAuth = localStorage.getItem('admin-auth-storage')
          if (storedAuth) {
            try {
              const parsedAuth = JSON.parse(storedAuth)
              const storedState = parsedAuth.state
              if (storedState?.token && storedState?.user && storedState?.isAuthenticated) {
                // 저장된 상태로 복원하고 SSO 체크는 스킵
                set({
                  user: storedState.user,
                  token: storedState.token,
                  isAuthenticated: true,
                  isLoading: false
                })
                
                // localStorage에도 토큰 설정
                localStorage.setItem('authToken', storedState.token)
                localStorage.setItem('accessToken', storedState.token)
                
                // 이미 인증된 상태이므로 SSO 체크 스킵
                return
              }
            } catch (parseError) {
              // Parse 오류 시 로컬 스토리지 정리
              localStorage.removeItem('admin-auth-storage')
            }
          }
          
          set({ isLoading: true })
          const response = await ssoService.checkSession()
          
          if (response.isAuthenticated && response.user) {
            // Get token from cookie or use stored token
            const token = ssoService.getTokenFromCookie() || get().token || 'sso-token'

            set({
              user: {
                id: response.user.id,
                email: response.user.email,
                name: response.user.name,
                role: response.user.roles?.[0] || 'user',
                roles: response.user.roles,
                permissions: response.user.permissions
              },
              token,
              isAuthenticated: true,
              isLoading: false
            })
            
            // localStorage 동기화
            localStorage.setItem('authToken', token)
            localStorage.setItem('accessToken', token)
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            })
            
            // localStorage 정리
            localStorage.removeItem('auth-storage')
            localStorage.removeItem('authToken')
            localStorage.removeItem('accessToken')
          }
        } catch (error: any) {
          // Error logging - use proper error handler
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
            localStorage.removeItem('accessToken')
          } else {
            set({ isLoading: false })
          }
        }
      }
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      // 저장/복원 시 추가 처리
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 복원 후 로딩 상태 해제
          state.isLoading = false
          
          // 복원된 토큰을 localStorage에도 설정
          if (state.token && state.isAuthenticated) {
            localStorage.setItem('authToken', state.token)
            localStorage.setItem('accessToken', state.token)
          }
        }
      }
    }
  )
)
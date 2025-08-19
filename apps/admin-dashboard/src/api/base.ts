import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.neture.co.kr',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Enable cross-domain cookies for SSO
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // 여러 소스에서 토큰 확인
    let token = useAuthStore.getState().token
    
    // authStore에 토큰이 없으면 localStorage에서 직접 확인
    if (!token) {
      token = localStorage.getItem('authToken')
    }
    
    // 그래도 없으면 admin-auth-storage에서 확인
    if (!token) {
      const adminStorage = localStorage.getItem('admin-auth-storage')
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage)
          if (parsed.state?.token) {
            token = parsed.state.token
          }
        } catch (e: any) {
          // Failed to parse admin-auth-storage
        }
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 개발 환경에서 API 요청 로깅
    if (import.meta.env.DEV) {
      //   headers: config.headers,
      //   data: config.data,
      //   params: config.params
      // })
    }
    
    return config
  },
  (error) => {
    // API Request Error
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 개발 환경에서 API 응답 로깅
    if (import.meta.env.DEV) {
      //   status: response.status,
      //   data: response.data
      // })
    }
    
    return response
  },
  (error: AxiosError) => {
    // API Error - details available in development tools
    
    if (error.response?.status === 401) {
      // Clear auth state on 401
      const currentPath = window.location.pathname
      
      // Clear all auth-related localStorage items
      localStorage.removeItem('auth-storage')
      localStorage.removeItem('authToken')
      localStorage.removeItem('admin-auth-storage')
      
      // Only logout and redirect if not already on login page
      // and not making auth-related requests
      if (currentPath !== '/login' && !error.config?.url?.includes('/auth')) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
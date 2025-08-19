import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // 먼저 authToken을 직접 확인
    let token = localStorage.getItem('authToken')
    
    // authToken이 없으면 admin-auth-storage에서 확인
    if (!token) {
      const adminStorage = localStorage.getItem('admin-auth-storage')
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage)
          if (parsed.state?.token) {
            token = parsed.state.token
          }
        } catch {
    // Removed console.warn
        }
      }
    }
    
    // 토큰이 있으면 헤더에 추가
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // 현재 경로가 로그인 페이지가 아닌 경우에만 리다이렉트
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        // 인증 정보가 있는지 확인
        const authToken = localStorage.getItem('authToken')
        const adminStorage = localStorage.getItem('admin-auth-storage')
        
        // 토큰이 전혀 없는 경우에만 로그인으로 리다이렉트
        if (!authToken && !adminStorage) {
          localStorage.removeItem('admin-auth-storage')
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          window.location.href = '/login'
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.')
        } else {
          // 토큰은 있지만 401이 발생한 경우 - 토큰이 만료되었을 가능성
          toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
          // 토큰 제거하고 리다이렉트
          localStorage.removeItem('admin-auth-storage')
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000) // 토스트 메시지를 볼 시간을 주기 위해 약간의 딜레이
        }
      }
    } else if (error.response?.status === 403) {
      toast.error('접근 권한이 없습니다.')
    } else if (error.response?.status >= 500) {
      toast.error('서버 오류가 발생했습니다.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('요청 시간이 초과되었습니다.')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
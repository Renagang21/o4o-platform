import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

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
    const token = localStorage.getItem('admin-auth-storage')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        if (parsed.state?.token) {
          config.headers['Authorization'] = `Bearer ${parsed.state.token}`
        }
      } catch (e) {
        console.warn('Failed to parse stored auth token')
      }
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
      // Token expired or invalid
      localStorage.removeItem('admin-auth-storage')
      window.location.href = '/login'
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.')
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
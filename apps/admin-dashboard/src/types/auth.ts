export interface User {
  id: string
  email: string
  name?: string
  role: 'user' | 'vendor' | 'admin' | 'supplier' | 'seller' | 'affiliate'
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name?: string
  role?: string
}
import { create } from 'zustand'

export interface User {
  id: string
  email: string
  name: string
  role: string
  roles?: string[]
  permissions?: string[]
  /** 스코프 목록 (WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1) */
  scopes?: string[]
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
  isAuthenticated: boolean
  isLoading: boolean
  sync: (user: User | null, isLoading: boolean) => void
  logout: () => void
}

/** A memory-only projection. AuthProvider owns login, cookies and session restoration. */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sync: (user, isLoading) => set({ user, isAuthenticated: !!user && !isLoading, isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}))

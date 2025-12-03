import { createContext, useContext } from 'react';

// Type definitions (to avoid circular dependency)
export interface User {
  id: string | number;  // Support both string and number IDs
  email: string;
  name?: string;
  role?: string;  // Legacy single role (optional to match auth-client User type)
  roles?: string[];  // Multiple roles support (from User entity)
  currentRole?: string;  // Active role for role switching
  isApproved?: boolean;
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionStatus {
  isValid: boolean;
  expiresAt: Date;
  remainingTime: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  authClient?: any; // AuthClient instance for API calls
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  getSessionStatus: () => SessionStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
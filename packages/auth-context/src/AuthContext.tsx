import { createContext, useContext } from 'react';

// Type definitions (to avoid circular dependency)
export interface User {
  id: string | number;  // Support both string and number IDs
  email: string;
  name?: string;
  role: string;
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
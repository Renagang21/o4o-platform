import { createContext, useContext } from 'react';
import type { User, SessionStatus } from '@o4o/types';

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
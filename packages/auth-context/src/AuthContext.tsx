import { createContext, useContext } from 'react';

// Type definitions (to avoid circular dependency)
export type UserStatus = 'pending' | 'active' | 'approved' | 'rejected' | 'suspended' | 'inactive' | string;

export interface RoleAssignment {
  id: string;
  userId?: string;  // Optional to match auth-client response
  role: string;
  isActive: boolean;
  validFrom: string | Date | null;
  validUntil: string | Date | null;
  assignedAt?: string | Date;
  assignedBy?: string | null;
}

// Compatible with @o4o/types User interface but with more flexible field requirements
export interface User {
  id: string | number;  // Support both string and number IDs
  email: string;
  name?: string | null;  // Optional for backward compatibility
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  status: UserStatus | string;  // Allow string for flexibility
  isEmailVerified?: boolean;
  lastLoginAt?: string | Date | null;
  createdAt?: string | Date;  // Optional since login responses may not include it
  updatedAt?: string | Date;  // Optional since login responses may not include it

  // Legacy role field (deprecated, use assignments)
  role?: string;
  roles?: string[];  // Multiple roles support
  currentRole?: string;  // Active role for role switching
  isApproved?: boolean;

  // P0 RBAC: Role assignments
  assignments?: RoleAssignment[];

  // Direct permissions (not from roles)
  permissions?: string[];

  // Metadata
  metadata?: Record<string, unknown>;

  // Domain extension properties (WO-DOMAIN-TYPE-EXTENSION)
  organizationId?: string;
  organizationName?: string;
  supplierId?: string;
  phone?: string;
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
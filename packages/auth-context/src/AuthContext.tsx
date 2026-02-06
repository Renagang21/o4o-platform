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

/**
 * Super Operator Level
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1
 *
 * - platform: 전체 플랫폼 관리 (모든 서비스 접근)
 * - service: 특정 서비스 운영
 * - branch: 특정 분회/지부 운영
 */
export type OperatorLevel = 'platform' | 'service' | 'branch';

// Compatible with @o4o/types User interface but with more flexible field requirements
export interface User {
  id: string | number;  // Support both string and number IDs
  email: string;
  name?: string | null;  // Optional for backward compatibility
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;  // WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1
  displayName?: string | null;  // 계산된 표시명
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

  // WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: Super Operator 필드
  isSuperOperator?: boolean;
  operatorScopes?: string[];  // ['platform', 'kpa', 'kpa:branch:123']
  operatorLevel?: OperatorLevel;
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
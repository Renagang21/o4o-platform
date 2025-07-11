// Authentication related types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'business' | 'affiliate' | 'customer';
  isApproved?: boolean;
  avatar?: string;
  lastLoginAt?: Date;
  status?: 'active' | 'inactive' | 'pending';
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionStatus {
  isValid: boolean;
  expiresAt: Date;
  remainingTime: number;
}
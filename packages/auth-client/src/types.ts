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

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
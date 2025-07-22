export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'business' | 'affiliate' | 'customer' | 'seller' | 'supplier';
  isApproved?: boolean;
  avatar?: string;
  lastLoginAt?: Date;
  status?: 'active' | 'inactive' | 'pending';
  businessInfo?: any;
  permissions?: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string; // Optional for cookie-based auth
  refreshToken?: string; // Optional for cookie-based auth
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'seller' | 'supplier';
}
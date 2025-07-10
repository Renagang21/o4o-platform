// O4O Platform Common Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'business' | 'affiliate';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  service: string;
}

export type UserRole = 'admin' | 'user' | 'business' | 'affiliate';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface DashboardMetrics {
  userCount: number;
  orderCount: number;
  revenue: number;
  lastUpdated: Date;
}
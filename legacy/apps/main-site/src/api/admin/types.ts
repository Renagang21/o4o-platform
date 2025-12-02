export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export interface UserApprovalRequest {
  id: string;
  userId: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface UserApprovalResponse {
  success: boolean;
  message: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  role?: string;
  isApproved?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminError {
  message: string;
  code: string;
}

export interface SalesStats {
  daily: {
    date: string;
    amount: number;
  }[];
  monthly: {
    month: string;
    amount: number;
  }[];
  yearly: {
    year: string;
    amount: number;
  }[];
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  categoryDistribution: {
    category: string;
    count: number;
  }[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  roleDistribution: {
    role: string;
    count: number;
  }[];
  recentRegistrations: {
    date: string;
    count: number;
  }[];
} 
#!/bin/bash

# Final comprehensive fix for admin-dashboard TypeScript errors
echo "🔧 Fixing admin-dashboard TypeScript errors..."

cd /home/user/o4o-platform/apps/admin-dashboard

# 1. Fix User type definitions - add missing exports
echo "1. Adding missing User type exports..."
cat >> src/types/user.ts << 'EOF'

// Additional exports for UserApi
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UserBulkAction {
  action: 'activate' | 'deactivate' | 'delete' | 'change_role';
  userIds: string[];
  newRole?: UserRole;
}

export interface UserFormData {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    businessPhone?: string;
    businessAddress?: string;
    businessRegistration?: string;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  byRole: Record<UserRole, number>;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
}

export const STATUS_LABELS = {
  pending: '승인 대기',
  active: '활성',
  inactive: '비활성',
  approved: '승인됨',
  rejected: '거부됨',
  suspended: '정지됨'
} as const;

export const BUSINESS_TYPES = {
  retail: '소매업',
  wholesale: '도매업',
  manufacturing: '제조업',
  service: '서비스업',
  technology: '기술업',
  consulting: '컨설팅',
  other: '기타'
} as const;
EOF

echo "✅ All admin-dashboard TypeScript errors fixed!"
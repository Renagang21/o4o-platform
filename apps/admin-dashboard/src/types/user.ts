import { User as BaseUser } from '@o4o/types';

export interface BusinessInfo {
  businessName?: string;
  businessType?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessRegistration?: string;
  businessNumber?: string;
  representativeName?: string;
  contactPhone?: string;
}

export interface User extends BaseUser {
  lastLogin?: Date;
  last_login?: Date;
  phone?: string;
  businessInfo?: BusinessInfo;
  createdAt?: Date;
  created_at?: Date;
}

export type UserRole = 'admin' | 'business' | 'affiliate' | 'partner' | 'customer' | 'seller' | 'supplier' | 'vendor' | 'manager' | 'retailer';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'approved' | 'rejected' | 'suspended';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  business: '사업자', 
  affiliate: '제휴사',
  partner: '파트너',
  customer: '고객',
  seller: '판매자',
  supplier: '공급업체',
  vendor: '벤더',
  manager: '매니저',
  retailer: '소매업체'
};

export const roleDisplayNames: Record<UserRole, string> = {
  admin: '관리자',
  business: '사업자',
  affiliate: '제휴사',
  partner: '파트너',
  customer: '고객',
  seller: '판매자',
  supplier: '공급업체',
  vendor: '벤더',
  manager: '매니저',
  retailer: '소매업체'
};

// Additional exports for UserApi
export interface UserFilters {
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  businessType?: string;
}

export interface UserBulkAction {
  action: 'activate' | 'deactivate' | 'delete' | 'change_role' | 'approve' | 'reject';
  userIds: string[];
  newRole?: UserRole;
  reason?: string;
}

export interface UserFormData {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  phone?: string;
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    businessPhone?: string;
    businessAddress?: string;
    businessRegistration?: string;
    businessNumber?: string;
    representativeName?: string;
    contactPhone?: string;
  };
  sendWelcomeEmail?: boolean;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
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

export const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPES).map(([key, value]) => ({
  value: key,
  label: value
}));

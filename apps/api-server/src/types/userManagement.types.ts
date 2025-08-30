// User Management API Types

import { UserRole, UserStatus } from '../entities/User';
import { ActivityType, ActivityCategory, ActivityMetadata } from '../entities/UserActivityLog';
import { BusinessType, BusinessSize, Industry, BusinessAddress, BusinessContact, BusinessFinancials, BusinessLegal } from '../entities/BusinessInfo';

// Common API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  property: string;
  constraints: Record<string, string>;
}

export interface PaginationParams {
  page?: string;
  limit?: string;
}

export interface PaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// User Activity Log Types
export interface UserActivityLogResponse {
  id: string;
  activityType: ActivityType;
  activityCategory: ActivityCategory;
  title: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: ActivityMetadata;
  isSystemGenerated: boolean;
  isSecurityRelated: boolean;
  isAdminAction: boolean;
  performedBy?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  createdAt: Date;
}

export interface UserActivityLogListResponse {
  activities: UserActivityLogResponse[];
  pagination: PaginationResponse;
}

export interface CreateUserActivityRequest {
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: ActivityMetadata;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserActivitySummaryResponse {
  totalActivities: number;
  securityRelated: number;
  adminActions: number;
  systemGenerated: number;
  byCategory: Record<ActivityCategory, number>;
  recentActivity: {
    id: string;
    type: ActivityType;
    title: string;
    createdAt: Date;
  }[];
}

// User Role Management Types
export interface RoleResponse {
  value: UserRole;
  label: string;
  permissions: string[];
  permissionCount: number;
}

export interface UserRoleResponse {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  roleLabel: string;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
  reason?: string;
}

export interface PermissionResponse {
  key: string;
  description: string;
  granted: boolean;
}

export interface PermissionsResponse {
  all: PermissionResponse[];
  grouped: {
    users: PermissionResponse[];
    content: PermissionResponse[];
    admin: PermissionResponse[];
    acf: PermissionResponse[];
    cpt: PermissionResponse[];
    shortcodes: PermissionResponse[];
    api: PermissionResponse[];
  };
  rolePermissions: string[];
}

export interface UserPermissionCheckResponse {
  userId: string;
  role: UserRole;
  permission: string;
  granted: boolean;
}

export interface RoleStatisticsResponse {
  role: UserRole;
  label: string;
  count: number;
  permissions: number;
}

export interface RoleStatisticsSummary {
  roleDistribution: RoleStatisticsResponse[];
  totalUsers: number;
  summary: {
    admins: number;
    activeUsers: number;
    pendingUsers: number;
  };
}

// User Statistics Types
export interface UserStatisticsOverview {
  totalUsers: number;
  totalBetaUsers: number;
  totalActivities: number;
  activeUsers: number;
  period: string;
}

export interface UsersByRoleResponse {
  role: UserRole;
  count: number;
  label: string;
}

export interface UsersByStatusResponse {
  status: UserStatus;
  count: number;
  label: string;
}

export interface RegistrationStatsResponse {
  daily: { date: string; count: number }[];
  total: number;
}

export interface ActivityStatisticsResponse {
  byCategory: {
    category: ActivityCategory;
    count: number;
    label: string;
  }[];
  daily: { date: string; count: number }[];
  topTypes: {
    type: ActivityType;
    count: number;
    label: string;
  }[];
}

export interface GeographicDistributionResponse {
  countries: { country: string; count: number }[];
  cities: { city: string; country: string; count: number }[];
}

export interface TopActiveUserResponse {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: UserRole;
  activityCount: number;
}

export interface SecurityStatisticsResponse {
  totalSecurityActivities: number;
  failedLogins: number;
  suspiciousIPs: {
    ipAddress: string;
    userCount: number;
    activityCount: number;
  }[];
}

export interface UserStatisticsResponse {
  overview: UserStatisticsOverview;
  usersByRole: UsersByRoleResponse[];
  usersByStatus: UsersByStatusResponse[];
  betaUsersByStatus: UsersByStatusResponse[];
  registrations: RegistrationStatsResponse;
  activity: ActivityStatisticsResponse;
  geographic: GeographicDistributionResponse;
  topActiveUsers: TopActiveUserResponse[];
  security: SecurityStatisticsResponse;
}

export interface UserGrowthTrendResponse {
  year: number;
  month: number;
  count: number;
  monthName: string;
  cumulative?: number;
}

export interface RetentionCohortResponse {
  cohortMonth: string;
  totalUsers: number;
  activeUsers: number;
  retentionRate: number;
}

// Business Info Types
export interface BusinessInfoResponse {
  id: string;
  userId: string;
  businessName: string;
  tradingName?: string;
  description?: string;
  businessType: BusinessType;
  businessTypeDisplay: string;
  industry: Industry;
  industryDisplay: string;
  businessSize?: BusinessSize;
  businessSizeDisplay: string;
  address: BusinessAddress;
  billingAddress?: BusinessAddress;
  contact?: BusinessContact;
  financials?: BusinessFinancials;
  legal?: BusinessLegal;
  services?: string[];
  markets?: string[];
  timezone?: string;
  currency?: string;
  language?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationNotes?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  certifications?: string[];
  licenses?: string[];
  fullBusinessName: string;
  formattedAddress: string;
  isComplete: boolean;
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessInfoRequest {
  businessName: string;
  tradingName?: string;
  description?: string;
  businessType: BusinessType;
  industry: Industry;
  businessSize?: BusinessSize;
  address: BusinessAddress;
  billingAddress?: BusinessAddress;
  contact?: BusinessContact;
  financials?: BusinessFinancials;
  legal?: BusinessLegal;
  services?: string[];
  markets?: string[];
  timezone?: string;
  currency?: string;
  language?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  certifications?: string[];
  licenses?: string[];
}

export interface UpdateBusinessInfoRequest extends Partial<CreateBusinessInfoRequest> {}

export interface VerifyBusinessInfoRequest {
  verificationNotes?: string;
}

export interface BusinessTypeResponse {
  value: BusinessType;
  label: string;
}

export interface BusinessSizeResponse {
  value: BusinessSize;
  label: string;
}

export interface IndustryResponse {
  value: Industry;
  label: string;
}

export interface BusinessStatisticsResponse {
  overview: {
    totalBusinessInfo: number;
    verifiedBusinessInfo: number;
    verificationRate: number;
  };
  businessTypes: {
    type: BusinessType;
    count: number;
    label: string;
  }[];
  industries: {
    industry: Industry;
    count: number;
    label: string;
  }[];
  businessSizes: {
    size: BusinessSize;
    count: number;
    label: string;
  }[];
  completion: {
    complete: number;
    mostlyComplete: number;
    partiallyComplete: number;
    incomplete: number;
  };
}

// Express Request Extensions
// Note: This is already declared in auth.ts, so commenting out to avoid conflicts
// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: string;
//         email: string;
//         role: UserRole;
//         status: UserStatus;
//       };
//     }
//   }
// }

// API Parameter Types
export interface UserActivityLogParams {
  id: string;
}

export interface UserActivityLogQuery extends PaginationParams {
  category?: ActivityCategory;
  type?: ActivityType;
  startDate?: string;
  endDate?: string;
  includeSystemGenerated?: string;
}

export interface UserStatisticsQuery {
  days?: string;
}

export interface UserGrowthQuery {
  months?: string;
}

export interface UserRetentionQuery {
  cohortMonths?: string;
}

export interface PermissionQuery {
  role?: UserRole;
}

export interface PermissionCheckQuery {
  permission: string;
}
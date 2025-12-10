/**
 * LMS-Yaksa API Client
 *
 * API client for Yaksa LMS admin operations
 */

import { apiClient } from '../api-client';

const BASE_PATH = '/api/v1/lms/yaksa';

// ============================================
// Types
// ============================================

export interface LicenseProfile {
  id: string;
  userId: string;
  organizationId?: string;
  licenseNumber: string;
  licenseIssuedAt?: string;
  licenseExpiresAt?: string;
  totalCredits: number;
  currentYearCredits: number;
  isRenewalRequired: boolean;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequiredCoursePolicy {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  requiredCourseIds: string[];
  requiredCredits: number;
  targetMemberTypes?: string[];
  validFrom?: string;
  validUntil?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditRecord {
  id: string;
  userId: string;
  courseId?: string;
  creditType: 'course_completion' | 'attendance' | 'external' | 'manual_adjustment';
  creditsEarned: number;
  earnedAt: string;
  creditYear: number;
  certificateId?: string;
  enrollmentId?: string;
  courseTitle?: string;
  isVerified: boolean;
  verifiedBy?: string;
  note?: string;
  createdAt: string;
}

export interface CourseAssignment {
  id: string;
  userId: string;
  organizationId: string;
  courseId: string;
  policyId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  isCompleted: boolean;
  completedAt?: string;
  dueDate?: string;
  assignedAt: string;
  assignedBy?: string;
  enrollmentId?: string;
  progressPercent: number;
  priority: number;
  isMandatory: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  organization: { id: string };
  assignments: {
    totalAssignments: number;
    completedAssignments: number;
    activeAssignments: number;
    overdueAssignments: number;
    completionRate: number;
    memberCount: number;
  };
  policies: {
    activeCount: number;
  };
  members: {
    totalProfiles: number;
    profilesRequiringRenewal: number;
    totalCreditsEarned: number;
    averageCreditsPerMember: number;
  };
}

export interface DashboardData {
  overview: {
    totalMembers: number;
    membersRequiringRenewal: number;
    activePolicies: number;
    requiredCourses: number;
  };
  assignments: {
    totalAssignments: number;
    completedAssignments: number;
    activeAssignments: number;
    overdueCount: number;
    completionRate: number;
    memberCount: number;
  };
  credits: {
    totalEarned: number;
    averagePerMember: number;
    pendingVerification: number;
  };
  alerts: {
    overdueAssignments: number;
    unverifiedCredits: number;
    renewalRequired: number;
  };
}

export interface CreditSummary {
  totalCredits: number;
  currentYearCredits: number;
  byYear: Record<number, number>;
  byType: Record<string, number>;
  unverifiedCredits: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// ============================================
// License Profiles API
// ============================================

export const licenseProfilesApi = {
  getByUserId: async (userId: string): Promise<ApiResponse<LicenseProfile>> => {
    const response = await apiClient.get(`${BASE_PATH}/license-profiles/${userId}`);
    return response.data;
  },

  create: async (data: Partial<LicenseProfile>): Promise<ApiResponse<LicenseProfile>> => {
    const response = await apiClient.post(`${BASE_PATH}/license-profiles`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<LicenseProfile>): Promise<ApiResponse<LicenseProfile>> => {
    const response = await apiClient.patch(`${BASE_PATH}/license-profiles/${id}`, data);
    return response.data;
  },

  recalculateCredits: async (id: string): Promise<ApiResponse<{ profileId: string; totalCredits: number }>> => {
    const response = await apiClient.post(`${BASE_PATH}/license-profiles/${id}/recalculate-credits`);
    return response.data;
  },

  checkRenewal: async (id: string, requiredCredits?: number): Promise<ApiResponse<{ profileId: string; isRenewalRequired: boolean; requiredCredits: number }>> => {
    const response = await apiClient.post(`${BASE_PATH}/license-profiles/${id}/check-renewal`, { requiredCredits });
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`${BASE_PATH}/license-profiles/${id}`);
    return response.data;
  },
};

// ============================================
// Required Course Policy API
// ============================================

export const policiesApi = {
  getAll: async (organizationId: string): Promise<ApiResponse<RequiredCoursePolicy[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/policies/required-courses`, {
      params: { organizationId },
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.get(`${BASE_PATH}/policies/required-courses/${id}`);
    return response.data;
  },

  create: async (data: Partial<RequiredCoursePolicy> & { organizationId: string }): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.post(`${BASE_PATH}/policies/required-courses`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<RequiredCoursePolicy>): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.patch(`${BASE_PATH}/policies/required-courses/${id}`, data);
    return response.data;
  },

  activate: async (id: string): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.post(`${BASE_PATH}/policies/required-courses/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.post(`${BASE_PATH}/policies/required-courses/${id}/deactivate`);
    return response.data;
  },

  addCourse: async (policyId: string, courseId: string): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.post(`${BASE_PATH}/policies/required-courses/${policyId}/courses/${courseId}`);
    return response.data;
  },

  removeCourse: async (policyId: string, courseId: string): Promise<ApiResponse<RequiredCoursePolicy>> => {
    const response = await apiClient.delete(`${BASE_PATH}/policies/required-courses/${policyId}/courses/${courseId}`);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`${BASE_PATH}/policies/required-courses/${id}`);
    return response.data;
  },
};

// ============================================
// Credits API
// ============================================

export const creditsApi = {
  getByUserId: async (userId: string, year?: number): Promise<ApiResponse<CreditRecord[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/${userId}`, {
      params: year ? { year } : undefined,
    });
    return response.data;
  },

  getSummary: async (userId: string): Promise<ApiResponse<CreditSummary>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/${userId}/summary`);
    return response.data;
  },

  getAggregate: async (userId: string, groupBy?: 'year' | 'type'): Promise<ApiResponse<Record<string, number>>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/${userId}/aggregate`, {
      params: groupBy ? { groupBy } : undefined,
    });
    return response.data;
  },

  add: async (data: {
    userId: string;
    courseId?: string;
    credits: number;
    certificateId?: string;
    creditType?: string;
    courseTitle?: string;
    earnedAt?: string;
    note?: string;
  }): Promise<ApiResponse<CreditRecord>> => {
    const response = await apiClient.post(`${BASE_PATH}/credits`, data);
    return response.data;
  },

  addExternal: async (data: {
    userId: string;
    credits: number;
    note: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<CreditRecord>> => {
    const response = await apiClient.post(`${BASE_PATH}/credits/external`, data);
    return response.data;
  },

  addManualAdjustment: async (data: {
    userId: string;
    credits: number;
    note: string;
    verifiedBy: string;
  }): Promise<ApiResponse<CreditRecord>> => {
    const response = await apiClient.post(`${BASE_PATH}/credits/manual-adjustment`, data);
    return response.data;
  },

  verify: async (id: string, verifiedBy: string): Promise<ApiResponse<CreditRecord>> => {
    const response = await apiClient.post(`${BASE_PATH}/credits/${id}/verify`, { verifiedBy });
    return response.data;
  },

  reject: async (id: string, note: string): Promise<ApiResponse<CreditRecord>> => {
    const response = await apiClient.post(`${BASE_PATH}/credits/${id}/reject`, { note });
    return response.data;
  },

  getUnverified: async (): Promise<ApiResponse<CreditRecord[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/admin/unverified`);
    return response.data;
  },

  update: async (id: string, data: Partial<CreditRecord>): Promise<ApiResponse<CreditRecord>> => {
    const response = await apiClient.patch(`${BASE_PATH}/credits/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`${BASE_PATH}/credits/${id}`);
    return response.data;
  },
};

// ============================================
// Course Assignments API
// ============================================

export const assignmentsApi = {
  getByUserId: async (userId: string, activeOnly?: boolean): Promise<ApiResponse<CourseAssignment[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/course-assignments/${userId}`, {
      params: activeOnly ? { activeOnly: 'true' } : undefined,
    });
    return response.data;
  },

  getUserStatistics: async (userId: string): Promise<ApiResponse<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    expired: number;
    cancelled: number;
    overdue: number;
    completionRate: number;
  }>> => {
    const response = await apiClient.get(`${BASE_PATH}/course-assignments/${userId}/statistics`);
    return response.data;
  },

  assign: async (data: {
    userId: string;
    organizationId: string;
    courseId: string;
    policyId?: string;
    dueDate?: string;
    assignedBy?: string;
    isMandatory?: boolean;
    priority?: number;
    note?: string;
  }): Promise<ApiResponse<CourseAssignment>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments`, data);
    return response.data;
  },

  bulkAssign: async (data: {
    userIds: string[];
    organizationId: string;
    courseId: string;
    policyId?: string;
    dueDate?: string;
    assignedBy?: string;
    isMandatory?: boolean;
  }): Promise<ApiResponse<CourseAssignment[]>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments/bulk`, data);
    return response.data;
  },

  assignByPolicy: async (data: {
    policyId: string;
    userIds: string[];
    assignedBy?: string;
  }): Promise<ApiResponse<CourseAssignment[]>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments/by-policy`, data);
    return response.data;
  },

  markComplete: async (id: string, enrollmentId?: string): Promise<ApiResponse<CourseAssignment>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments/${id}/complete`, { enrollmentId });
    return response.data;
  },

  updateProgress: async (id: string, progressPercent: number): Promise<ApiResponse<CourseAssignment>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments/${id}/progress`, { progressPercent });
    return response.data;
  },

  linkEnrollment: async (id: string, enrollmentId: string): Promise<ApiResponse<CourseAssignment>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments/${id}/link-enrollment`, { enrollmentId });
    return response.data;
  },

  cancel: async (id: string): Promise<ApiResponse<CourseAssignment>> => {
    const response = await apiClient.post(`${BASE_PATH}/course-assignments/${id}/cancel`);
    return response.data;
  },

  update: async (id: string, data: Partial<CourseAssignment>): Promise<ApiResponse<CourseAssignment>> => {
    const response = await apiClient.patch(`${BASE_PATH}/course-assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`${BASE_PATH}/course-assignments/${id}`);
    return response.data;
  },
};

// ============================================
// Admin API
// ============================================

export const adminApi = {
  getStats: async (organizationId: string): Promise<ApiResponse<AdminStats>> => {
    const response = await apiClient.get(`${BASE_PATH}/admin/stats`, {
      params: { organizationId },
    });
    return response.data;
  },

  getDashboard: async (organizationId: string): Promise<ApiResponse<DashboardData>> => {
    const response = await apiClient.get(`${BASE_PATH}/admin/dashboard`, {
      params: { organizationId },
    });
    return response.data;
  },

  getLicenseExpiring: async (organizationId?: string): Promise<ApiResponse<LicenseProfile[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/admin/license-expiring`, {
      params: organizationId ? { organizationId } : undefined,
    });
    return response.data;
  },

  getPendingRequiredCourses: async (organizationId: string): Promise<ApiResponse<{
    summary: {
      totalRequiredCourses: number;
      totalAssignments: number;
      totalCompleted: number;
      totalPending: number;
      totalOverdue: number;
    };
    courses: Array<{
      courseId: string;
      totalAssigned: number;
      completed: number;
      inProgress: number;
      pending: number;
      overdue: number;
      completionRate: number;
    }>;
  }>> => {
    const response = await apiClient.get(`${BASE_PATH}/admin/pending-required-courses`, {
      params: { organizationId },
    });
    return response.data;
  },

  getOverdueAssignments: async (organizationId?: string): Promise<ApiResponse<CourseAssignment[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/admin/overdue-assignments`, {
      params: organizationId ? { organizationId } : undefined,
    });
    return response.data;
  },

  expireOverdue: async (): Promise<ApiResponse<{ expiredCount: number }>> => {
    const response = await apiClient.post(`${BASE_PATH}/admin/expire-overdue`);
    return response.data;
  },

  getUnverifiedCredits: async (): Promise<ApiResponse<CreditRecord[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/admin/unverified-credits`);
    return response.data;
  },
};

// Default export
export default {
  licenseProfiles: licenseProfilesApi,
  policies: policiesApi,
  credits: creditsApi,
  assignments: assignmentsApi,
  admin: adminApi,
};

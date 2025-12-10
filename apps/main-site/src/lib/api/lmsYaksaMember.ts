/**
 * LMS-Yaksa Member API Client
 *
 * API client for Yaksa LMS member operations
 */

import { authClient } from '@o4o/auth-client';

// Use authClient.api for all requests
const apiClient = authClient.api;

const BASE_PATH = '/api/v1/lms/yaksa';
const LMS_CORE_PATH = '/api/v1/lms';

// ============================================
// Types
// ============================================

export interface LicenseProfile {
  id: string;
  userId: string;
  organizationId?: string;
  licenseNumber: string;
  licenseType?: string;
  licenseIssuedAt?: string;
  licenseExpiresAt?: string;
  totalCredits: number;
  currentYearCredits: number;
  isRenewalRequired: boolean;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditRecord {
  id: string;
  userId: string;
  courseId?: string;
  type: 'course_completion' | 'attendance' | 'external' | 'manual_adjustment';
  amount: number;
  earnedAt: string;
  creditYear: number;
  certificateId?: string;
  enrollmentId?: string;
  courseTitle?: string;
  description?: string;
  isVerified: boolean;
  note?: string;
  createdAt: string;
}

export interface CreditSummary {
  totalCredits: number;
  currentYearCredits: number;
  byYear: Record<number, number>;
  byType: Record<string, number>;
  unverifiedCredits: number;
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
  enrollmentId?: string;
  progressPercent: number;
  priority: number;
  isMandatory: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  course?: Course;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  credits?: number;
  duration?: number;
  category?: string;
  instructorName?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string;
  course?: Course;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string;
  downloadUrl?: string;
}

export interface MemberDashboardData {
  licenseProfile?: LicenseProfile;
  creditSummary?: CreditSummary;
  statistics?: {
    total: number;
    completed: number;
    inProgress: number;
    pendingCount: number;
    overdue: number;
    completionRate: number;
  };
  pendingAssignments?: CourseAssignment[];
  recentEnrollments?: CourseAssignment[];
  alerts?: {
    overdueAssignments: number;
    renewalRequired: boolean;
    pendingCredits: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// License Profile API
// ============================================

export const licenseProfileApi = {
  getMyProfile: async (): Promise<ApiResponse<LicenseProfile>> => {
    const response = await apiClient.get(`${BASE_PATH}/license-profiles/me`);
    return response.data;
  },

  getProfile: async (userId: string): Promise<ApiResponse<LicenseProfile>> => {
    const response = await apiClient.get(`${BASE_PATH}/license-profiles/${userId}`);
    return response.data;
  },
};

// ============================================
// Credits API
// ============================================

export const creditsApi = {
  getMyCredits: async (year?: number): Promise<ApiResponse<CreditRecord[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/me`, {
      params: year ? { year } : undefined,
    });
    return response.data;
  },

  getMySummary: async (): Promise<ApiResponse<CreditSummary>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/me/summary`);
    return response.data;
  },

  getCredits: async (userId: string, year?: number): Promise<ApiResponse<CreditRecord[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/${userId}`, {
      params: year ? { year } : undefined,
    });
    return response.data;
  },

  getSummary: async (userId: string): Promise<ApiResponse<CreditSummary>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/${userId}/summary`);
    return response.data;
  },

  getAggregate: async (
    userId: string,
    groupBy?: 'year' | 'type'
  ): Promise<ApiResponse<Record<string, number>>> => {
    const response = await apiClient.get(`${BASE_PATH}/credits/${userId}/aggregate`, {
      params: groupBy ? { groupBy } : undefined,
    });
    return response.data;
  },
};

// ============================================
// Course Assignments API
// ============================================

export const assignmentsApi = {
  getMyAssignments: async (activeOnly?: boolean): Promise<ApiResponse<CourseAssignment[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/course-assignments/me`, {
      params: activeOnly ? { activeOnly: 'true' } : undefined,
    });
    return response.data;
  },

  getMyStatistics: async (): Promise<ApiResponse<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    expired: number;
    cancelled: number;
    overdue: number;
    completionRate: number;
  }>> => {
    const response = await apiClient.get(`${BASE_PATH}/course-assignments/me/statistics`);
    return response.data;
  },

  getAssignments: async (
    userId: string,
    activeOnly?: boolean
  ): Promise<ApiResponse<CourseAssignment[]>> => {
    const response = await apiClient.get(`${BASE_PATH}/course-assignments/${userId}`, {
      params: activeOnly ? { activeOnly: 'true' } : undefined,
    });
    return response.data;
  },

  getStatistics: async (userId: string): Promise<ApiResponse<{
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
};

// ============================================
// LMS Core API (Courses, Enrollments)
// ============================================

export const lmsCoreApi = {
  // Courses
  getCourse: async (courseId: string): Promise<ApiResponse<Course>> => {
    const response = await apiClient.get(`${LMS_CORE_PATH}/courses/${courseId}`);
    return response.data;
  },

  getCourseLessons: async (courseId: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`${LMS_CORE_PATH}/courses/${courseId}/lessons`);
    return response.data;
  },

  // Enrollments
  enrollCourse: async (courseId: string): Promise<ApiResponse<Enrollment>> => {
    const response = await apiClient.post(`${LMS_CORE_PATH}/courses/${courseId}/enroll`);
    return response.data;
  },

  getMyEnrollments: async (): Promise<ApiResponse<Enrollment[]>> => {
    const response = await apiClient.get(`${LMS_CORE_PATH}/enrollments/me`);
    return response.data;
  },

  getEnrollment: async (enrollmentId: string): Promise<ApiResponse<Enrollment>> => {
    const response = await apiClient.get(`${LMS_CORE_PATH}/enrollments/${enrollmentId}`);
    return response.data;
  },

  // Progress
  updateProgress: async (
    enrollmentId: string,
    progressPercent: number
  ): Promise<ApiResponse<Enrollment>> => {
    const response = await apiClient.patch(`${LMS_CORE_PATH}/progress/${enrollmentId}`, {
      progressPercent,
    });
    return response.data;
  },

  // Certificates
  getMyCertificates: async (): Promise<ApiResponse<Certificate[]>> => {
    const response = await apiClient.get(`${LMS_CORE_PATH}/certificates/me`);
    return response.data;
  },

  getCertificate: async (certificateId: string): Promise<ApiResponse<Certificate>> => {
    const response = await apiClient.get(`${LMS_CORE_PATH}/certificates/${certificateId}`);
    return response.data;
  },
};

// ============================================
// Member Dashboard API
// ============================================

export const memberDashboardApi = {
  getDashboard: async (userId: string): Promise<ApiResponse<MemberDashboardData>> => {
    // Aggregate multiple API calls for dashboard data
    try {
      const [profileRes, summaryRes, assignmentsRes, statsRes] = await Promise.all([
        licenseProfileApi.getProfile(userId).catch(() => ({ success: false })),
        creditsApi.getSummary(userId).catch(() => ({ success: false })),
        assignmentsApi.getAssignments(userId, true).catch(() => ({ success: false, data: [] })),
        assignmentsApi.getStatistics(userId).catch(() => ({ success: false })),
      ]);

      const assignments = (assignmentsRes as ApiResponse<CourseAssignment[]>).data || [];
      const stats = (statsRes as ApiResponse<any>).data;

      // Separate pending and recent courses
      const pendingAssignments = assignments
        .filter((a) => !a.isCompleted)
        .slice(0, 5);
      const recentEnrollments = [...assignments]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3);

      // Calculate overdue
      const now = new Date();
      const overdueAssignments = assignments.filter(
        (a) => a.dueDate && new Date(a.dueDate) < now && !a.isCompleted
      ).length;

      const dashboardData: MemberDashboardData = {
        licenseProfile: (profileRes as ApiResponse<LicenseProfile>).data,
        creditSummary: (summaryRes as ApiResponse<CreditSummary>).data,
        statistics: stats || {
          total: assignments.length,
          completed: assignments.filter((a) => a.isCompleted).length,
          inProgress: assignments.filter((a) => a.status === 'in_progress').length,
          pendingCount: assignments.filter((a) => a.status === 'pending').length,
          overdue: overdueAssignments,
          completionRate: assignments.length > 0
            ? (assignments.filter((a) => a.isCompleted).length / assignments.length) * 100
            : 0,
        },
        pendingAssignments,
        recentEnrollments,
        alerts: {
          overdueAssignments,
          renewalRequired: (profileRes as ApiResponse<LicenseProfile>).data?.isRenewalRequired || false,
          pendingCredits: (summaryRes as ApiResponse<CreditSummary>).data?.unverifiedCredits || 0,
        },
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error('Dashboard API error:', error);
      return { success: false, error: '대시보드 데이터를 불러오는데 실패했습니다.' };
    }
  },
};

// Default export
export default {
  licenseProfile: licenseProfileApi,
  credits: creditsApi,
  assignments: assignmentsApi,
  lmsCore: lmsCoreApi,
  dashboard: memberDashboardApi,
};

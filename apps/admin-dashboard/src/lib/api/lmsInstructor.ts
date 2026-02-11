/**
 * LMS Instructor API Client
 *
 * WO-LMS-INSTRUCTOR-DASHBOARD-UX-REFINEMENT-V1
 */

import { apiClient } from '../api-client';

const BASE_PATH = '/api/v1/lms/instructor';

// ============================================
// Types
// ============================================

export interface InstructorCourse {
  id: string;
  title: string;
  isPaid: boolean;
  requiresApproval: boolean;
  status: string;
  currentEnrollments: number;
  createdAt: string;
}

export interface EnrollmentItem {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  course?: {
    id: string;
    title: string;
  };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ActionResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================
// API Functions
// ============================================

export const instructorApi = {
  getMyCourses: async (page = 1, limit = 50): Promise<PaginatedResponse<InstructorCourse>> => {
    const response = await apiClient.get(`${BASE_PATH}/courses`, {
      params: { page, limit },
    });
    return response.data;
  },

  getPendingEnrollments: async (courseId?: string, page = 1, limit = 50): Promise<PaginatedResponse<EnrollmentItem>> => {
    const response = await apiClient.get(`${BASE_PATH}/enrollments`, {
      params: { courseId, page, limit },
    });
    return response.data;
  },

  approveEnrollment: async (enrollmentId: string): Promise<ActionResponse<EnrollmentItem>> => {
    const response = await apiClient.post(`${BASE_PATH}/enrollments/${enrollmentId}/approve`);
    return response.data;
  },

  rejectEnrollment: async (enrollmentId: string): Promise<ActionResponse<EnrollmentItem>> => {
    const response = await apiClient.post(`${BASE_PATH}/enrollments/${enrollmentId}/reject`);
    return response.data;
  },
};

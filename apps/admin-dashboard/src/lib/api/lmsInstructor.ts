/**
 * LMS Instructor API Client
 *
 * WO-LMS-INSTRUCTOR-DASHBOARD-UX-REFINEMENT-V1
 */

import { apiClient } from '../api-client';

/**
 * WO-O4O-ADMIN-LMS-INSTRUCTOR-API-DOUBLE-PREFIX-FIX-V1
 *
 * 프로덕션 빌드는 VITE_API_URL=https://api.neture.co.kr/api 로 주입되어
 * apiClient.baseURL 이 이미 `/api` 로 끝난다. 여기에 `/api/v1/...` 을 붙이면
 * 최종 요청 경로에 `/api` 가 두 번 붙는 이중 접두가 되어 404 가 난다.
 * baseURL 이 `/api` 로 끝나는 경우에만 `/v1` 부터 붙인다
 * (VITE_API_URL 미주입 시 fallback baseURL 은 `/api` 가 없으므로 기존 경로 유지).
 */
const API_PREFIX = String(apiClient.defaults.baseURL ?? '').replace(/\/+$/, '').endsWith('/api')
  ? ''
  : '/api';

const BASE_PATH = `${API_PREFIX}/v1/lms/instructor`;

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

/**
 * LMS API 서비스
 *
 * NOTE: Learning App은 교육/평가 도구가 아닌 순차 전달 도구입니다.
 * API 명칭은 기존 호환성을 위해 유지하되, UI에서는 중립적 용어를 사용합니다.
 */

import { apiClient } from './client';
import type {
  Course,
  Lesson,
  Enrollment,
  Certificate,
  InstructorPublicProfile,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const lmsApi = {
  // 안내 흐름
  getCourses: (params?: {
    category?: string;
    level?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<Course>>('/lms/courses', params),

  getCourse: (id: string) =>
    apiClient.get<ApiResponse<Course>>(`/lms/courses/${id}`),

  // 단계
  getLessons: (courseId: string) =>
    apiClient.get<ApiResponse<Lesson[]>>(`/lms/courses/${courseId}/lessons`),

  getLesson: (courseId: string, lessonId: string) =>
    apiClient.get<ApiResponse<Lesson>>(`/lms/courses/${courseId}/lessons/${lessonId}`),

  // 진행
  getMyEnrollments: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Enrollment>>('/lms/enrollments', params),

  getEnrollment: (courseId: string) =>
    apiClient.get<ApiResponse<Enrollment>>(`/lms/enrollments/${courseId}`),

  enrollCourse: (courseId: string) =>
    apiClient.post<ApiResponse<Enrollment>>(`/lms/courses/${courseId}/enroll`),

  updateProgress: (courseId: string, lessonId: string, completed: boolean) =>
    apiClient.post<ApiResponse<Enrollment>>(`/lms/enrollments/${courseId}/progress`, {
      lessonId,
      completed,
    }),

  // 완료 기록
  getMyCertificates: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Certificate>>('/lms/certificates', params),

  getCertificate: (id: string) =>
    apiClient.get<ApiResponse<Certificate>>(`/lms/certificates/${id}`),

  downloadCertificate: (id: string) =>
    apiClient.get<Blob>(`/lms/certificates/${id}/download`),

  // 강사 공개 프로필 - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
  getInstructorProfile: (userId: string) =>
    apiClient.get<ApiResponse<InstructorPublicProfile>>(`/lms/instructors/${userId}/public-profile`),
};

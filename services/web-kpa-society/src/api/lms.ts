/**
 * LMS API 서비스
 */

import { apiClient } from './client';
import type {
  Course,
  Lesson,
  Enrollment,
  Certificate,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const lmsApi = {
  // 코스
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

  // 레슨
  getLessons: (courseId: string) =>
    apiClient.get<ApiResponse<Lesson[]>>(`/lms/courses/${courseId}/lessons`),

  getLesson: (courseId: string, lessonId: string) =>
    apiClient.get<ApiResponse<Lesson>>(`/lms/courses/${courseId}/lessons/${lessonId}`),

  // 수강
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

  // 수료증
  getMyCertificates: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Certificate>>('/lms/certificates', params),

  getCertificate: (id: string) =>
    apiClient.get<ApiResponse<Certificate>>(`/lms/certificates/${id}`),

  downloadCertificate: (id: string) =>
    apiClient.get<Blob>(`/lms/certificates/${id}/download`),
};

/**
 * LMS Instructor API Client
 * WO-O4O-LMS-FOUNDATION-V1
 */

import { authClient } from '../contexts/AuthContext';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type LessonType = 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  level: CourseLevel;
  status: CourseStatus;
  duration: number;
  instructorId: string;
  organizationId: string | null;
  isPublished: boolean;
  requiresApproval: boolean;
  maxEnrollments: number | null;
  currentEnrollments: number;
  tags: string[] | null;
  credits: number;
  isPaid: boolean;
  price: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: LessonType;
  content: Record<string, any> | null;
  videoUrl: string | null;
  order: number;
  duration: number;
  isPublished: boolean;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Actual API response: { success, data: Course[], pagination: Pagination }
export interface CoursesResponseWrapper {
  success: boolean;
  data: Course[];
  pagination: Pagination;
}

export interface CreateCourseDto {
  title: string;
  description: string;
  level?: CourseLevel;
  tags?: string[];
  thumbnail?: string | null;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  level?: CourseLevel;
  tags?: string[];
  thumbnail?: string | null;
}

export interface CreateLessonDto {
  title: string;
  type: LessonType;
  description?: string | null;
  content?: Record<string, any> | null;
  videoUrl?: string | null;
  order?: number;
  duration?: number;
}

export interface UpdateLessonDto {
  title?: string;
  description?: string | null;
  content?: Record<string, any> | null;
  videoUrl?: string | null;
  order?: number;
  duration?: number;
  isPublished?: boolean;
}

export const lmsInstructorApi = {
  /** 내 강의 목록 */
  myCourses: (page = 1, limit = 20) =>
    authClient.api.get<CoursesResponseWrapper>(
      `/lms/instructor/courses?page=${page}&limit=${limit}`,
    ),

  /** 강의 상세 */
  getCourse: (id: string) =>
    authClient.api.get<{ success: boolean; data: Course }>(`/lms/courses/${id}`),

  /** 강의 생성 */
  createCourse: (dto: CreateCourseDto) =>
    authClient.api.post<{ success: boolean; data: Course }>('/lms/courses', dto),

  /** 강의 수정 */
  updateCourse: (id: string, dto: UpdateCourseDto) =>
    authClient.api.patch<{ success: boolean; data: Course }>(`/lms/courses/${id}`, dto),

  /** 강의 삭제 */
  deleteCourse: (id: string) =>
    authClient.api.delete<{ success: boolean }>(`/lms/courses/${id}`),

  /** 강의 레슨 목록 */
  getLessons: (courseId: string) =>
    authClient.api.get<{ success: boolean; data: Lesson[] }>(
      `/lms/courses/${courseId}/lessons`,
    ),

  /** 레슨 생성 */
  createLesson: (courseId: string, dto: CreateLessonDto) =>
    authClient.api.post<{ success: boolean; data: Lesson }>(
      `/lms/courses/${courseId}/lessons`,
      dto,
    ),

  /** 레슨 수정 */
  updateLesson: (lessonId: string, dto: UpdateLessonDto) =>
    authClient.api.patch<{ success: boolean; data: Lesson }>(`/lms/lessons/${lessonId}`, dto),

  /** 레슨 삭제 */
  deleteLesson: (lessonId: string) =>
    authClient.api.delete<{ success: boolean }>(`/lms/lessons/${lessonId}`),

  /** 강의 발행 */
  publishCourse: (id: string) =>
    authClient.api.post<{ success: boolean; data: Course }>(`/lms/courses/${id}/publish`, {}),

  /** 강의 발행 취소 */
  unpublishCourse: (id: string) =>
    authClient.api.post<{ success: boolean; data: Course }>(`/lms/courses/${id}/unpublish`, {}),

  // ── 대시보드 (WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1) ──────────

  /** 강의별 운영 지표 */
  dashboardStats: (courseId: string) =>
    authClient.api.get<{
      success: boolean;
      data: {
        courseId: string;
        totalEnrollments: number;
        inProgressCount: number;
        completedCount: number;
        completionRate: number;
        averageProgress: number;
        quizPassRate: number;
        averageQuizScore: number;
        certificateIssuedCount: number;
      };
    }>(`/lms/instructor/dashboard/stats/${courseId}`),

  /** 강사 강의 목록 + 요약 통계 */
  dashboardCourses: () =>
    authClient.api.get<{
      success: boolean;
      data: {
        courses: Array<{
          courseId: string;
          title: string;
          status: CourseStatus;
          totalEnrollments: number;
          completionRate: number;
          averageProgress: number;
        }>;
      };
    }>('/lms/instructor/dashboard/courses'),
};

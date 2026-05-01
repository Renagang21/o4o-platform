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
  Quiz,
  QuizResult,
  CourseCompletionItem,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export const lmsApi = {
  // 안내 흐름
  // WO-KPA-CONTENT-COURSES-PUBLIC-VISIBILITY-FIX-V1: contentKind 필터 추가
  // WO-KPA-LMS-REMOVE-LEVEL-QUERY-PARAM-V1: level 쿼리 파라미터 제거 (BE는 받아도 무시)
  getCourses: (params?: {
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    contentKind?: 'lecture' | 'content_resource' | 'all';
  }) =>
    apiClient.get<PaginatedResponse<Course>>('/lms/courses', params),

  getCourse: (id: string) =>
    apiClient.get<ApiResponse<Course>>(`/lms/courses/${id}`),

  // 단계
  getLessons: (courseId: string) =>
    apiClient.get<ApiResponse<Lesson[]>>(`/lms/courses/${courseId}/lessons`),

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: use /lms/lessons/:id (not course sub-path)
  getLesson: (_courseId: string, lessonId: string) =>
    apiClient.get<ApiResponse<{ lesson: Lesson }>>(`/lms/lessons/${lessonId}`),

  // 진행
  getMyEnrollments: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Enrollment>>('/lms/enrollments', params),

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: lookup by courseId for current user
  getEnrollmentByCourse: (courseId: string) =>
    apiClient.get<ApiResponse<{ enrollment: Enrollment }>>(`/lms/enrollments/me/course/${courseId}`),

  enrollCourse: (courseId: string) =>
    apiClient.post<ApiResponse<{ enrollment: Enrollment }>>(`/lms/courses/${courseId}/enroll`),

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: progress endpoint now exists in backend
  updateProgress: (courseId: string, lessonId: string, completed: boolean) =>
    apiClient.post<ApiResponse<{ enrollment: Enrollment }>>(`/lms/enrollments/${courseId}/progress`, {
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

  // 퀴즈 (WO-O4O-QUIZ-SYSTEM-V1)
  getQuizForLesson: (lessonId: string) =>
    apiClient.get<ApiResponse<{ quiz: Quiz }>>(`/lms/lessons/${lessonId}/quiz`),

  submitQuiz: (quizId: string, answers: Array<{ questionId: string; answer: string | string[] }>) =>
    apiClient.post<ApiResponse<QuizResult>>(`/lms/quizzes/${quizId}/submit`, { answers }),

  getQuizAttempts: (quizId: string) =>
    apiClient.get<ApiResponse<{ attempts: any[] }>>(`/lms/quizzes/${quizId}/attempts`),

  // 과제 (WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1)
  getAssignmentForLesson: (lessonId: string) =>
    apiClient.get<ApiResponse<{ assignment: AssignmentLearner }>>(`/lms/lessons/${lessonId}/assignment`),

  submitAssignment: (assignmentId: string, content: string) =>
    apiClient.post<ApiResponse<{ submission: AssignmentSubmission; lessonCompleted: boolean }>>(
      `/lms/assignments/${assignmentId}/submit`,
      { content },
    ),

  getMyAssignmentSubmission: (assignmentId: string) =>
    apiClient.get<ApiResponse<{ submission: AssignmentSubmission | null }>>(
      `/lms/assignments/${assignmentId}/my`,
    ),

  // 라이브 (WO-O4O-LMS-LIVE-MINIMAL-V1)
  getLiveForLesson: (lessonId: string) =>
    apiClient.get<ApiResponse<{ live: LiveLesson }>>(`/lms/lessons/${lessonId}/live`),

  joinLive: (lessonId: string) =>
    apiClient.post<ApiResponse<{ lessonCompleted: boolean }>>(
      `/lms/lessons/${lessonId}/live/join`,
    ),

  // 수료 (WO-O4O-COMPLETION-V1)
  getMyCompletions: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<CourseCompletionItem>>('/lms/completions/me', params),

  // 강사 공개 프로필 - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
  getInstructorProfile: (userId: string) =>
    apiClient.get<ApiResponse<InstructorPublicProfile>>(`/lms/instructors/${userId}/public-profile`),

  // WO-KPA-OPERATOR-LMS-BULK-ACTION-FIX-V1: 운영자 강의 상태 변경
  operatorUnpublishCourse: (id: string) =>
    apiClient.post<ApiResponse<{ course: Course }>>(`/lms/operator/courses/${id}/unpublish`),

  operatorArchiveCourse: (id: string) =>
    apiClient.post<ApiResponse<{ course: Course }>>(`/lms/operator/courses/${id}/archive`),

  // WO-LMS-COURSE-HARD-DELETE-V1: 운영자 강의 완전 삭제
  operatorHardDeleteCourse: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/lms/operator/courses/${id}/hard`),
};

// WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
export interface AssignmentLearner {
  id: string;
  lessonId: string;
  instructions: string | null;
  submissionType: 'text';
  dueDate: string | null;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  lessonId: string;
  content: string | null;
  submittedAt: string;
  status: 'submitted';
}

// WO-O4O-LMS-LIVE-MINIMAL-V1
export interface LiveLesson {
  lessonId: string;
  liveStartAt: string | null;
  liveEndAt: string | null;
  liveUrl: string | null;
}

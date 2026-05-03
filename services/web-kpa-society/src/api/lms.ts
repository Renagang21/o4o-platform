/**
 * LMS API 서비스
 *
 * NOTE: Learning App은 교육/평가 도구가 아닌 순차 전달 도구입니다.
 * API 명칭은 기존 호환성을 위해 유지하되, UI에서는 중립적 용어를 사용합니다.
 *
 * WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 학습자 write API 3개(enrollCourse,
 *   updateProgress, submitQuiz) 만 @o4o/lms-client factory 로 위임. read 메서드와
 *   operator/instructor 메서드는 현 구현 유지(reference 보존).
 */

import { apiClient } from './client';
import { createLmsLearnerClient, type LmsHttpClient } from '@o4o/lms-client';
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

// ─── 공통 LMS client adapter (WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2) ─────────
// KPA `apiClient` 는 envelope 을 직접 반환하므로(`Promise<T>`) thin pass-through 만 필요.
// baseURL `/api/v1/kpa` 는 apiClient 가 보유 — factory 의 path-only 호출과 자동 결합된다.

const lmsHttp: LmsHttpClient = {
  get: <T,>(path: string, params?: Record<string, unknown>): Promise<T> =>
    apiClient.get<T>(path, params as Record<string, string | number | boolean | undefined> | undefined),
  post: <T,>(path: string, body?: unknown): Promise<T> => apiClient.post<T>(path, body),
  patch: <T,>(path: string, body?: unknown): Promise<T> => apiClient.patch<T>(path, body),
  delete: <T,>(path: string): Promise<T> => apiClient.delete<T>(path),
};

const learnerClient = createLmsLearnerClient(lmsHttp);

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

  // WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 공통 factory 사용. 반환 형태 동일.
  enrollCourse: (courseId: string) =>
    learnerClient.enrollCourse<Enrollment>(courseId) as Promise<ApiResponse<{ enrollment: Enrollment }>>,

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: progress endpoint now exists in backend
  // WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 공통 factory 사용. 반환 형태 동일.
  updateProgress: (courseId: string, lessonId: string, completed: boolean) =>
    learnerClient.updateProgress<Enrollment>(courseId, lessonId, completed) as Promise<ApiResponse<{ enrollment: Enrollment }>>,

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

  // WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 공통 factory 사용. 반환 형태 동일.
  submitQuiz: (quizId: string, answers: Array<{ questionId: string; answer: string | string[] }>) =>
    learnerClient.submitQuiz<QuizResult>(quizId, answers) as Promise<ApiResponse<QuizResult>>,

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

  // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 운영자 강의 승인/반려
  operatorApproveCourse: (id: string) =>
    apiClient.post<ApiResponse<{ course: Course }>>(`/lms/operator/courses/${id}/approve`),

  operatorRejectCourse: (id: string, reason: string) =>
    apiClient.post<ApiResponse<{ course: Course }>>(`/lms/operator/courses/${id}/reject`, { reason }),
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

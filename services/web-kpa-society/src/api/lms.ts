/**
 * LMS API 서비스
 *
 * NOTE: Learning App은 교육/평가 도구가 아닌 순차 전달 도구입니다.
 * API 명칭은 기존 호환성을 위해 유지하되, UI에서는 중립적 용어를 사용합니다.
 *
 * WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 학습자 write API 3개(enrollCourse,
 *   updateProgress, submitQuiz) factory 위임.
 * WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: 학습자 read 메서드 6개도 factory 위임 전환
 *   (getCourses, getCourse, getLessons, getMyEnrollments, getEnrollmentByCourse, getQuizForLesson).
 *   getLesson 은 GlycoPharm backend 미구현(Phase 5)으로 local 유지.
 *   operator/instructor/certificate/completion 메서드는 KPA 전용으로 local 유지.
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
  // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: factory 위임 전환.
  getCourses: (params?: {
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    contentKind?: 'lecture' | 'content_resource' | 'all';
  }) => learnerClient.getCourses<Course>(params as Record<string, unknown> | undefined) as unknown as Promise<PaginatedResponse<Course>>,

  // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: factory 위임 전환. 실제 backend 응답은
  // `{success, data: {course: Course}}` 인데 기존 KPA 타입(`ApiResponse<Course>`) 은
  // `{success, data: Course}` 로 잘못 명시되어 있다. 페이지는 defensive cast 로 양쪽 모두 처리 중.
  // 타입 정정은 별도 cleanup WO 로 분리.
  getCourse: (id: string) => learnerClient.getCourse<Course>(id) as unknown as Promise<ApiResponse<Course>>,

  // 단계
  // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: factory 위임 전환.
  getLessons: (courseId: string) =>
    learnerClient.getLessons<Lesson>(courseId) as Promise<ApiResponse<Lesson[]>>,

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: use /lms/lessons/:id (not course sub-path)
  // factory 미포함(GlycoPharm backend 미구현으로 Phase 5 보류). KPA 단독으로 local 유지.
  getLesson: (_courseId: string, lessonId: string) =>
    apiClient.get<ApiResponse<{ lesson: Lesson }>>(`/lms/lessons/${lessonId}`),

  // 진행
  // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: factory `getMyEnrollments` 사용 — endpoint 정정 (/lms/enrollments → /lms/enrollments/me).
  // 기존 KPA lmsApi 호출처는 0건이라 회귀 위험 없음(grep 결과). 페이지(MyEnrollmentsPage)는 기존에 /me 직접 호출 중이었으므로 본 메서드로 전환.
  // 반환 shape: factory 는 `{success, data: T[], pagination?}`, KPA 의 PaginatedResponse 는 `{data, total, page, ...}` flat — 페이지가 `res.data?.data` 패턴으로 이미 envelope 처리 중이므로 unknown cast 로 기존 타입 보존.
  getMyEnrollments: (params?: { status?: string; page?: number; limit?: number }) =>
    learnerClient.getMyEnrollments<Enrollment>(params as Record<string, unknown> | undefined) as unknown as Promise<PaginatedResponse<Enrollment>>,

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: lookup by courseId for current user
  // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: factory 위임 전환.
  getEnrollmentByCourse: (courseId: string) =>
    learnerClient.getEnrollmentByCourse<Enrollment>(courseId) as Promise<ApiResponse<{ enrollment: Enrollment }>>,

  // WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 공통 factory 사용. 반환 형태 동일.
  enrollCourse: (courseId: string) =>
    learnerClient.enrollCourse<Enrollment>(courseId) as Promise<ApiResponse<{ enrollment: Enrollment }>>,

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: progress endpoint now exists in backend
  // WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2: 공통 factory 사용. 반환 형태 동일.
  // WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1: lesson type별 완료 메트릭(선택) 추가.
  // video: watchedSeconds/progressRatio, article: scrolledRatio/dwellTimeSeconds.
  // 메트릭 미전달 시 video/article은 백엔드에서 거부됨.
  updateProgress: (
    courseId: string,
    lessonId: string,
    completed: boolean,
    metrics?: {
      watchedSeconds?: number;
      progressRatio?: number;
      scrolledRatio?: number;
      dwellTimeSeconds?: number;
    },
  ) =>
    learnerClient.updateProgress<Enrollment>(courseId, lessonId, completed, metrics) as Promise<ApiResponse<{ enrollment: Enrollment }>>,

  // 완료 기록
  getMyCertificates: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Certificate>>('/lms/certificates', params),

  getCertificate: (id: string) =>
    apiClient.get<ApiResponse<Certificate>>(`/lms/certificates/${id}`),

  downloadCertificate: (id: string) =>
    apiClient.get<Blob>(`/lms/certificates/${id}/download`),

  // 퀴즈 (WO-O4O-QUIZ-SYSTEM-V1)
  // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: factory 위임 전환.
  getQuizForLesson: (lessonId: string) =>
    learnerClient.getQuizForLesson<Quiz>(lessonId) as Promise<ApiResponse<{ quiz: Quiz }>>,

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

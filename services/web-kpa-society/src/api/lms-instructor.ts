/**
 * LMS Instructor API Client
 * WO-O4O-LMS-FOUNDATION-V1
 */

import { authClient } from '../contexts/AuthContext';

// WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: pending_review/rejected 추가
export type CourseStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';
// WO-O4O-LMS-LESSON-TYPE-NORMALIZATION-V1: lowercase across the board
export type LessonType = 'video' | 'article' | 'quiz' | 'assignment' | 'live';
// WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1
export type ContentKind = 'lecture' | 'content_resource';
// WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
export type CourseVisibility = 'public' | 'members';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
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
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
  visibility: CourseVisibility;
  // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
  rejectionReason?: string | null;
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
  content: string | null;
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
  tags?: string[];
  thumbnail?: string | null;
  // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 미전달 시 백엔드에서 'lecture' 기본
  contentKind?: ContentKind;
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 미전달 시 백엔드에서 'members' 기본
  visibility?: CourseVisibility;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string | null;
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
  visibility?: CourseVisibility;
}

export interface CreateLessonDto {
  title: string;
  type: LessonType;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  order?: number;
  duration?: number;
}

export interface UpdateLessonDto {
  title?: string;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  order?: number;
  duration?: number;
  isPublished?: boolean;
}

export type QuizQuestionType = 'single' | 'multi' | 'text';

export interface QuizQuestionDraft {
  id: string;
  question: string;
  type: QuizQuestionType;
  options: string[];
  answer: string | string[];
  points: number;
  order: number;
}

export interface InstructorQuiz {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: QuizQuestionDraft[];
  passingScore: number;
  timeLimit: number | null;
  maxAttempts: number | null;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  isPublished: boolean;
}

export interface UpsertQuizDto {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: Omit<QuizQuestionDraft, 'id'>[];
  passingScore: number;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
  isPublished?: boolean;
}

export const lmsInstructorApi = {
  /**
   * 내 강의 목록
   * WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: contentKind 미지정 시 'lecture'만 반환.
   * 'content_resource' 또는 'all' 명시 가능.
   */
  myCourses: (page = 1, limit = 20, contentKind?: ContentKind | 'all') => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (contentKind) qs.set('contentKind', contentKind);
    return authClient.api.get<CoursesResponseWrapper>(`/lms/instructor/courses?${qs.toString()}`);
  },

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

  /** 레슨 순서 변경 (WO-KPA-LMS-UX-QUICK-WINS-V1) */
  reorderLessons: (courseId: string, lessonIds: string[]) =>
    authClient.api.post<{ success: boolean }>(`/lms/courses/${courseId}/lessons/reorder`, { lessonIds }),

  /** 강의 발행 (kpa:admin 전용) — 일반 강사는 submitForReview를 사용해야 함 */
  publishCourse: (id: string) =>
    authClient.api.post<{ success: boolean; data: Course }>(`/lms/courses/${id}/publish`, {}),

  /** 강사 승인 요청 — DRAFT 또는 REJECTED → PENDING_REVIEW (WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1) */
  submitForReview: (id: string) =>
    authClient.api.post<{ success: boolean; data: Course }>(`/lms/courses/${id}/submit-review`, {}),

  /** 강의 발행 취소 */
  unpublishCourse: (id: string) =>
    authClient.api.post<{ success: boolean; data: Course }>(`/lms/courses/${id}/unpublish`, {}),

  /** 강의 아카이브 (종료/보관) */
  archiveCourse: (id: string) =>
    authClient.api.post<{ success: boolean; data: Course }>(`/lms/courses/${id}/archive`, {}),

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

  // WO-O4O-MARKETING-CONTENT-OPERATIONS-MVP-V1
  /** 콘텐츠별 참여자 목록 */
  participants: (courseId: string, params?: { status?: string; credited?: boolean; query?: string; page?: number; limit?: number; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.credited === false) qs.set('credited', 'false');
    if (params?.credited === true)  qs.set('credited', 'true');
    if (params?.query)  qs.set('query', params.query);
    if (params?.page)   qs.set('page', String(params.page));
    if (params?.limit)  qs.set('limit', String(params.limit));
    if (params?.sort)   qs.set('sort', params.sort);
    return authClient.api.get<{
      success: boolean;
      data: {
        course: { id: string; title: string };
        summary: { total: number; inProgress: number; completed: number; cancelled: number };
        items: Array<{
          enrollmentId: string;
          userId: string;
          userName: string;
          enrolledAt: string;
          status: string;
          progressPercentage: number;
          completedAt: string | null;
          certificateIssued: boolean;
          credited: boolean;
          creditAmount: number | null;
          creditedAt: string | null;
        }>;
        pagination: { page: number; limit: number; total: number };
      };
    }>(`/lms/instructor/participants/${courseId}?${qs.toString()}`);
  },

  // ── 퀴즈 관리 (WO-KPA-LMS-QUIZ-BUILDER-UI-V1) ──────────────────

  /** 레슨에 연결된 퀴즈 조회 (강사용 — 정답 포함) */
  getQuizForLesson: (lessonId: string) =>
    authClient.api.get<{ success: boolean; data: { quiz: InstructorQuiz } }>(
      `/lms/lessons/${lessonId}/quiz`,
    ),

  /** 퀴즈 생성 */
  createQuiz: (dto: UpsertQuizDto) =>
    authClient.api.post<{ success: boolean; data: InstructorQuiz }>('/lms/quizzes', dto),

  /** 퀴즈 수정 */
  updateQuiz: (quizId: string, dto: Partial<UpsertQuizDto>) =>
    authClient.api.patch<{ success: boolean; data: InstructorQuiz }>(`/lms/quizzes/${quizId}`, dto),

  /** 보상 운영 요약 통계 (WO-O4O-MARKETING-CONTENT-OPERATIONS-ENHANCEMENT-V2) */
  participantsSummary: (courseId: string) =>
    authClient.api.get<{
      success: boolean;
      data: {
        total: number;
        inProgress: number;
        completed: number;
        cancelled: number;
        creditedCount: number;
        uncreditedCompletedCount: number;
        totalCredits: number;
      };
    }>(`/lms/instructor/participants/${courseId}/summary`),

  /** CSV 내보내기 URL 반환 — fetch + blob 다운로드용 */
  participantsExportUrl: (courseId: string, params?: { status?: string; credited?: string; query?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status)  qs.set('status', params.status);
    if (params?.credited) qs.set('credited', params.credited);
    if (params?.query)   qs.set('query', params.query);
    const base = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
    return `${base}/api/v1/lms/instructor/participants/${courseId}/export?${qs.toString()}`;
  },

  // ── 과제 관리 (WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1) ───────────────────

  /** 레슨에 연결된 과제 조회 */
  getAssignmentForLesson: (lessonId: string) =>
    authClient.api.get<{ success: boolean; data: { assignment: AssignmentDto } }>(
      `/lms/lessons/${lessonId}/assignment`,
    ),

  /** 과제 생성/수정 (lessonId 기준 upsert) */
  upsertAssignment: (dto: UpsertAssignmentDto) =>
    authClient.api.post<{ success: boolean; data: { assignment: AssignmentDto } }>(
      '/lms/assignments',
      dto,
    ),

  // ── Live 관리 (WO-O4O-LMS-LIVE-MINIMAL-V1) ─────────────────────────

  /** 레슨에 연결된 라이브 정보 조회 */
  getLiveForLesson: (lessonId: string) =>
    authClient.api.get<{ success: boolean; data: { live: LiveDto } }>(
      `/lms/lessons/${lessonId}/live`,
    ),

  /** 라이브 설정 생성/수정 */
  upsertLive: (lessonId: string, dto: UpsertLiveDto) =>
    authClient.api.post<{ success: boolean; data: { live: LiveDto } }>(
      `/lms/lessons/${lessonId}/live`,
      dto,
    ),
};

// WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
export interface AssignmentDto {
  id: string;
  lessonId: string;
  instructions: string | null;
  submissionType: 'text';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAssignmentDto {
  lessonId: string;
  instructions?: string | null;
  dueDate?: string | null;
}

// WO-O4O-LMS-LIVE-MINIMAL-V1
export interface LiveDto {
  lessonId: string;
  liveStartAt: string | null;
  liveEndAt: string | null;
  liveUrl: string | null;
}

export interface UpsertLiveDto {
  liveStartAt: string;
  liveEndAt: string;
  liveUrl: string;
}

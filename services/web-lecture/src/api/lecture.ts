/**
 * O4O 강의 (lecture) — LMS API 계층
 *
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §11
 *
 * 원칙:
 *  - 학습자 read/write 는 `@o4o/lms-client` 의 `createLmsLearnerClient` 를 그대로 쓴다 (LMS Core 재사용).
 *  - 강사 / 운영자 API 는 백엔드 `/api/v1/lms/*` 계약 위의 thin wrapper 다. 새 LMS 엔진을 만들지 않는다.
 *  - serviceKey 는 절대 보내지 않는다 — `/api/v1/lms/*` 는 서버가 `lecture` 로 고정한다 (§8).
 *  - KPA / K-Cosmetics / PharmacyHub 화면 · API 파일을 복사하지 않는다.
 */

import { createLmsLearnerClient, type LmsHttpClient, type LmsApiResponse } from '@o4o/lms-client';
import { api } from '../lib/apiClient';

/** axios(authClient.api) → LmsHttpClient adapter. envelope 까지 포함한 `data` 만 반환한다. */
export const lmsHttp: LmsHttpClient = {
  get: async (path, params) => (await api.get(path, { params })).data,
  post: async (path, body) => (await api.post(path, body ?? {})).data,
  patch: async (path, body) => (await api.patch(path, body ?? {})).data,
  delete: async (path) => (await api.delete(path)).data,
};

// ─── 공통 타입 (백엔드 LMS Core 응답 형태) ─────────────────────────────────

export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type LessonType = 'video' | 'article' | 'quiz' | 'assignment';
export type CourseVisibility = 'public' | 'members';

export interface Pagination { total: number; page: number; limit: number; totalPages: number }
export type Paginated<T> = { success: boolean; data: T[]; pagination?: Pagination };

export interface LectureCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  status: CourseStatus;
  visibility: CourseVisibility;
  contentKind?: string;
  serviceKey?: string | null;
  instructorId: string;
  instructorName?: string | null;
  instructor?: { id: string; name?: string | null } | null;
  duration?: number;
  lessonCount?: number;
  enrollmentCount?: number;
  currentEnrollments?: number;
  requiresApproval: boolean;
  isPaid: boolean;
  tags?: string[] | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface LectureLesson {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  order: number;
  duration: number;
  isPublished?: boolean;
  isPreview?: boolean;
}

export interface LectureEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  /** 서버(Enrollment entity)의 영속 필드는 `progressPercentage`. `progress` 는 구 응답 호환용. */
  progressPercentage?: number;
  progress?: number;
  completedLessons?: number;
  metadata?: { completedLessonIds?: string[] } | null;
  course?: Pick<LectureCourse, 'id' | 'title' | 'thumbnail' | 'lessonCount'> | null;
  user?: { id: string; email?: string; name?: string | null } | null;
  createdAt?: string;
}

export interface LectureCertificate {
  id: string;
  certificateNumber: string;
  courseId: string;
  userId: string;
  status?: string;
  issuedAt: string;
  expiresAt?: string | null;
  verificationCode?: string;
  course?: { id: string; title: string } | null;
  user?: { id: string; name?: string | null; email?: string } | null;
}

export interface QuizQuestionDraft {
  /**
   * 4차 P1-14: 기존 문항의 id 는 편집·저장 왕복에서 반드시 보존한다.
   * 채점은 attempt 의 questionId ↔ quiz.questions[].id 매칭이고 updateQuiz 는 배열을 그대로 저장하므로,
   * id 를 빼고 저장하면 기존 제출이 전부 오답 처리된다. 새 문항만 id 없이 보낸다(서버가 발급).
   */
  id?: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options: string[];
  answer: string | string[];
  points: number;
  order: number;
}
export interface LectureQuiz {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: Array<QuizQuestionDraft & { id: string }>;
  passingScore: number;
  isPublished?: boolean;
}
export interface UpsertQuizDto {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: QuizQuestionDraft[];
  passingScore: number;
  isPublished?: boolean;
}
export interface LectureAssignment {
  id: string;
  lessonId: string;
  instructions: string | null;
  dueDate: string | null;
  maxScore?: number | null;
}
export interface LectureSubmission {
  id: string;
  userId: string;
  content: string | null;
  submittedAt: string | null;
  gradingStatus?: string | null;
  score?: number | null;
  feedback?: string | null;
  userName?: string | null;
  gradedAt?: string | null;
}
export interface InstructorApplication {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  bio?: string | null;
  expertise?: string | null;
  createdAt: string;
  reviewNote?: string | null;
  user?: { id: string; name?: string | null; email?: string } | null;
}

export interface CourseInput {
  title: string;
  description: string;
  thumbnail?: string | null;
  tags?: string[];
  visibility?: CourseVisibility;
  requiresApproval?: boolean;
}
export interface LessonInput {
  title: string;
  type: LessonType;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  order?: number;
  duration?: number;
  isPublished?: boolean;
}

// ─── Learner (공통 client 재사용) ─────────────────────────────────────────────

export const learnerClient = createLmsLearnerClient(lmsHttp);

export const learnerApi = {
  ...learnerClient,
  /** 공통 factory 범위 밖 — 레슨 단건. */
  getLesson: (lessonId: string) =>
    lmsHttp.get<LmsApiResponse<{ lesson: LectureLesson }>>(`/lms/lessons/${lessonId}`),
  /** 강사 신청 (학습자 = active membership). */
  applyInstructor: () =>
    lmsHttp.post<LmsApiResponse<{ application: InstructorApplication }>>('/lms/instructor/apply'),
  /** 공개 수료증 검증 (비로그인 허용). */
  verifyCertificate: (verificationCode: string) =>
    lmsHttp.get<LmsApiResponse<any>>(`/lms/certificates/verify/${encodeURIComponent(verificationCode)}`),
  /** PDF QR 에 인쇄되는 `/certificate/verify/:id` (certificate id) 용 공개 검증 — `{ valid, certificate? }` */
  verifyCertificateById: (certificateId: string) =>
    lmsHttp.get<{ valid: boolean; certificate?: any }>(`/lms/certificates/${encodeURIComponent(certificateId)}/verify`),
};

// ─── Instructor (active membership + lecture:instructor) ─────────────────────

export const instructorApi = {
  myCourses: (params?: { page?: number; limit?: number; status?: string }) =>
    lmsHttp.get<Paginated<LectureCourse>>('/lms/instructor/courses', params),
  getCourse: (id: string) => lmsHttp.get<LmsApiResponse<{ course: LectureCourse }>>(`/lms/courses/${id}`),
  createCourse: (dto: CourseInput) => lmsHttp.post<LmsApiResponse<{ course: LectureCourse }>>('/lms/courses', dto),
  updateCourse: (id: string, dto: Partial<CourseInput>) =>
    lmsHttp.patch<LmsApiResponse<{ course: LectureCourse }>>(`/lms/courses/${id}`, dto),
  deleteCourse: (id: string) => lmsHttp.delete<LmsApiResponse<unknown>>(`/lms/courses/${id}`),
  submitForReview: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/courses/${id}/submit-review`),
  unpublish: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/courses/${id}/unpublish`),
  archive: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/courses/${id}/archive`),

  lessons: (courseId: string) =>
    lmsHttp.get<LmsApiResponse<LectureLesson[]>>(`/lms/instructor/courses/${courseId}/lessons`),
  createLesson: (courseId: string, dto: LessonInput) =>
    lmsHttp.post<LmsApiResponse<{ lesson: LectureLesson }>>(`/lms/courses/${courseId}/lessons`, dto),
  updateLesson: (lessonId: string, dto: Partial<LessonInput>) =>
    lmsHttp.patch<LmsApiResponse<{ lesson: LectureLesson }>>(`/lms/lessons/${lessonId}`, dto),
  deleteLesson: (lessonId: string) => lmsHttp.delete<LmsApiResponse<unknown>>(`/lms/lessons/${lessonId}`),
  reorderLessons: (courseId: string, lessonIds: string[]) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/courses/${courseId}/lessons/reorder`, { lessonIds }),

  /** 강사 편집용 — 정답 포함 (learner 경로 `/lms/lessons/:id/quiz` 는 정답이 제거되므로 편집에 쓰지 않는다) */
  getQuizForLesson: (lessonId: string) =>
    lmsHttp.get<LmsApiResponse<{ quiz: LectureQuiz | null }>>(`/lms/instructor/lessons/${lessonId}/quiz`),
  createQuiz: (dto: UpsertQuizDto) => lmsHttp.post<LmsApiResponse<{ quiz: LectureQuiz }>>('/lms/quizzes', dto),
  updateQuiz: (quizId: string, dto: Partial<UpsertQuizDto>) =>
    lmsHttp.patch<LmsApiResponse<{ quiz: LectureQuiz }>>(`/lms/quizzes/${quizId}`, dto),

  getAssignmentForLesson: (lessonId: string) =>
    lmsHttp.get<LmsApiResponse<{ assignment: LectureAssignment | null }>>(`/lms/lessons/${lessonId}/assignment`),
  upsertAssignment: (dto: { lessonId: string; instructions: string; dueDate?: string | null; maxScore?: number | null }) =>
    lmsHttp.post<LmsApiResponse<{ assignment: LectureAssignment }>>('/lms/assignments', dto),
  lessonSubmissions: (lessonId: string) =>
    lmsHttp.get<LmsApiResponse<{ lessonId: string; courseId: string; items: LectureSubmission[] }>>(`/lms/instructor/lessons/${lessonId}/submissions`),
  gradeSubmission: (submissionId: string, dto: { gradingStatus: 'graded' | 'returned'; score: number | null; feedback?: string }) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/submissions/${submissionId}/grade`, dto),

  pendingEnrollments: (params?: { courseId?: string; page?: number; limit?: number }) =>
    lmsHttp.get<Paginated<LectureEnrollment>>('/lms/instructor/enrollments', params),
  approveEnrollment: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/enrollments/${id}/approve`),
  rejectEnrollment: (id: string, reason?: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/enrollments/${id}/reject`, { reason }),
  participantsSummary: (courseId: string) =>
    lmsHttp.get<LmsApiResponse<any>>(`/lms/instructor/participants/${courseId}/summary`),
};

// ─── Operator (active membership + lecture:operator | lecture:admin) ─────────


/** 운영자 검토 화면 응답 (GET /lms/operator/courses/:courseId/review) — read-only. */
export interface OperatorCourseReviewLesson {
  id: string;
  title: string;
  description: string | null;
  type: string;
  order: number;
  duration: number | null;
  isPublished: boolean;
  isFree: boolean;
  videoUrl: string | null;
  attachments: Array<{ name: string; url: string; type: string; size: number }>;
  content: Record<string, unknown> | null;
  hasQuiz: boolean;
  quizQuestionCount: number;
  hasAssignment: boolean;
}
export interface OperatorCourseReview {
  course: {
    id: string;
    title: string;
    description: string | null;
    status: CourseStatus;
    visibility: string;
    instructorId: string;
    isPaid: boolean;
    requiresApproval: boolean;
    rejectionReason: string | null;
    thumbnail: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  curriculum: OperatorCourseReviewLesson[];
  readOnly: true;
}

export const operatorApi = {
  courses: (params?: { status?: string; search?: string; page?: number; limit?: number; contentKind?: string }) =>
    lmsHttp.get<Paginated<LectureCourse>>('/lms/operator/courses', { contentKind: 'all', ...(params ?? {}) }),
  /** 운영자 검토 전용 read-only 조회 (11차 P2) — 수강 등록·write 없음. */
  review: (id: string) =>
    lmsHttp.get<LmsApiResponse<OperatorCourseReview>>(`/lms/operator/courses/${id}/review`),
  approve: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/approve`),
  reject: (id: string, reason: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/reject`, { reason }),
  publish: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/courses/${id}/publish`),
  unpublish: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/unpublish`),
  archive: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/archive`),

  applications: (params?: { status?: string; page?: number; limit?: number }) =>
    lmsHttp.get<Paginated<InstructorApplication>>('/lms/instructor/applications', params),
  approveApplication: (id: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/applications/${id}/approve`),
  rejectApplication: (id: string, reason?: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/applications/${id}/reject`, { reason }),

  issueCertificate: (dto: { userId: string; courseId: string; enrollmentId?: string }) =>
    lmsHttp.post<LmsApiResponse<{ certificate: LectureCertificate }>>('/lms/certificates/issue', dto),
  revokeCertificate: (id: string, reason?: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/certificates/${id}/revoke`, { reason }),
  renewCertificate: (id: string, months?: number) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/certificates/${id}/renew`, months ? { months } : {}),
};

/** 백엔드 오류 메시지 추출 (axios envelope `{ success:false, error, code }`). */
export function errorMessage(err: unknown, fallback: string): string {
  const e = err as any;
  return e?.response?.data?.error || e?.response?.data?.message || (e instanceof Error ? e.message : null) || fallback;
}
export function errorCode(err: unknown): string | undefined {
  return (err as any)?.response?.data?.code;
}
/** HTTP status (없으면 undefined) — "미존재(404)" 와 그 외 실패를 구분해야 하는 화면에서 쓴다 (6차 P2). */
export function errorStatus(err: unknown): number | undefined {
  const s = (err as any)?.response?.status;
  return typeof s === 'number' ? s : undefined;
}

/**
 * LMS API Client — GlycoPharm
 * WO-GLYCOPHARM-LMS-ROUTING-INTEGRATION-V1 / WO-GLYCOPHARM-COURSE-DETAIL-ENROLL-V1
 * WO-GLYCOPHARM-LESSON-QUIZ-LEARNING-V1
 * WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED: getInstructorCourses 만 @o4o/lms-client factory 사용.
 *   기존 학습자 메서드(unwrap 패턴 포함)는 그대로 유지.
 * WO-O4O-GLYCOPHARM-LMS-PHASE1-OPERATOR-PARITY-V1: operator 메서드 추가.
 *
 * 전역 LMS 엔드포인트 /api/v1/lms/* 사용
 * kpaLmsScopeGuard는 GET 요청을 통과시킴 — 백엔드 변경 불필요
 */
import { api } from '@/lib/apiClient';
import {
  createLmsInstructorClient,
  createLmsLearnerClient,
  type LmsHttpClient,
  type LmsApiResponse,
} from '@o4o/lms-client';

// 공통 base 타입 re-export
export type {
  LmsCourseBase,
  LmsLessonBase,
  LmsEnrollmentBase,
  LmsCertificateBase,
  LmsInstructorCourseBase,
  LmsCourseStatus,
} from '@o4o/lms-client';

export interface LmsCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  status: string;
  duration: number;
  instructorId: string | null;
  instructorName?: string;
  instructor?: { id: string; name: string };
  isPublished: boolean;
  category?: string;
  lessonCount?: number;
  createdAt: string;
}

export interface LmsEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  // Extended fields (returned by some endpoints)
  progress?: number;
  completedLessons?: number; // count (DB INTEGER) — never treat as array
  metadata?: {
    completedLessonIds?: string[]; // per-lesson IDs — use this for .includes() checks
  };
}

// WO-O4O-LMS-CROSS-SERVICE-DATA-NORMALIZATION-V1
// enrollment 응답 정규화 유틸. GlycoPharm은 현재 completedLessons를 직접 사용하지 않으나,
// 향후 확장 및 API 변경에 대비해 동일 패턴 유지.
export function normalizeEnrollment(raw: any): LmsEnrollment | null {
  if (!raw) return null;
  return {
    ...raw,
    completedLessons: typeof raw.completedLessons === 'number' ? raw.completedLessons : 0,
    metadata: {
      ...raw.metadata,
      completedLessonIds: Array.isArray(raw?.metadata?.completedLessonIds)
        ? raw.metadata.completedLessonIds
        : [],
    },
  };
}

export interface LmsCoursesResult {
  data: LmsCourse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LmsLesson {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: 'article' | 'video';
  content: any;
  videoUrl: string | null;
  duration: number;
  order: number;
  isPublished: boolean;
  isFree: boolean;
}

export interface LmsQuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  points?: number;
  order: number;
}

export interface LmsQuiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  questions: LmsQuizQuestion[];
}

export interface QuizSubmitResult {
  score: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    points: number;
  }>;
}

export interface LmsCertificate {
  id: string;
  courseId: string;
  userId: string;
  issuedAt: string;
  courseTitle?: string;
  userName?: string;
  certificateNumber?: string;
  courseName?: string;
  course?: { title: string };
}

// WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1
export interface LmsQuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  creditsEarned: number;
}

export interface LmsAssignment {
  id: string;
  lessonId: string;
  instructions: string | null;
  dueDate: string | null;
}

export interface LmsAssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  content: string;
  submittedAt: string;
}

// ─── 공통 instructor client (WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED) ────────

const lmsHttp: LmsHttpClient = {
  get: async <T>(path: string, params?: Record<string, unknown>): Promise<T> => {
    const { data } = await api.get<T>(path, { params });
    return data;
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const { data } = await api.post<T>(path, body);
    return data;
  },
  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const { data } = await api.patch<T>(path, body);
    return data;
  },
  delete: async <T>(path: string): Promise<T> => {
    const { data } = await api.delete<T>(path);
    return data;
  },
};

const instructorClient = createLmsInstructorClient(lmsHttp);
const learnerClient = createLmsLearnerClient(lmsHttp);

export const lmsApi = {
  // 강사 본인 강의 목록. 페이지(InstructorDashboardPage)는 현재 api.get 직접 호출 중이며,
  // 향후 정렬 작업에서 본 메서드로 마이그레이션한다 (이번 WO 범위 외).
  getInstructorCourses: (): Promise<LmsApiResponse<LmsCourse[]>> =>
    instructorClient.getCourses<LmsCourse>(),

  // ─── 학습자 메서드 (WO-O4O-LMS-CLIENT-GLYCOPHARM-UNWRAP-CLEANUP-V1) ──────────
  // factory 직접 위임. envelope(`{ success, data }`)은 호출측(page)에서 처리.
  // KPA / K-Cosmetics 와 동일한 factory 위임 구조.

  getCourses: (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    learnerClient.getCourses<LmsCourse>({
      status: 'published',
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.page ? { page: params.page } : {}),
      ...(params?.limit ? { limit: params.limit } : {}),
    }) as unknown as Promise<LmsCoursesResult>,

  getCourse: (id: string) => learnerClient.getCourse<LmsCourse>(id),

  getEnrollmentByCourse: (courseId: string) =>
    learnerClient.getEnrollmentByCourse<LmsEnrollment>(courseId),

  enrollCourse: (courseId: string) => learnerClient.enrollCourse<LmsEnrollment>(courseId),

  getLessons: (courseId: string) => learnerClient.getLessons<LmsLesson>(courseId),

  getQuizForLesson: (lessonId: string) => learnerClient.getQuizForLesson<LmsQuiz>(lessonId),

  submitQuiz: (
    quizId: string,
    answers: Array<{ questionId: string; answer: string | string[] }>,
  ) => learnerClient.submitQuiz<QuizSubmitResult>(quizId, answers),

  updateProgress: (courseId: string, lessonId: string, completed = true) =>
    learnerClient.updateProgress<LmsEnrollment>(courseId, lessonId, completed),

  // ─── deprecated alias (LMS-CLIENT-CONVENTION-V1 §4) ───────────────────────
  // 기존 페이지 호환을 위해 유지. 신규 코드는 위의 표준 이름 사용.
  // Phase 4 (V2 extraction) 후 페이지 마이그레이션이 끝나면 제거 예정.

  /** @deprecated LMS-CLIENT-CONVENTION-V1: use `getCourse` instead. */
  getCourseById(id: string): Promise<LmsCourse> {
    return this.getCourse(id);
  },

  /** @deprecated LMS-CLIENT-CONVENTION-V1: use `getLessons` instead. */
  getLessonsByCourse(courseId: string): Promise<LmsLesson[]> {
    return this.getLessons(courseId);
  },

  /** @deprecated LMS-CLIENT-CONVENTION-V1: use `getEnrollmentByCourse` instead. */
  getMyEnrollment(courseId: string): Promise<LmsEnrollment | null> {
    return this.getEnrollmentByCourse(courseId);
  },

  /** @deprecated LMS-CLIENT-CONVENTION-V1: use `getQuizForLesson` instead. */
  getLessonQuiz(lessonId: string): Promise<LmsQuiz | null> {
    return this.getQuizForLesson(lessonId);
  },

  getMyCertificate: async (courseId: string): Promise<LmsCertificate | null> => {
    try {
      const { data } = await api.get<{ success: boolean; data: { certificate: LmsCertificate } }>(
        `/lms/certificates/course/${courseId}`,
      );
      return data.data.certificate;
    } catch {
      return null;
    }
  },

  downloadCertificate: async (
    certificateId: string,
  ): Promise<Blob> => {
    const { data } = await api.get<Blob>(
      `/lms/certificates/${certificateId}/download`,
      { responseType: 'blob' },
    );
    return data;
  },

  // ─── Phase 2 학습자 메서드 (WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1) ──

  getMyEnrollments: (params?: Record<string, unknown>) =>
    learnerClient.getMyEnrollments(params),

  cancelEnrollment: async (enrollmentId: string) => {
    const { data } = await api.post(`/lms/enrollments/${enrollmentId}/cancel`);
    return data;
  },

  getLesson: async (_courseId: string, lessonId: string) => {
    const { data } = await api.get(`/lms/lessons/${lessonId}`);
    return data;
  },

  getMyCertificates: (params?: { page?: number; limit?: number }) =>
    api.get<any>('/lms/certificates', { params }),

  getAssignmentForLesson: async (lessonId: string) => {
    const { data } = await api.get(`/lms/lessons/${lessonId}/assignment`);
    return data;
  },

  submitAssignment: async (assignmentId: string, content: string) => {
    const { data } = await api.post(`/lms/assignments/${assignmentId}/submit`, { content });
    return data;
  },

  getMyAssignmentSubmission: async (assignmentId: string) => {
    const { data } = await api.get(`/lms/assignments/${assignmentId}/my`);
    return data;
  },

  // ─── Phase 3 Instructor 타입 (WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1) ──────

export type LessonType = 'video' | 'article' | 'quiz' | 'assignment';
export type CourseVisibility = 'public' | 'members';
export type CourseReusablePolicy = 'restricted' | 'platform';

export interface InstructorCourseDetail extends LmsCourse {
  tags?: string[];
  visibility?: CourseVisibility;
  requiresApproval?: boolean;
  reusablePolicy?: CourseReusablePolicy;
  rejectionReason?: string | null;
}

export interface InstructorLesson {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: LessonType;
  content: any;
  videoUrl: string | null;
  duration: number;
  order: number;
  isPublished: boolean;
  isFree: boolean;
}

export interface PendingEnrollment {
  id: string;
  courseId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  enrolledAt: string;
  status: string;
  course?: { id: string; title: string };
}

export interface InstructorDashboardCourse extends LmsCourse {
  enrolledCount?: number;
  completionRate?: number;
  pendingCount?: number;
}

export interface ParticipantItem {
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
}

export interface ParticipantSummary {
  total: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  creditedCount?: number;
  uncreditedCompletedCount?: number;
  totalCredits?: number;
}

// ─── Operator 메서드 (WO-O4O-GLYCOPHARM-LMS-PHASE1-OPERATOR-PARITY-V1) ────
  // K-Cosmetics Canonical endpoint 기준. 백엔드 /lms/operator/courses/:id/* (glycopharm:operator 역할).

  operatorGetCourses: (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    learnerClient.getCourses<LmsCourse>({
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.page ? { page: params.page } : {}),
      ...(params?.limit ? { limit: params.limit } : {}),
    }),

  operatorApproveCourse: async (id: string): Promise<{ success: boolean; data: { course: LmsCourse } }> => {
    const { data } = await api.post<{ success: boolean; data: { course: LmsCourse } }>(`/lms/operator/courses/${id}/approve`);
    return data;
  },

  operatorRejectCourse: async (id: string, reason: string): Promise<{ success: boolean; data: { course: LmsCourse } }> => {
    const { data } = await api.post<{ success: boolean; data: { course: LmsCourse } }>(`/lms/operator/courses/${id}/reject`, { reason });
    return data;
  },

  operatorUnpublishCourse: async (id: string): Promise<{ success: boolean; data: { course: LmsCourse } }> => {
    const { data } = await api.post<{ success: boolean; data: { course: LmsCourse } }>(`/lms/operator/courses/${id}/unpublish`);
    return data;
  },

  operatorArchiveCourse: async (id: string): Promise<{ success: boolean; data: { course: LmsCourse } }> => {
    const { data } = await api.post<{ success: boolean; data: { course: LmsCourse } }>(`/lms/operator/courses/${id}/archive`);
    return data;
  },

  operatorHardDeleteCourse: async (id: string): Promise<{ success: boolean; data: { deleted: boolean } }> => {
    const { data } = await api.delete<{ success: boolean; data: { deleted: boolean } }>(`/lms/operator/courses/${id}/hard`);
    return data;
  },

  // ─── Instructor 메서드 (WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1) ──

  instructorDashboardCourses: async (): Promise<{ data: InstructorDashboardCourse[] }> => {
    const { data } = await api.get<any>('/lms/instructor/dashboard/courses');
    return data;
  },

  instructorPendingEnrollments: async (params?: Record<string, unknown>): Promise<any> => {
    const { data } = await api.get<any>('/lms/instructor/enrollments', { params: { status: 'pending', ...params } });
    return data;
  },

  instructorApproveEnrollment: async (id: string): Promise<any> => {
    const { data } = await api.post<any>(`/lms/instructor/enrollments/${id}/approve`);
    return data;
  },

  instructorRejectEnrollment: async (id: string, reason?: string): Promise<any> => {
    const { data } = await api.post<any>(`/lms/instructor/enrollments/${id}/reject`, reason ? { reason } : undefined);
    return data;
  },

  instructorGetCourse: async (id: string): Promise<InstructorCourseDetail> => {
    const { data } = await api.get<any>(`/lms/courses/${id}`);
    return data?.data?.course ?? data?.data ?? data;
  },

  instructorCreateCourse: async (dto: { title: string; description?: string; tags?: string[]; visibility?: CourseVisibility; requiresApproval?: boolean; reusablePolicy?: CourseReusablePolicy }): Promise<InstructorCourseDetail> => {
    const { data } = await api.post<any>('/lms/courses', dto);
    return data?.data?.course ?? data?.data ?? data;
  },

  instructorUpdateCourse: async (id: string, dto: { title?: string; description?: string; tags?: string[]; visibility?: CourseVisibility; requiresApproval?: boolean; reusablePolicy?: CourseReusablePolicy }): Promise<InstructorCourseDetail> => {
    const { data } = await api.patch<any>(`/lms/courses/${id}`, dto);
    return data?.data?.course ?? data?.data ?? data;
  },

  instructorDeleteCourse: async (id: string): Promise<void> => {
    await api.delete(`/lms/courses/${id}`);
  },

  instructorGetLessons: async (courseId: string): Promise<InstructorLesson[]> => {
    const { data } = await api.get<any>(`/lms/instructor/courses/${courseId}/lessons`);
    const lessons = data?.data ?? data;
    return Array.isArray(lessons) ? lessons : [];
  },

  instructorCreateLesson: async (courseId: string, dto: { title: string; type: LessonType; description?: string | null; content?: string | null; videoUrl?: string | null; order?: number; duration?: number }): Promise<any> => {
    const { data } = await api.post<any>(`/lms/courses/${courseId}/lessons`, dto);
    return data;
  },

  instructorUpdateLesson: async (lessonId: string, dto: { title?: string; description?: string | null; content?: string | null; videoUrl?: string | null; duration?: number }): Promise<any> => {
    const { data } = await api.patch<any>(`/lms/lessons/${lessonId}`, dto);
    return data;
  },

  instructorDeleteLesson: async (lessonId: string): Promise<void> => {
    await api.delete(`/lms/lessons/${lessonId}`);
  },

  instructorReorderLessons: async (courseId: string, lessonIds: string[]): Promise<void> => {
    await api.post(`/lms/courses/${courseId}/lessons/reorder`, { lessonIds });
  },

  instructorSubmitForReview: async (id: string): Promise<any> => {
    const { data } = await api.post<any>(`/lms/courses/${id}/submit-review`);
    return data;
  },

  instructorArchiveCourse: async (id: string): Promise<any> => {
    const { data } = await api.post<any>(`/lms/courses/${id}/archive`);
    return data;
  },

  instructorGetParticipants: async (courseId: string, params?: { status?: string; page?: number; limit?: number; query?: string; credited?: boolean }): Promise<any> => {
    const { data } = await api.get<any>(`/lms/instructor/participants/${courseId}`, { params });
    return data;
  },

  instructorGetParticipantsSummary: async (courseId: string): Promise<any> => {
    const { data } = await api.get<any>(`/lms/instructor/participants/${courseId}/summary`);
    return data;
  },
};

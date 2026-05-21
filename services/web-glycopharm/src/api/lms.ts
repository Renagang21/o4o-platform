/**
 * LMS API Client — GlycoPharm
 * WO-GLYCOPHARM-LMS-ROUTING-INTEGRATION-V1 / WO-GLYCOPHARM-COURSE-DETAIL-ENROLL-V1
 * WO-GLYCOPHARM-LESSON-QUIZ-LEARNING-V1
 * WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED: getInstructorCourses 만 @o4o/lms-client factory 사용.
 *   기존 학습자 메서드(unwrap 패턴 포함)는 그대로 유지.
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
  isPublished: boolean;
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
};

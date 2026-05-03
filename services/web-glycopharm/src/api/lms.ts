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
};

const instructorClient = createLmsInstructorClient(lmsHttp);

export const lmsApi = {
  // 강사 본인 강의 목록. 페이지(InstructorDashboardPage)는 현재 api.get 직접 호출 중이며,
  // 향후 정렬 작업에서 본 메서드로 마이그레이션한다 (이번 WO 범위 외).
  getInstructorCourses: (): Promise<LmsApiResponse<LmsCourse[]>> =>
    instructorClient.getCourses<LmsCourse>(),

  getCourses: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<LmsCoursesResult> => {
    const query = new URLSearchParams({ status: 'published' });
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const { data } = await api.get<LmsCoursesResult>(`/lms/courses?${query.toString()}`);
    return data;
  },

  // ─── 표준 이름 (WO-O4O-LMS-GLYCOPHARM-METHOD-ALIGNMENT-V1) ─────────────────
  // LMS-CLIENT-CONVENTION-V1 §4 기준. 내부 unwrap 정책은 Phase 2 범위 외이므로
  // GlycoPharm 의 기존 unwrap 패턴(`data.data.X`, try/catch null 반환)을 그대로 유지.

  getCourse: async (id: string): Promise<LmsCourse> => {
    const { data } = await api.get<{ success: boolean; data: { course: LmsCourse } }>(
      `/lms/courses/${id}`,
    );
    return data.data.course;
  },

  getEnrollmentByCourse: async (courseId: string): Promise<LmsEnrollment | null> => {
    try {
      const { data } = await api.get<{ success: boolean; data: { enrollment: LmsEnrollment } }>(
        `/lms/enrollments/${courseId}`,
      );
      return data.data.enrollment;
    } catch {
      return null;
    }
  },

  enrollCourse: async (courseId: string): Promise<LmsEnrollment> => {
    const { data } = await api.post<{ success: boolean; data: { enrollment: LmsEnrollment } }>(
      `/lms/courses/${courseId}/enroll`,
    );
    return data.data.enrollment;
  },

  getLessons: async (courseId: string): Promise<LmsLesson[]> => {
    const { data } = await api.get<{ success: boolean; data: LmsLesson[] }>(
      `/lms/courses/${courseId}/lessons`,
    );
    return data.data ?? [];
  },

  getQuizForLesson: async (lessonId: string): Promise<LmsQuiz | null> => {
    try {
      const { data } = await api.get<{ success: boolean; data: { quiz: LmsQuiz } }>(
        `/lms/lessons/${lessonId}/quiz`,
      );
      return data.data.quiz;
    } catch {
      return null;
    }
  },

  submitQuiz: async (
    quizId: string,
    answers: Array<{ questionId: string; answer: string | string[] }>,
  ): Promise<QuizSubmitResult> => {
    const { data } = await api.post<{ success: boolean; data: QuizSubmitResult }>(
      `/lms/quizzes/${quizId}/submit`,
      { answers },
    );
    return data.data;
  },

  // updateProgress: KPA/K-Cos 시그니처와 통일. completed 미지정 시 기존 GlycoPharm
  // 동작(true 고정) 보존을 위해 default = true.
  updateProgress: async (courseId: string, lessonId: string, completed: boolean = true): Promise<void> => {
    await api.post(`/lms/enrollments/${courseId}/progress`, {
      lessonId,
      completed,
    });
  },

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

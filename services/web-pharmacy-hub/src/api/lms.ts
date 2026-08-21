/**
 * LMS API Client — Pharmacy-Hub
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7
 *
 * 기존 LMS API client(`@o4o/lms-client`) 를 그대로 재사용한다. PH 전용 endpoint 를 만들지 않는다.
 * canonical serviceKey='pharmacy-hub' 를 client 계층에서 주입해 서버 필터로 경계를 정한다
 * (client-side filtering 아님 — WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1 과 동일 패턴).
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1:
 *   learner 전 동선(수강신청 · 진도 · 완료 · 수료증 · 퀴즈 · 과제)을 채택한다.
 *   PH 전용 endpoint 는 여전히 만들지 않는다 — 전부 공통 `/api/v1/lms/*` 계약을
 *   `@o4o/lms-client` factory 로 소비하고, serviceKey 는 client 계층이 부착한다.
 */

import { api } from '../lib/apiClient';
import {
  createLmsLearnerClient,
  type LmsHttpClient,
  type LmsApiResponse,
} from '@o4o/lms-client';

export interface LmsCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  category?: string;
  level?: string;
  status?: string;
  duration?: number;
  lessonCount?: number;
  enrollmentCount?: number;
  instructorId?: string | null;
  instructorName?: string;
  instructor?: { id: string; name: string };
  createdAt?: string;
  visibility?: 'public' | 'members';
  requiresApproval?: boolean;
  isPaid?: boolean;
}

export interface LmsEnrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  /** DB 는 INTEGER(완료 개수). per-lesson ID 는 metadata.completedLessonIds */
  completedLessons: number;
  startedAt: string;
  completedAt?: string;
  status?: string;
  metadata?: { completedLessonIds?: string[] };
}

/**
 * WO-O4O-LMS-CROSS-SERVICE-DATA-NORMALIZATION-V1 과 동일한 정규화.
 * 백엔드 enrollment 의 completedLessons 는 count 이고, per-lesson ID 배열은
 * metadata.completedLessonIds 에 있다.
 */
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
  description?: string;
  questions: LmsQuizQuestion[];
  passingScore: number;
}

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
  submissionType: 'text';
  dueDate: string | null;
}

export interface LmsAssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  lessonId: string;
  content: string | null;
  submittedAt: string;
  status: 'submitted';
}

export interface LmsCertificate {
  id: string;
  courseId: string;
  userId: string;
  issuedAt: string;
  certificateNumber?: string;
  course?: { id: string; title: string };
}

export interface LmsLesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  videoUrl?: string;
  content?: string;
  isPreview: boolean;
  type?: 'video' | 'article' | 'quiz' | 'assignment';
}

type ApiResponse<T> = LmsApiResponse<T>;

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

/** canonical service key — 서버 필터 입력. client-side filtering 아님. */
export const PH_SERVICE_KEY = 'pharmacy-hub';

const learnerClient = createLmsLearnerClient(lmsHttp, { serviceKey: PH_SERVICE_KEY });

export const lmsApi = {
  getCourses: (params?: {
    category?: string;
    level?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => learnerClient.getCourses<LmsCourse>(params as Record<string, unknown> | undefined),

  getCourse: (id: string) => learnerClient.getCourse<LmsCourse>(id),

  getLessons: (courseId: string) => learnerClient.getLessons<LmsLesson>(courseId),

  // getLesson 은 공통 factory 범위 밖 — 다른 서비스와 동일하게 직접 호출한다.
  getLesson: async (_courseId: string, lessonId: string): Promise<ApiResponse<{ lesson: LmsLesson }>> => {
    const { data } = await api.get<ApiResponse<{ lesson: LmsLesson }>>(`/lms/lessons/${lessonId}`, {
      params: { serviceKey: PH_SERVICE_KEY },
    });
    return data;
  },

  // ── Enrollment / Progress (WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §6·§8) ──

  getEnrollmentByCourse: (courseId: string) =>
    learnerClient.getEnrollmentByCourse<LmsEnrollment>(courseId),

  enrollCourse: (courseId: string) => learnerClient.enrollCourse<LmsEnrollment>(courseId),

  /**
   * 진도 갱신. 백엔드 공통 정책(WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1)이
   * video/article 완료 시 메트릭을 요구하므로 그대로 전달한다.
   */
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
  ) => learnerClient.updateProgress<LmsEnrollment>(courseId, lessonId, completed, metrics),

  // 내 수강 목록 (§7)
  getMyEnrollments: (params?: { status?: string; page?: number; limit?: number }) =>
    learnerClient.getMyEnrollments<LmsEnrollment>(params as Record<string, unknown> | undefined),

  // ── Quiz / Assignment (§12·§13) ────────────────────────────────────────────

  getQuizForLesson: (lessonId: string) => learnerClient.getQuizForLesson<LmsQuiz>(lessonId),

  submitQuiz: (quizId: string, answers: Array<{ questionId: string; answer: string | string[] }>) =>
    learnerClient.submitQuiz<LmsQuizResult>(quizId, answers),

  getAssignmentForLesson: (lessonId: string) =>
    learnerClient.getAssignmentForLesson<LmsAssignment>(lessonId),

  getMyAssignmentSubmission: (assignmentId: string) =>
    learnerClient.getMyAssignmentSubmission<LmsAssignmentSubmission>(assignmentId),

  submitAssignment: (assignmentId: string, content: string) =>
    learnerClient.submitAssignment<LmsAssignmentSubmission>(assignmentId, content),

  // ── Certificate (§10·§11) ──────────────────────────────────────────────────

  getMyCertificates: (params?: { page?: number; limit?: number }) =>
    learnerClient.getMyCertificates<LmsCertificate>(params as Record<string, unknown> | undefined),

  getCertificate: (id: string) => learnerClient.getCertificate<LmsCertificate>(id),

  /**
   * 수료증 PDF. blob 응답이라 공통 client(JSON envelope 계약) 범위 밖이므로
   * 여기서 직접 호출한다 — endpoint 는 공통 canonical `/lms/certificates/:id/pdf`.
   * 타인 수료증은 백엔드가 404(비노출) 로 차단한다.
   */
  downloadCertificatePdf: (id: string) =>
    api.get(`/lms/certificates/${id}/pdf`, {
      params: { serviceKey: PH_SERVICE_KEY },
      responseType: 'blob',
    }),
};

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

  // ── Operator (WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 #95) ─
  //   공통 `/api/v1/lms/operator/courses/*` — KPA/GP/KCos 와 같은 endpoint 이며
  //   서비스 경계는 backend 가 course.serviceKey 로 강제한다(프런트 필터링 아니다).
  //   목록은 learner client 와 같은 경로를 쓰며 serviceKey 가 client 계층에서 붙는다.
  operatorGetCourses: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    learnerClient.getCourses<LmsCourse>(params as Record<string, unknown> | undefined),

  operatorApproveCourse: async (id: string) => {
    const { data } = await api.post(`/lms/operator/courses/${id}/approve`);
    return data;
  },

  operatorRejectCourse: async (id: string, reason: string) => {
    const { data } = await api.post(`/lms/operator/courses/${id}/reject`, { reason });
    return data;
  },

  operatorUnpublishCourse: async (id: string) => {
    const { data } = await api.post(`/lms/operator/courses/${id}/unpublish`);
    return data;
  },

  operatorArchiveCourse: async (id: string) => {
    const { data } = await api.post(`/lms/operator/courses/${id}/archive`);
    return data;
  },

  operatorHardDeleteCourse: async (id: string) => {
    const { data } = await api.delete(`/lms/operator/courses/${id}/hard`);
    return data;
  },

  // ── Instructor (WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 #42) ─
  //   공통 `/api/v1/lms/*` 강사 계약을 그대로 소비한다 (KPA/GP 와 같은 endpoint).
  //   backend `requireInstructor`(lms:instructor) 는 서비스 중립이라 추가 guard 변경이 없고,
  //   생성 강의의 serviceKey 는 CourseController 가 작성자 membership 에서 파생한다
  //   (WO-O4O-LMS-COURSE-SERVICEKEY-V1) — 프런트가 serviceKey 를 주입하지 않는다.

  // WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10/§13:
  //   강사 목록은 `instructorId` 만으로 좁혀져 있어 다른 서비스(kpa-society) 강의가
  //   PH 화면에 그대로 보였다. learner client 와 같은 방식으로 serviceKey 를 서버에
  //   전달해 경계를 맡긴다 (client-side filtering 아님).
  getInstructorCourses: (): Promise<ApiResponse<LmsCourse[]>> =>
    lmsHttp.get<ApiResponse<LmsCourse[]>>('/lms/instructor/courses', { serviceKey: PH_SERVICE_KEY }),

  // WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10:
  //   backend envelope 은 `{ success, data: { courses: [...] } }` 이고 각 행은
  //   `courseId / totalEnrollments` 이름을 쓴다 (KPA 소비 형태와 동일).
  //   PH adapter 가 배열로 가정해 언제나 빈 목록이 됐고, 강사 대시보드가
  //   `총 강의 0 / 등록된 강의가 없습니다` 로 고정 표시됐다 — production 실측 결함.
  instructorDashboardCourses: async (): Promise<{ data: InstructorDashboardCourse[] }> => {
    const { data } = await api.get<any>('/lms/instructor/dashboard/courses', {
      params: { serviceKey: PH_SERVICE_KEY },
    });
    const payload = data?.data ?? data;
    const list = Array.isArray(payload) ? payload : (payload?.courses ?? []);
    return {
      data: (Array.isArray(list) ? list : []).map((c: any) => ({
        ...c,
        id: c.id ?? c.courseId,
        enrolledCount: c.enrolledCount ?? c.totalEnrollments,
        completionRate: c.completionRate,
      })) as InstructorDashboardCourse[],
    };
  },

  instructorPendingEnrollments: async (): Promise<PendingEnrollment[]> => {
    const { data } = await api.get<any>('/lms/instructor/enrollments', {
      params: { status: 'pending', serviceKey: PH_SERVICE_KEY },
    });
    const list = data?.data ?? data;
    return Array.isArray(list) ? list : [];
  },

  instructorApproveEnrollment: async (id: string): Promise<void> => {
    await api.post(`/lms/instructor/enrollments/${id}/approve`);
  },

  instructorRejectEnrollment: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/lms/instructor/enrollments/${id}/reject`, reason ? { reason } : undefined);
  },

  instructorGetCourse: async (id: string): Promise<InstructorCourseDetail> => {
    const { data } = await api.get<any>(`/lms/courses/${id}`);
    return data?.data?.course ?? data?.data ?? data;
  },

  // WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10:
  //   `POST /lms/courses` 는 태그가 필수다 (O4O Tag Policy V1 — CourseService.createCourse).
  //   생성 시점의 공개범위·승인 여부도 KPA 와 같은 축으로 함께 보낸다.
  instructorCreateCourse: async (dto: {
    title: string;
    description?: string;
    tags?: string[];
    visibility?: CourseVisibility;
    requiresApproval?: boolean;
  }): Promise<InstructorCourseDetail> => {
    const { data } = await api.post<any>('/lms/courses', dto);
    return data?.data?.course ?? data?.data ?? data;
  },

  instructorUpdateCourse: async (
    id: string,
    dto: {
      title?: string;
      description?: string;
      tags?: string[];
      visibility?: CourseVisibility;
      requiresApproval?: boolean;
      reusablePolicy?: CourseReusablePolicy;
    },
  ): Promise<InstructorCourseDetail> => {
    const { data } = await api.patch<any>(`/lms/courses/${id}`, dto);
    return data?.data?.course ?? data?.data ?? data;
  },

  instructorDeleteCourse: async (id: string): Promise<void> => {
    await api.delete(`/lms/courses/${id}`);
  },

  instructorSubmitForReview: async (id: string): Promise<void> => {
    await api.post(`/lms/courses/${id}/submit-review`);
  },

  instructorArchiveCourse: async (id: string): Promise<void> => {
    await api.post(`/lms/courses/${id}/archive`);
  },

  instructorGetLessons: async (courseId: string): Promise<InstructorLesson[]> => {
    const { data } = await api.get<any>(`/lms/instructor/courses/${courseId}/lessons`);
    const lessons = data?.data ?? data;
    return Array.isArray(lessons) ? lessons : [];
  },

  instructorCreateLesson: async (
    courseId: string,
    dto: {
      title: string;
      type: LessonType;
      description?: string | null;
      content?: string | null;
      videoUrl?: string | null;
      order?: number;
      duration?: number;
    },
  ): Promise<any> => {
    const { data } = await api.post<any>(`/lms/courses/${courseId}/lessons`, dto);
    return data;
  },

  instructorUpdateLesson: async (
    lessonId: string,
    dto: {
      title?: string;
      description?: string | null;
      content?: string | null;
      videoUrl?: string | null;
      duration?: number;
    },
  ): Promise<any> => {
    const { data } = await api.patch<any>(`/lms/lessons/${lessonId}`, dto);
    return data;
  },

  instructorDeleteLesson: async (lessonId: string): Promise<void> => {
    await api.delete(`/lms/lessons/${lessonId}`);
  },

  instructorReorderLessons: async (courseId: string, lessonIds: string[]): Promise<void> => {
    await api.post(`/lms/courses/${courseId}/lessons/reorder`, { lessonIds });
  },

  instructorGetParticipants: async (
    courseId: string,
    params?: { status?: string; page?: number; limit?: number; query?: string },
  ): Promise<any> => {
    const { data } = await api.get<any>(`/lms/instructor/participants/${courseId}`, { params });
    return data;
  },

  instructorGetParticipantsSummary: async (courseId: string): Promise<any> => {
    const { data } = await api.get<any>(`/lms/instructor/participants/${courseId}/summary`);
    return data;
  },

  /**
   * 과제 제출물 조회·채점 (WO-O4O-LMS-ASSIGNMENT-GRADING-V1 공통 계약).
   * 채점은 평가·피드백 축이며 수료·수료증·크레딧 조건이 아니다 — 정책은 backend 소관이고
   * 프런트가 재해석하지 않는다.
   */
  /**
   * 퀴즈·과제 세부 편집 (공통 `/lms/{quizzes,assignments}` 계약).
   * 두 endpoint 모두 `requireInstructor` 서비스 중립 guard 이며 PH 전용 분기는 없다.
   */
  instructorGetQuizForLesson: async (lessonId: string): Promise<InstructorQuiz | null> => {
    const { data } = await api.get<any>(`/lms/lessons/${lessonId}/quiz`);
    return data?.data?.quiz ?? data?.quiz ?? null;
  },

  instructorCreateQuiz: async (dto: UpsertQuizInput): Promise<InstructorQuiz> => {
    const { data } = await api.post<any>('/lms/quizzes', dto);
    return data?.data ?? data;
  },

  instructorUpdateQuiz: async (quizId: string, dto: Partial<UpsertQuizInput>): Promise<InstructorQuiz> => {
    const { data } = await api.patch<any>(`/lms/quizzes/${quizId}`, dto);
    return data?.data ?? data;
  },

  instructorGetAssignmentForLesson: async (lessonId: string): Promise<InstructorAssignment | null> => {
    const { data } = await api.get<any>(`/lms/lessons/${lessonId}/assignment`);
    return data?.data?.assignment ?? null;
  },

  instructorUpsertAssignment: async (dto: UpsertAssignmentInput): Promise<InstructorAssignment> => {
    const { data } = await api.post<any>('/lms/assignments', dto);
    return data?.data?.assignment ?? data?.data ?? data;
  },

  instructorListLessonSubmissions: async (lessonId: string): Promise<InstructorSubmission[]> => {
    const { data } = await api.get<any>(`/lms/instructor/lessons/${lessonId}/submissions`);
    const list = data?.data?.items ?? data?.items ?? [];
    return Array.isArray(list) ? list : [];
  },

  instructorGradeSubmission: async (
    submissionId: string,
    dto: GradeSubmissionInput,
  ): Promise<InstructorSubmission> => {
    const { data } = await api.post<any>(`/lms/instructor/submissions/${submissionId}/grade`, dto);
    return data?.data?.submission ?? data?.data ?? data;
  },

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

// ─── Instructor 타입 (WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 #42)
//   공통 LMS 강사 계약의 응답 형태다. PH 전용 필드는 없다.

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
  content: unknown;
  videoUrl: string | null;
  duration: number;
  order: number;
  isPublished?: boolean;
  isFree?: boolean;
}

export interface InstructorDashboardCourse extends LmsCourse {
  enrolledCount?: number;
  completionRate?: number;
  pendingCount?: number;
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

/** 수강자 관리(`/lms/instructor/participants/:courseId`) 행 — 공통 계약. */
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

/** 과제 채점 축 — 공통 `/lms/instructor/{lessons,submissions}` 계약 그대로. */
export type GradingStatus = 'ungraded' | 'graded' | 'returned';

export interface InstructorSubmission {
  id: string;
  userId: string;
  userName: string;
  content: string | null;
  submittedAt: string;
  status: 'submitted';
  gradingStatus: GradingStatus;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  gradedBy: string | null;
}

export interface GradeSubmissionInput {
  gradingStatus: 'graded' | 'returned';
  score?: number | null;
  feedback?: string | null;
}

/** 퀴즈 편집 축 — 공통 `/lms/quizzes` 계약 그대로. */
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
  showResultsImmediately?: boolean;
  showCorrectAnswers: boolean;
  isPublished: boolean;
}

export interface UpsertQuizInput {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: Omit<QuizQuestionDraft, 'id'>[];
  passingScore: number;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  showCorrectAnswers?: boolean;
  isPublished?: boolean;
}

/** 과제 편집 축 — 공통 `/lms/assignments` 계약 그대로 (제출 방식 text 고정). */
export interface InstructorAssignment {
  id: string;
  lessonId: string;
  instructions: string | null;
  submissionType: 'text';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAssignmentInput {
  lessonId: string;
  instructions?: string | null;
  dueDate?: string | null;
}

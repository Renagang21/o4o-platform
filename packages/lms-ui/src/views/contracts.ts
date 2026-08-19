/**
 * @o4o/lms-ui — 강의 상세 / 레슨 플레이어 공통 View 계약
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1
 *
 * 원칙:
 *  - 본 패키지는 axios/fetch/apiClient 를 직접 import 하지 않는다.
 *    모든 IO 는 서비스가 주입하는 `LmsLearnerPort` 를 통해서만 발생한다.
 *  - route 경로 · 라벨 · accent · 인증 상태 · toast 는 `LmsViewConfig` 로 주입한다.
 *  - 서비스별 차이는 config / optional port 메서드 / slot 으로 표현한다.
 *    `serviceKey` 분기(거대 switch)는 두지 않는다.
 */

// ─── Domain view models (adapter 가 서비스 응답을 이 형태로 정규화) ───────────

export interface LmsCourseDetailData {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  instructorName?: string | null;
  instructorId?: string | null;
  lessonCount?: number;
  /** 총 강의 시간(분). */
  durationMinutes?: number;
  enrollmentCount?: number;
  visibility?: 'public' | 'members' | string;
  requiresApproval?: boolean;
  isPaid?: boolean;
  status?: string;
}

export interface LmsLessonData {
  id: string;
  title: string;
  courseId?: string;
  type?: string;
  order?: number;
  durationMinutes?: number;
  isPreview?: boolean;
  videoUrl?: string | null;
  /** HTML 문자열. 실제 렌더는 `renderContent` slot 에서 서비스가 수행(sanitize 포함). */
  content?: string | null;
}

export interface LmsEnrollmentData {
  id?: string;
  status?: string;
  /** 0-100 */
  progress: number;
  /** 완료 레슨 수(백엔드 집계값). */
  completedLessons?: number;
  completedLessonIds: string[];
}

export interface LmsQuizQuestionData {
  id: string;
  question: string;
  type?: 'single' | 'multi' | 'text' | string;
  options?: string[];
  points?: number;
}

export interface LmsQuizData {
  id: string;
  title?: string;
  description?: string | null;
  passingScore: number;
  questions: LmsQuizQuestionData[];
}

export interface LmsQuizResultData {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  creditsEarned: number;
  answers?: Array<{ questionId: string; isCorrect: boolean }>;
}

export interface LmsAssignmentData {
  id: string;
  instructions?: string | null;
  dueDate?: string | null;
}

export interface LmsSubmissionData {
  id?: string;
  content?: string | null;
  submittedAt?: string | null;
  /** 'ungraded' | 'graded' | 'returned' — 채점 미지원 서비스는 undefined. */
  gradingStatus?: string | null;
  score?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
}

export interface LmsAiResultData {
  summary?: string | null;
  insights: string[];
  recommendations: string[];
}

/** 레슨 완료 메트릭 — 백엔드 정책(video 70% / article scroll 80% 또는 dwell 30초)에 대응. */
export interface LmsCompletionMetrics {
  watchedSeconds?: number;
  progressRatio?: number;
  scrolledRatio?: number;
  dwellTimeSeconds?: number;
}

// ─── Port (서비스 adapter 가 구현) ───────────────────────────────────────────

/**
 * 필수 메서드는 3서비스 공통 백엔드 계약(`/lms/*`)에 모두 존재한다.
 * optional 메서드는 **서비스별 기능 유무**를 나타낸다 — 미구현이면 해당 UI 를 렌더하지 않는다.
 */
export interface LmsLearnerPort {
  getCourse(courseId: string): Promise<LmsCourseDetailData | null>;
  getLessons(courseId: string): Promise<LmsLessonData[]>;
  getLesson?(courseId: string, lessonId: string): Promise<LmsLessonData | null>;
  getEnrollment(courseId: string): Promise<LmsEnrollmentData | null>;
  enroll(courseId: string): Promise<LmsEnrollmentData | null>;
  updateProgress(
    courseId: string,
    lessonId: string,
    completed: boolean,
    metrics?: LmsCompletionMetrics,
  ): Promise<LmsEnrollmentData | null>;

  getQuizForLesson?(lessonId: string): Promise<LmsQuizData | null>;
  submitQuiz?(
    quizId: string,
    answers: Array<{ questionId: string; answer: string | string[] }>,
  ): Promise<LmsQuizResultData | null>;

  getAssignmentForLesson?(lessonId: string): Promise<LmsAssignmentData | null>;
  getMyAssignmentSubmission?(assignmentId: string): Promise<LmsSubmissionData | null>;
  submitAssignment?(
    assignmentId: string,
    content: string,
  ): Promise<{ submission: LmsSubmissionData | null; lessonCompleted: boolean }>;

  analyzeQuiz?(input: {
    lessonId?: string;
    questions: Array<{ id: string; question: string; type?: string; options?: string[] }>;
    userAnswers: Array<{ questionId: string; answer: string | string[]; isCorrect: boolean }>;
    score: number;
    passingScore: number;
  }): Promise<LmsAiResultData | null>;

  feedbackAssignment?(input: {
    lessonId?: string;
    instructions?: string;
    submissionContent: string;
  }): Promise<LmsAiResultData | null>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface LmsViewNotify {
  success(message: string): void;
  error(message: string): void;
}

export interface LmsViewLabels {
  /** '강의' | '안내 흐름' */
  courseWord: string;
  /** '레슨' | '단계' */
  lessonWord: string;
  breadcrumbHome: string;
  breadcrumbHub: string;
  courseLoading: string;
  courseNotFoundTitle: string;
  courseNotFoundDesc: string;
  membersOnlyTitle: string;
  membersOnlyDesc: string;
  loginLabel: string;
  backToHubLabel: string;
  backToCourseLabel: string;
  introSectionTitle: string;
  lessonsSectionTitle: string;
  enrollLabel: string;
  enrollingLabel: string;
  enrolledMessage: string;
  enrollFailedMessage: string;
  continueLabel: string;
  certificateLabel: string;
  lessonLoading: string;
  lessonNotFoundTitle: string;
  lessonNotFoundDesc: string;
  prevLessonLabel: string;
  nextLessonLabel: string;
  completeLabel: string;
  allDoneMessage: string;
  progressFailedMessage: string;
}

const DEFAULT_LABELS: LmsViewLabels = {
  courseWord: '강의',
  lessonWord: '레슨',
  breadcrumbHome: '홈',
  breadcrumbHub: '강의',
  courseLoading: '강의를 불러오는 중...',
  courseNotFoundTitle: '강의를 찾을 수 없습니다',
  courseNotFoundDesc: '삭제되었거나 존재하지 않는 강의입니다.',
  membersOnlyTitle: '회원 전용 강의입니다',
  membersOnlyDesc: '이 강의는 로그인한 회원만 볼 수 있습니다. 로그인 후 다시 시도해 주세요.',
  loginLabel: '로그인하기',
  backToHubLabel: '목록으로',
  backToCourseLabel: '강의로',
  introSectionTitle: '소개',
  lessonsSectionTitle: '커리큘럼',
  enrollLabel: '수강 신청하기',
  enrollingLabel: '신청 중...',
  enrolledMessage: '수강 신청이 완료되었습니다.',
  enrollFailedMessage: '수강 신청에 실패했습니다.',
  continueLabel: '이어서 학습하기',
  certificateLabel: '수료증 보기',
  lessonLoading: '레슨을 불러오는 중...',
  lessonNotFoundTitle: '레슨을 찾을 수 없습니다',
  lessonNotFoundDesc: '삭제되었거나 존재하지 않는 레슨입니다.',
  prevLessonLabel: '← 이전 레슨',
  nextLessonLabel: '다음 레슨 →',
  completeLabel: '✓ 완료',
  allDoneMessage: '모든 레슨을 완료했습니다!',
  progressFailedMessage: '진도 업데이트에 실패했습니다.',
};

/** 서비스별 어휘 override. 미지정 항목은 기본 라벨을 사용한다. */
export function createLmsLabels(overrides?: Partial<LmsViewLabels>): LmsViewLabels {
  return { ...DEFAULT_LABELS, ...(overrides ?? {}) };
}

export interface LmsViewConfig {
  /** 서비스 accent(primary) 색상. */
  accent?: string;
  /** LMS 허브 경로. 예: '/lms' */
  hubPath: string;
  /** 강의 상세 경로 생성. 미지정 시 `${hubPath}/course/${courseId}`. */
  coursePath?: (courseId: string) => string;
  /** 레슨 경로 생성. 미지정 시 `${hubPath}/course/${courseId}/lesson/${lessonId}`. */
  lessonPath?: (courseId: string, lessonId: string) => string;
  /** 수료증 경로. 미지정이면 `onCertificateUnavailable` 을 사용하고, 둘 다 없으면 CTA 를 숨긴다. */
  certificatesPath?: string | null;
  /** 수료증 기능 미제공 서비스의 대체 동작(예: '준비 중' 안내). */
  onCertificateUnavailable?: () => void;
  /** 로그인 여부. false 면 enrollment 조회를 시도하지 않는다. */
  isAuthenticated: boolean;
  /** 로그인 유도. 미지정 시 `/login` 으로 navigate. */
  onRequireLogin?: () => void;
  /** SPA 네비게이션(react-router `useNavigate` 등). */
  navigate: (path: string) => void;
  notify: LmsViewNotify;
  labels: LmsViewLabels;
  /**
   * 수강신청·진도 기능 사용 여부. 기본 true(기존 서비스 동작 유지).
   *
   * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §8:
   *   Pharmacy-Hub baseline 은 "조회·학습"만이며 Enrollment/Progress 는 범위 밖이다.
   *   false 면 수강신청 CTA · 진도바 · 완료 처리 · 수료 모달을 노출하지 않고
   *   enrollment 조회도 하지 않는다(공통 LMS 정책은 그대로 둔다 — config 로만 끈다).
   */
  enrollmentEnabled?: boolean;
}

export function resolveCoursePath(config: LmsViewConfig, courseId: string): string {
  return config.coursePath ? config.coursePath(courseId) : `${config.hubPath}/course/${courseId}`;
}

export function resolveLessonPath(config: LmsViewConfig, courseId: string, lessonId: string): string {
  return config.lessonPath
    ? config.lessonPath(courseId, lessonId)
    : `${config.hubPath}/course/${courseId}/lesson/${lessonId}`;
}

/**
 * 회원 전용 강의 접근 거부 판정.
 * 백엔드 공통 계약(`CourseController.getCourse`)의 `MEMBERS_ONLY` 코드를 사용한다.
 * 서비스별 http 래퍼가 code 를 싣는 위치가 달라 3경로를 모두 확인한다.
 */
export function isMembersOnlyError(err: unknown): boolean {
  const e = err as any;
  return (
    e?.code === 'MEMBERS_ONLY' ||
    e?.response?.data?.code === 'MEMBERS_ONLY' ||
    (typeof e?.message === 'string' && e.message.includes('MEMBERS_ONLY'))
  );
}

/** 백엔드 오류 메시지 추출 — axios(`response.data.error`) / fetch 래퍼(`message`) 공통. */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as any;
  return e?.response?.data?.error || (e instanceof Error ? e.message : null) || fallback;
}

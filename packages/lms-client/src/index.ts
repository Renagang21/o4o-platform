/**
 * @o4o/lms-client
 *
 * WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED (Step A + B)
 *
 * 목적: APP-LMS Phase 2 의 첫 단계로 3개 서비스에 중복된 LMS 타입/메서드 중
 *      "안전하게 공통화 가능한 접점" 만 우선 추출한다.
 *
 * 본 패키지의 범위:
 *   - 공통 Base 타입 (Course/Lesson/Enrollment/Certificate/InstructorCourse)
 *   - getInstructorCourses 만 공통 client factory 로 제공
 *
 * 본 패키지의 비범위 (의도적으로 제외):
 *   - 학습자 메서드(getCourses, getLessons, enrollCourse 등) — 서비스별 응답 형태/메서드명이
 *     서로 달라 정렬 작업이 선행되어야 한다.
 *   - GlycoPharm 의 unwrap 패턴(`.data.data.course`) 정렬
 *   - 페이지 호출부 변경
 *
 * 본 패키지는 axios/fetch 를 직접 import 하지 않는다. 서비스가 자체 http adapter 를
 * 주입(`createLmsInstructorClient(http)`)하여 사용한다. 이로써 KPA 의 fetch 래퍼와
 * GlycoPharm/K-Cosmetics 의 axios 인스턴스를 모두 수용한다.
 */

// ─── Base Types ─────────────────────────────────────────────────────────────

/**
 * 백엔드 LMS 표준 응답 envelope. `apps/api-server/src/modules/lms` 의 응답이
 * `{ success, data }` 형식이라는 사실에 의존한다.
 */
export interface LmsApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Course 상태 머신 — APP-LMS-BASELINE.md §4 의 상태 머신과 일치.
 * 서비스별 status 필드는 string 으로 유지하고 비교 시 본 union 을 참조한다.
 */
export type LmsCourseStatus = 'draft' | 'pending_review' | 'published' | 'archived';

/**
 * Course base — 3개 서비스 모두에서 의미가 일치하는 최소 필드.
 * 서비스 자체 타입(`LmsCourse`, `Course`)은 이 인터페이스를 만족하는 형태로 유지하되,
 * `isPublished`, `instructor`, `category` 같은 서비스별 필드는 각자 확장한다.
 */
export interface LmsCourseBase {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  status?: string;
  createdAt?: string;
}

/** Lesson base */
export interface LmsLessonBase {
  id: string;
  courseId: string;
  title: string;
  order: number;
  duration: number;
  description?: string | null;
}

/** Enrollment base */
export interface LmsEnrollmentBase {
  id: string;
  courseId: string;
  userId: string;
  status?: string;
}

/** Certificate base */
export interface LmsCertificateBase {
  id: string;
  courseId: string;
  userId: string;
  issuedAt: string;
}

/**
 * Instructor course base — 강사 대시보드 측에서 본인 강의 조회 시 사용.
 * 통계 필드(`enrolledCount`, `completionRate`, `enrollmentCount`)는 서비스별 명칭이
 * 다르므로 본 base 에는 포함하지 않는다. 각 서비스가 확장한다.
 */
export interface LmsInstructorCourseBase extends LmsCourseBase {}

// ─── Paginated Response (학습자 목록 조회용) ────────────────────────────────

/**
 * 백엔드 `/lms/courses` 페이지네이션 응답.
 * KPA `PaginatedResponse<T>`, GlycoPharm `LmsCoursesResult`, K-Cos `PaginatedResponse<T>` 와 호환.
 */
export interface LmsPaginatedResponse<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  /** 일부 서비스(GlycoPharm)는 `meta` 키를 사용. 타입은 호환만 보장. */
  meta?: { page: number; limit: number; total: number; totalPages: number };
  /** 일부 호출은 `totalPages` 만 노출 — backward compat */
  totalPages?: number;
}

// ─── HTTP Adapter ───────────────────────────────────────────────────────────

/**
 * 서비스별 http 클라이언트(fetch 래퍼 / axios 등)를 흡수하는 최소 인터페이스.
 * 각 메서드는 envelope 까지 포함한 결과(`Promise<T>`)를 반환해야 한다 — adapter 가
 * axios 의 `{ data }` 단계만 unwrap 한다.
 *
 * WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP1: post/patch/delete 추가.
 *   write API 는 Step 2 에서 활용. 인터페이스만 미리 정의해 adapter 호환성을 잡아둔다.
 */
export interface LmsHttpClient {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// ─── Learner Client Factory (WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP1) ─────────

/**
 * 학습자 측 read-only client. 현 단계(Step 1)에서 5개 메서드만 추출.
 *
 * 반환 형태: 백엔드 envelope(`{ success, data: ... }`) 그대로 노출 — LMS-CLIENT-CONVENTION-V1 §5.
 * 서비스별 lms.ts 가 thin wrapper 로 자체 반환 형태(envelope 유지 / unwrap 등)를 결정한다.
 *
 * 본 factory 는 axios/fetch 를 직접 사용하지 않으며, LmsHttpClient 인터페이스로 추상화한다.
 *
 * 제외 항목 (의도적):
 *   - getLesson — GlycoPharm backend 미구현. Phase 5 에서 추가.
 *   - write API (enrollCourse, updateProgress, submitQuiz) — Step 2.
 */
export function createLmsLearnerClient(http: LmsHttpClient) {
  return {
    /** 강의 단건 조회. 반환: `{ success, data: { course: T } }` */
    getCourse<T extends LmsCourseBase = LmsCourseBase>(id: string): Promise<LmsApiResponse<{ course: T }>> {
      return http.get<LmsApiResponse<{ course: T }>>(`/lms/courses/${id}`);
    },

    /** 강의 목록 조회. 반환: `LmsPaginatedResponse<T>` (data 배열 + pagination/meta 옵션). */
    getCourses<T extends LmsCourseBase = LmsCourseBase>(
      params?: Record<string, unknown>,
    ): Promise<LmsPaginatedResponse<T>> {
      return http.get<LmsPaginatedResponse<T>>('/lms/courses', params);
    },

    /** 코스 레슨 목록. 반환: `{ success, data: T[] }` */
    getLessons<T extends LmsLessonBase = LmsLessonBase>(
      courseId: string,
    ): Promise<LmsApiResponse<T[]>> {
      return http.get<LmsApiResponse<T[]>>(`/lms/courses/${courseId}/lessons`);
    },

    /** 본인의 특정 강의 수강 정보. 반환: `{ success, data: { enrollment: T } }` */
    getEnrollmentByCourse<T extends LmsEnrollmentBase = LmsEnrollmentBase>(
      courseId: string,
    ): Promise<LmsApiResponse<{ enrollment: T }>> {
      return http.get<LmsApiResponse<{ enrollment: T }>>(`/lms/enrollments/me/course/${courseId}`);
    },

    /** 레슨에 연결된 퀴즈 조회. 반환: `{ success, data: { quiz: T } }` */
    getQuizForLesson<T = unknown>(
      lessonId: string,
    ): Promise<LmsApiResponse<{ quiz: T }>> {
      return http.get<LmsApiResponse<{ quiz: T }>>(`/lms/lessons/${lessonId}/quiz`);
    },
  };
}

// ─── Instructor Client Factory ──────────────────────────────────────────────

/**
 * 강사 측 client. 현재 "본인 강의 목록 조회" 한 가지만 공통화한다.
 * 3개 서비스 모두 동일 endpoint(`GET /lms/instructor/courses`) 를 호출하며,
 * 백엔드는 `requireInstructor` 미들웨어로 보호된다.
 *
 * 사용 예 (K-Cosmetics 패턴):
 *   const lmsHttp: LmsHttpClient = {
 *     get: async (path, params) => (await api.get(path, { params })).data,
 *   };
 *   const instructorClient = createLmsInstructorClient(lmsHttp);
 *   const res = await instructorClient.getCourses<MyCourseType>();
 */
export function createLmsInstructorClient(http: LmsHttpClient) {
  return {
    /**
     * 강사 본인 강의 목록 조회.
     * 반환은 표준 envelope. `T` 는 호출측에서 서비스별 확장 type 지정 가능.
     */
    getCourses<T extends LmsInstructorCourseBase = LmsInstructorCourseBase>(): Promise<LmsApiResponse<T[]>> {
      return http.get<LmsApiResponse<T[]>>('/lms/instructor/courses');
    },
  };
}

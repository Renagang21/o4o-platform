/**
 * @o4o/lms-ui view models
 *
 * WO-O4O-LMS-COMMON-UI-EXTRACTION-V1
 *
 * presentational 컴포넌트가 받는 view model 타입. 서비스별 API 응답 원본 타입
 * (KPA/GP/KCos 의 Course/Lesson/Enrollment)에 직접 묶지 않는다 — 서비스 wrapper 가
 * 자신의 응답을 이 view model 로 매핑해 주입한다(adapter 책임은 서비스에).
 */

export type CourseVisibility = 'public' | 'members';

export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export type LessonKind = 'video' | 'article' | 'quiz' | 'assignment';

/**
 * 수강 신청 버튼이 표현하는 상태. 'none' = 미수강(신청 가능).
 * 'archived' 는 강의 종료로 신청 불가.
 */
export type EnrollmentState =
  | 'none'
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'archived';

/** 서비스 accent(테마) — KPA blue / GP green / KCos pink 등 */
export interface LmsUiTheme {
  /** primary accent color (CSS color). 미지정 시 기본값 사용. */
  accent?: string;
}

export const DEFAULT_ACCENT = '#2563eb';

export interface CourseCardView {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  instructorName?: string;
  lessonCount?: number;
  durationMinutes?: number;
  enrollmentCount?: number;
  visibility?: CourseVisibility;
  status?: CourseStatus;
  /** 표시 전용 — 결제는 O4O 에서 제공하지 않음(외부/오프라인 안내). */
  isPaid?: boolean;
  /** 수강 중일 때 0-100. */
  progressPercent?: number;
  /** 수강 중 여부(진도 표시 노출 등). */
  enrolled?: boolean;
}

export interface LessonItemView {
  id: string;
  title: string;
  order?: number;
  kind?: LessonKind;
  durationMinutes?: number;
  completed?: boolean;
  /** 현재 보고 있는 레슨 강조. */
  current?: boolean;
  /** 접근 불가(미수강 + 미리보기 아님 등). */
  locked?: boolean;
  isPreview?: boolean;
}

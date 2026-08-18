/**
 * @o4o/lms-ui — Shared presentational LMS UI primitives
 *
 * WO-O4O-LMS-COMMON-UI-EXTRACTION-V1
 *
 * 원칙(검증 대상):
 *  - API client / fetch / axios 직접 사용 없음.
 *    presentational 컴포넌트는 순수 표현, `views/*` 는 container 이되 모든 IO 를
 *    주입된 `LmsLearnerPort` 로만 수행한다(WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1)
 *  - serviceKey 내부 결정 없음, route path 하드코딩 없음 (href/onClick 주입)
 *  - theme/accent/labels 는 props 로 주입
 *  - reward 설정 UI 없음, YouTube/LIVE 임베드 없음, 결제/checkout 없음
 *  - react-router 등 라우터 의존 없음 — navigate/href 는 주입
 *  - Neture 는 LMS 대상 아님 — 본 패키지를 소비하지 않는다
 */

export * from './types';

export { CourseVisibilityBadge } from './components/CourseVisibilityBadge';
export type { CourseVisibilityBadgeProps } from './components/CourseVisibilityBadge';

export { CourseStatusBadge } from './components/CourseStatusBadge';
export type { CourseStatusBadgeProps } from './components/CourseStatusBadge';

export { CourseProgressBar } from './components/CourseProgressBar';
export type { CourseProgressBarProps } from './components/CourseProgressBar';

export { NoPaymentNotice } from './components/NoPaymentNotice';
export type { NoPaymentNoticeProps } from './components/NoPaymentNotice';

export { EnrollmentButton } from './components/EnrollmentButton';
export type { EnrollmentButtonProps } from './components/EnrollmentButton';

export { CourseCard } from './components/CourseCard';
export type { CourseCardProps } from './components/CourseCard';

export { CourseList } from './components/CourseList';
export type { CourseListProps } from './components/CourseList';

export { LessonList } from './components/LessonList';
export type { LessonListProps } from './components/LessonList';

export { LessonPlayerShell } from './components/LessonPlayerShell';
export type { LessonPlayerShellProps } from './components/LessonPlayerShell';

// ─── 공통 View (강의 상세 / 레슨 플레이어) ──────────────────────────────────

export * from './views/contracts';

export {
  LmsCard,
  LmsLoading,
  LmsEmptyState,
  NavLink,
  pageContainerStyle,
  sectionTitleStyle,
  primaryButtonStyle,
} from './views/primitives';
export type { LmsCardProps, LmsLoadingProps, LmsEmptyStateProps, NavLinkProps } from './views/primitives';

export { CourseDetailView } from './views/CourseDetailView';
export type { CourseDetailViewProps, CourseDetailSlotContext } from './views/CourseDetailView';

export { LessonPlayerView } from './views/LessonPlayerView';
export type { LessonPlayerViewProps } from './views/LessonPlayerView';

// 카드형 강의 목록 공통 View (WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1)
export { CourseListView } from './views/CourseListView';
export type { CourseListViewProps, CourseListFilterOption } from './views/CourseListView';

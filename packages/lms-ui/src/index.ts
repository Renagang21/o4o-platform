/**
 * @o4o/lms-ui — Shared presentational LMS UI primitives
 *
 * WO-O4O-LMS-COMMON-UI-EXTRACTION-V1
 *
 * 원칙(검증 대상):
 *  - pure presentational: API client / fetch / axios 직접 사용 없음
 *  - serviceKey 내부 결정 없음, route path 하드코딩 없음 (href/onClick 주입)
 *  - theme/accent/labels 는 props 로 주입
 *  - reward 설정 UI 없음, YouTube/LIVE 임베드 없음, 결제/checkout 없음
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

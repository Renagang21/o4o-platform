/**
 * 테스트 피드백 게시판 타입 정의
 * WO-KPA-TEST-FEEDBACK-BOARD-V1
 *
 * 목적: 테스트 참여자의 기능 개선/수정 요청을 수집하고 논의
 */

/**
 * 피드백 요청 유형
 */
export type FeedbackType = 'improvement' | 'fix' | 'bug' | 'opinion';

/**
 * 피드백 상태
 */
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix';

/**
 * 피드백 게시글
 */
export interface FeedbackPost {
  id: string;
  title: string;
  content: string;
  type: FeedbackType;
  status: FeedbackStatus;
  authorId: string;
  authorName: string;
  authorRole: string; // district_admin | branch_admin
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  isPinned: boolean;
}

/**
 * 피드백 댓글
 */
export interface FeedbackComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  isOperatorResponse: boolean; // 운영자 답변 여부
  createdAt: string;
  updatedAt?: string;
}

/**
 * 피드백 타입 라벨
 */
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  improvement: '기능 개선',
  fix: '수정 요청',
  bug: '오류/문제',
  opinion: '운영 의견',
};

/**
 * 피드백 타입 색상
 */
export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  improvement: '#3b82f6', // blue
  fix: '#f59e0b', // amber
  bug: '#ef4444', // red
  opinion: '#8b5cf6', // purple
};

/**
 * 피드백 상태 라벨
 */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: '접수됨',
  in_progress: '검토 중',
  resolved: '반영 완료',
  wont_fix: '보류',
};

/**
 * 피드백 상태 색상
 */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: '#6b7280', // gray
  in_progress: '#3b82f6', // blue
  resolved: '#10b981', // green
  wont_fix: '#9ca3af', // light gray
};

import { ROLES, hasAnyRole } from '../lib/role-constants';

/**
 * 피드백 작성 권한 확인
 */
export function canWriteFeedback(userRoles?: string[]): boolean {
  if (!userRoles) return false;
  return hasAnyRole(userRoles, [ROLES.KPA_DISTRICT_ADMIN, ROLES.KPA_BRANCH_ADMIN, ROLES.KPA_ADMIN]);
}

/**
 * 피드백 관리 권한 확인 (상태 변경, 고정 등)
 */
export function canManageFeedback(userRoles?: string[]): boolean {
  if (!userRoles) return false;
  return hasAnyRole(userRoles, [ROLES.KPA_ADMIN, ROLES.KPA_DISTRICT_ADMIN]);
}

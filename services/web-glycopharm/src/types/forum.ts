/**
 * Forum Extension Types
 *
 * 단일 피드형 포럼
 * 신청 기반 개설 → 승인 후 오픈
 * 회원 전용 접근
 */

import type { UserRole } from './index';

/**
 * 포럼 상태
 */
export type ForumStatus = 'open' | 'readonly' | 'closed';

/**
 * 포럼 신청 상태
 */
export type ForumApplicationStatus = 'pending' | 'approved' | 'rejected';

/**
 * 포럼
 */
export interface Forum {
  id: string;
  title: string;
  description: string;
  status: ForumStatus;
  allowedRoles: UserRole[];        // 작성 가능 Role
  creatorId: string;
  creatorName: string;
  postCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 포럼 개설 신청
 */
export interface ForumApplication {
  id: string;
  title: string;
  description: string;
  purpose: string;
  targetRoles: UserRole[];         // 예상 참여 대상
  allowedWriteRoles: UserRole[];   // 작성 권한 Role
  note?: string;
  applicantId: string;
  applicantName: string;
  status: ForumApplicationStatus;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

/**
 * 게시글 타입
 */
export type PostType = 'normal' | 'notice';

/**
 * 게시글 (Forum Extension)
 */
export interface ForumExtPost {
  id: string;
  forumId: string;
  type: PostType;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  isPinned: boolean;
  allowComments: boolean;          // 공지글 댓글 ON/OFF
  replyCount: number;
  viewCount: number;
  // 참조 연결
  linkedTrialId?: string;          // Market Trial 연결
  linkedSignageId?: string;        // Signage 콘텐츠 연결
  createdAt: string;
  updatedAt: string;
}

/**
 * 댓글 (단순 Reply, 대댓글 없음)
 */
export interface ForumReply {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

/**
 * 포럼 개설 신청 폼 데이터
 */
export interface ForumApplicationFormData {
  title: string;
  description: string;
  purpose: string;
  targetRoles: UserRole[];
  allowedWriteRoles: UserRole[];
  note?: string;
}

/**
 * 게시글 작성 폼 데이터
 */
export interface PostFormData {
  title: string;
  content: string;
  type: PostType;
  isPinned: boolean;
  allowComments: boolean;
  linkedTrialId?: string;
  linkedSignageId?: string;
}

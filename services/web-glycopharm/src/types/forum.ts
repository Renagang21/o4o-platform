/**
 * Forum Extension Types — GlycoPharm App-level 정의
 *
 * 단일 피드형 포럼
 * 신청 기반 개설 → 승인 후 오픈
 * 회원 전용 접근
 *
 * ⚠ 이 파일의 타입은 Forum Core(PostStatus, PostType 등)와 **별개**이다.
 *   Forum Core는 "게시글 단위" 상태만 관리하며,
 *   "포럼 단위 운영 상태(ForumStatus)"는 Core에 존재하지 않는다.
 *   GlycoPharm App이 자체적으로 관리하는 App-level 상태이다.
 *
 * @see packages/types/src/forum.ts  — Core 기준 타입 (ForumPostStatus, ForumPostType 등)
 */

import type { UserRole } from './index';

/**
 * 포럼 운영 상태 (App-level — Core에 없음)
 *
 * Forum Core의 PostStatus와 혼동하지 않는다.
 * - open: 읽기/쓰기 모두 허용
 * - readonly: 읽기만 허용, 새 글/댓글 작성 불가
 * - closed: 비공개 (관리자만 접근)
 */
export type ForumStatus = 'open' | 'readonly' | 'closed';

/**
 * 포럼 개설 신청 상태 (App-level)
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
 * 게시글 타입 (App-level — Core PostType과 별개)
 *
 * Core의 ForumPostType('discussion'|'question'|...) 과 다른 체계이다.
 * GlycoPharm 포럼은 'normal'|'notice' 2단계만 사용한다.
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

/**
 * Forum API Response DTOs
 *
 * Backend API 응답 구조의 Single Source of Truth (Frontend-safe).
 * TypeORM 등 백엔드 전용 의존성 없이, JSON 직렬화 후의 응답 형태만 정의.
 *
 * Phase 19-B: Forum Frontend Type & API Contract 정합 리팩토링
 */

import type { Block } from './post.js';

// =============================================================================
// Enum-equivalent String Unions (frontend-safe, no TypeORM dependency)
//
// 이 값들은 forum-core 엔티티의 TypeORM enum과 1:1 대응한다.
// 값을 추가·삭제하려면 Core enum과 동시에 수정해야 한다.
// =============================================================================

/**
 * 게시글 생명주기 상태
 * - draft: 작성 중 (비공개)
 * - publish: 공개
 * - pending: 승인 대기
 * - rejected: 반려
 * - archived: 보관 (목록 숨김)
 */
export type ForumPostStatus = 'draft' | 'publish' | 'pending' | 'rejected' | 'archived';

/**
 * 게시글 콘텐츠 성격 분류
 *
 * App 고유 유형(예: GlycoPharm 'normal'|'notice')은 이 타입에 포함하지 않는다.
 * 서비스별 매핑은 각 App에서 처리한다.
 */
export type ForumPostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'guide';

/** 댓글 상태 */
export type ForumCommentStatus = 'publish' | 'pending' | 'deleted';

/** 카테고리 접근 수준 */
export type ForumCategoryAccessLevel = 'all' | 'member' | 'business' | 'admin';

/**
 * 포럼 유형 (운영 정책)
 * - open: 일반 공개형
 * - managed: 회원관리형
 *
 * accessLevel(권한 정책)과 분리해서 사용한다.
 */
export type ForumType = 'open' | 'managed' | 'closed';

/**
 * 포럼 개설신청 상태
 * Phase 1: 4개 상태만 사용 (draft, under_review는 향후)
 */
export type ForumRequestStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected';

// =============================================================================
// Embedded / Inline Types
// =============================================================================

/** Author info embedded in API responses */
export interface ForumAuthorResponse {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  /** WO-NETURE-EXTERNAL-CONTACT-V1 */
  contactEnabled?: boolean;
  kakaoOpenChatUrl?: string | null;
  kakaoChannelUrl?: string | null;
}

/** Category info embedded in post responses */
export interface ForumCategoryInline {
  id: string;
  name: string;
  slug: string;
}

// =============================================================================
// ForumPost API Response
// =============================================================================

export interface ForumPostResponse {
  id: string;
  title: string;
  slug: string;
  content: Block[] | string;
  excerpt?: string | null;
  type: string; // ForumPostType value
  status: string; // ForumPostStatus value
  categoryId?: string | null;
  authorId?: string | null;
  organizationId?: string | null;
  isOrganizationExclusive: boolean;
  isPinned: boolean;
  isLocked: boolean;
  allowComments: boolean;
  showContactOnPost: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  publishedAt?: string | null;
  lastCommentAt?: string | null;
  lastCommentBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Resolved relations
  category?: ForumCategoryInline | null;
  author?: ForumAuthorResponse | null;
}

// =============================================================================
// ForumCategory API Response
// =============================================================================

export interface ForumCategoryResponse {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  color?: string | null;
  iconUrl?: string | null;
  iconEmoji?: string | null;
  sortOrder: number;
  isActive: boolean;
  isPinned: boolean;
  pinnedOrder?: number | null;
  requireApproval: boolean;
  accessLevel: string; // ForumCategoryAccessLevel value
  forumType?: string; // 'open' | 'managed' | 'closed'
  postCount: number;
  createdBy?: string | null;
  organizationId?: string | null;
  isOrganizationExclusive: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: ForumAuthorResponse | null;
}

// =============================================================================
// ForumComment API Response
// =============================================================================

export interface ForumCommentResponse {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  status: string; // ForumCommentStatus value
  likeCount: number;
  replyCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author?: ForumAuthorResponse | null;
}

// =============================================================================
// Pagination & Response Wrappers
// =============================================================================

export interface ForumPaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
}

/** List response with pagination */
export interface ForumListResponse<T> {
  success: boolean;
  data: T[];
  pagination: ForumPaginationInfo;
  totalCount: number;
}

/** Single item response */
export interface ForumSingleResponse<T> {
  success: boolean;
  data: T;
}

/** Category list response (uses count instead of pagination) */
export interface ForumCategoryListResponse {
  success: boolean;
  data: ForumCategoryResponse[];
  count: number;
}

/** Delete / action response */
export interface ForumActionResponse {
  success: boolean;
  message: string;
}

/** Error response */
export interface ForumErrorResponse {
  success: false;
  error: string;
}

// =============================================================================
// Home Page DTOs (홈 요약용 경량 타입) — APP-FORUM Phase 1
// =============================================================================

/** 홈 페이지 포럼 게시글 요약 */
export interface ForumHomePost {
  id: string;
  title: string;
  authorName: string | null;
  createdAt: string;
  categoryName: string | null;
}

/** 홈 포럼 API 응답 */
export interface ForumHomeResponse {
  success: boolean;
  data: {
    posts: ForumHomePost[];
  };
}

// =============================================================================
// UI Constants (서비스 비의존) — APP-FORUM Phase 1
// =============================================================================

/** 게시글 타입별 한글 라벨 */
export const FORUM_POST_TYPE_LABELS: Record<ForumPostType, string> = {
  discussion: '토론',
  question: '질문',
  announcement: '공지',
  poll: '투표',
  guide: '가이드',
};

/** 게시글 상태별 한글 라벨 */
export const FORUM_POST_STATUS_LABELS: Record<ForumPostStatus, string> = {
  draft: '임시저장',
  publish: '공개',
  pending: '승인대기',
  rejected: '반려',
  archived: '보관',
};

/** 카테고리 접근 수준별 한글 라벨 */
export const FORUM_ACCESS_LEVEL_LABELS: Record<ForumCategoryAccessLevel, string> = {
  all: '전체',
  member: '회원',
  business: '사업자',
  admin: '관리자',
};

/** 포럼 유형별 한글 라벨 */
export const FORUM_TYPE_LABELS: Record<ForumType, string> = {
  open: '공개형',
  managed: '회원관리형',
  closed: '비공개형',
};

/** 포럼 개설신청 상태별 한글 라벨 */
export const FORUM_REQUEST_STATUS_LABELS: Record<ForumRequestStatus, string> = {
  pending: '심사 대기',
  revision_requested: '보완 요청',
  approved: '승인',
  rejected: '반려',
};

// =============================================================================
// ForumCategoryRequest API DTOs — Phase 1
// =============================================================================

/** 포럼 개설신청 응답 */
export interface ForumCategoryRequestResponse {
  id: string;
  serviceCode: string;
  organizationId?: string | null;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string | null;
  name: string;
  description: string;
  reason?: string | null;
  forumType: ForumType;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  status: ForumRequestStatus;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  createdCategoryId?: string | null;
  createdCategorySlug?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 포럼 개설신청 생성 DTO */
export interface ForumCategoryRequestCreateDTO {
  serviceCode: string;
  organizationId?: string;
  name: string;
  description: string;
  reason?: string;
  forumType: ForumType;
  iconEmoji?: string;
  iconUrl?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** 포럼 개설신청 수정 DTO (pending/revision_requested 상태에서만) */
export interface ForumCategoryRequestUpdateDTO {
  name?: string;
  description?: string;
  reason?: string;
  forumType?: ForumType;
  iconEmoji?: string;
  iconUrl?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** 운영자 심사 DTO */
export interface ForumCategoryRequestReviewDTO {
  action: 'approve' | 'reject' | 'revision';
  reviewComment?: string;
}

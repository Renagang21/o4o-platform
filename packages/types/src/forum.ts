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
  sortOrder: number;
  isActive: boolean;
  requireApproval: boolean;
  accessLevel: string; // ForumCategoryAccessLevel value
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

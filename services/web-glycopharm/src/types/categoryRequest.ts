// Forum Category Request Types
// WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1: Aligned with @o4o/types/forum

import type { ForumCategoryResponse, ForumRequestStatus } from '@o4o/types/forum';

export type { ForumCategoryResponse, ForumRequestStatus };

/**
 * 카테고리 신청 상태
 * @o4o/types/forum ForumRequestStatus와 동일
 */
export type CategoryRequestStatus = ForumRequestStatus;

/**
 * 포럼 카테고리 신청
 */
export interface CategoryRequest {
  id: string;
  name: string;
  description: string;
  reason?: string;
  forumType?: string;
  iconEmoji?: string;
  iconUrl?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  status: CategoryRequestStatus;

  // 서비스/조직
  serviceCode: string;
  organizationId?: string;

  // 신청자 정보
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;

  // 검토 정보
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;

  // 승인 시 생성된 카테고리 정보
  createdCategoryId?: string;
  createdCategorySlug?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * 카테고리 신청 폼 데이터
 */
export interface CategoryRequestForm {
  name: string;
  description: string;
  reason?: string;
}

/**
 * 카테고리 검토 폼 데이터
 */
export interface CategoryReviewForm {
  action: 'approve' | 'reject' | 'revision';
  reviewComment?: string;
}

/**
 * 포럼 카테고리 (GlycoPharm local view — subset of ForumCategoryResponse)
 */
export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  isActive: boolean;
  createdAt: string;
}

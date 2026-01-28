// Forum Category Request Types
// Phase 19-B: Shared types from @o4o/types/forum

import type { ForumCategoryResponse } from '@o4o/types/forum';

export type { ForumCategoryResponse };

/**
 * 카테고리 신청 상태
 */
export type CategoryRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * 포럼 카테고리 신청
 */
export interface CategoryRequest {
  id: string;
  name: string;                   // 신청하는 카테고리 이름
  description: string;            // 카테고리 설명
  reason?: string;                // 신청 사유
  status: CategoryRequestStatus;

  // 신청자 정보
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;

  // 검토 정보
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;         // 승인/거절 사유
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
  status: 'approved' | 'rejected';
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

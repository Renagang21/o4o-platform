/**
 * Member Home DTOs
 *
 * Phase 2: Read Model 전용 데이터 구조
 *
 * 정책:
 * - 조회만 가능 (쓰기/수정 경로 없음)
 * - 순서 변경 금지 (Phase 0 정책)
 */

// ===== Organization Notice Summary =====

export interface OrganizationNoticeSummary {
  notices: Array<{
    noticeId: string;
    title: string;
    createdAt: string;
    isPinned?: boolean;
    communityName?: string;
  }>;
  totalCount: number;
}

// ===== Groupbuy Summary =====

export interface GroupbuySummary {
  activeCampaignCount: number;
  participatingCampaignCount: number;
  mostUrgentCampaign?: {
    campaignId: string;
    title: string;
    remainingDays: number;
    endDate: string;
  };
}

// ===== Education (LMS) Summary =====

export interface EducationSummary {
  requiredCourseCount: number;
  completedCourseCount: number;
  inProgressCourseCount: number;
  remainingCredits: number;
  currentYearCredits: number;
  hasOverdue: boolean;
  overdueCount: number;
}

// ===== Forum Summary =====

export interface ForumSummary {
  posts: Array<{
    postId: string;
    title: string;
    createdAt: string;
    communityType?: string;
    communityName?: string;
  }>;
  totalUnreadCount?: number;
}

// ===== Banner Summary =====

export interface BannerSummary {
  banners: Array<{
    bannerId: string;
    title: string;
    imageUrl?: string;
    linkUrl?: string;
  }>;
  message?: string;
}

// ===== Member Home DTO (통합) =====

export interface MemberHomeDTO {
  /**
   * [1] 지부/분회 공지 (최상단)
   * null: 조회 실패 시
   */
  organizationNotice: OrganizationNoticeSummary | null;

  /**
   * [2] 공동구매 요약
   * null: 조회 실패 시
   */
  groupbuySummary: GroupbuySummary | null;

  /**
   * [3] 교육(LMS) 필수 현황
   * null: 조회 실패 시
   */
  educationSummary: EducationSummary | null;

  /**
   * [4] 포럼 최신 글
   * null: 조회 실패 시
   */
  forumSummary: ForumSummary | null;

  /**
   * [5] 배너/안내 (Placeholder)
   * null: 조회 실패 시
   */
  bannerSummary: BannerSummary | null;
}

/**
 * UX Priority 순서 (변경 금지)
 */
export const UX_PRIORITY = [
  'organizationNotice',
  'groupbuySummary',
  'educationSummary',
  'forumSummary',
  'bannerSummary',
] as const;

export type UXPriorityKey = typeof UX_PRIORITY[number];

/**
 * Member API
 *
 * Phase 3: Member Home API Integration
 * Uses authClient for authenticated requests
 */

import { authClient } from '@o4o/auth-client';

/**
 * Member Home DTO Types
 * Mirror of backend DTOs for type safety
 */
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

export interface EducationSummary {
  requiredCourseCount: number;
  completedCourseCount: number;
  inProgressCourseCount: number;
  remainingCredits: number;
  currentYearCredits: number;
  hasOverdue: boolean;
  overdueCount: number;
}

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

export interface BannerSummary {
  banners: Array<{
    bannerId: string;
    title: string;
    imageUrl?: string;
    linkUrl?: string;
  }>;
  message?: string;
}

export interface MemberHomeData {
  organizationNotice: OrganizationNoticeSummary | null;
  groupbuySummary: GroupbuySummary | null;
  educationSummary: EducationSummary | null;
  forumSummary: ForumSummary | null;
  bannerSummary: BannerSummary | null;
}

export interface MemberHomeResponse {
  success: boolean;
  data: MemberHomeData;
  uxPriority: string[];
  sectionStatus: {
    organizationNotice: boolean;
    groupbuySummary: boolean;
    educationSummary: boolean;
    forumSummary: boolean;
    bannerSummary: boolean;
  };
  error?: string;
}

export const memberApi = {
  /**
   * Get Member Home data
   * Calls Phase 2 API endpoint
   */
  getHomeData: async (): Promise<MemberHomeResponse> => {
    const response = await authClient.api.get<MemberHomeResponse>('/api/v1/member/home');
    return response.data;
  },
};

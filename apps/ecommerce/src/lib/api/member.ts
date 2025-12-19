/**
 * Member API
 *
 * Phase 3: Member Home API Integration
 * Phase 4: Profile/License/Pharmacy API Integration
 *
 * Uses authClient for authenticated requests
 *
 * Policy Enforcement (Phase 4):
 * - License: READ-ONLY (no update methods)
 * - Pharmacy: Self-edit only (본인만 수정)
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

// =====================================================
// Phase 4: Profile/License/Pharmacy Types
// =====================================================

/**
 * Member Profile Data
 * 회원 기본 정보 (면허번호 포함)
 */
export interface MemberProfileData {
  id: string;
  userId: string;
  name: string;
  // 면허 정보 (READ-ONLY)
  licenseNumber: string;
  licenseIssuedAt: string | null;
  licenseRenewalAt: string | null;
  isVerified: boolean;
  // 약사 유형
  pharmacistType: string | null;
  // 조직 정보
  organizationId: string;
  // 상태
  isActive: boolean;
}

/**
 * Profile Response
 */
export interface MemberProfileResponse {
  success: boolean;
  data: MemberProfileData;
  policies: {
    licenseNumberEditable: boolean;
    pharmacyInfoEditableBy: string;
  };
  error?: string;
}

/**
 * License Data (READ-ONLY)
 * 면허번호 정보 - 수정 불가
 */
export interface LicenseData {
  licenseNumber: string;
  licenseIssuedAt: string | null;
  licenseRenewalAt: string | null;
  isVerified: boolean;
}

/**
 * License Response
 */
export interface LicenseResponse {
  success: boolean;
  data: LicenseData;
  policy: {
    editable: boolean;
    message: string;
  };
  error?: string;
}

/**
 * Pharmacy Info Data
 * 약국 정보 - 본인만 수정 가능
 */
export interface PharmacyInfoData {
  pharmacyName: string | null;
  pharmacyAddress: string | null;
  workplaceName: string | null;
  workplaceAddress: string | null;
  workplaceType: string | null;
}

/**
 * Pharmacy GET Response
 */
export interface PharmacyInfoResponse {
  success: boolean;
  data: PharmacyInfoData;
  canEdit: boolean;
  editWarning: string;
  error?: string;
}

/**
 * Pharmacy Update Request
 */
export interface PharmacyUpdateRequest {
  pharmacyName?: string;
  pharmacyAddress?: string;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceType?: string;
}

/**
 * Pharmacy PATCH Response
 */
export interface PharmacyUpdateResponse {
  success: boolean;
  data: PharmacyInfoData;
  warning: string;
  updatedFields: string[];
  timestamp: string;
  error?: string;
}

// =====================================================
// Member API
// =====================================================

export const memberApi = {
  // ===== Phase 3: Home =====

  /**
   * Get Member Home data
   * Calls Phase 2 API endpoint
   */
  getHomeData: async (): Promise<MemberHomeResponse> => {
    const response = await authClient.api.get<MemberHomeResponse>('/api/v1/member/home');
    return response.data;
  },

  // ===== Phase 4: Profile =====

  /**
   * Get my profile
   * 본인 프로필 조회
   */
  getProfile: async (): Promise<MemberProfileResponse> => {
    const response = await authClient.api.get<MemberProfileResponse>('/api/v1/member/profile');
    return response.data;
  },

  /**
   * Get my license
   * 본인 면허번호 조회 (READ-ONLY)
   *
   * ⚠️ 수정 메서드 의도적 미제공
   */
  getLicense: async (): Promise<LicenseResponse> => {
    const response = await authClient.api.get<LicenseResponse>('/api/v1/member/license');
    return response.data;
  },

  // ===== Phase 4: Pharmacy =====

  /**
   * Get my pharmacy info
   * 본인 약국 정보 조회
   */
  getPharmacyInfo: async (): Promise<PharmacyInfoResponse> => {
    const response = await authClient.api.get<PharmacyInfoResponse>('/api/v1/member/pharmacy');
    return response.data;
  },

  /**
   * Update my pharmacy info
   * 본인 약국 정보 수정
   *
   * ⚠️ 본인만 수정 가능
   * ⚠️ 수정 시 책임 안내 필수
   */
  updatePharmacyInfo: async (data: PharmacyUpdateRequest): Promise<PharmacyUpdateResponse> => {
    const response = await authClient.api.patch<PharmacyUpdateResponse>('/api/v1/member/pharmacy', data);
    return response.data;
  },
};

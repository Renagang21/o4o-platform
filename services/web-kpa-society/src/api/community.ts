/**
 * Community Hub API Client
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * Public read endpoints for ads/sponsors + Operator CRUD
 */

import { apiClient } from './client';

// ==================== Types ====================

export interface CommunityAd {
  id: string;
  type: 'hero' | 'page';
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  displayOrder: number;
}

export interface CommunityAdFull extends CommunityAd {
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunitySponsor {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl: string | null;
  displayOrder: number;
}

export interface CommunitySponsorFull extends CommunitySponsor {
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==================== Public API ====================

export const communityApi = {
  getHeroAds: () =>
    apiClient.get<{ ads: CommunityAd[] }>('/community/ads', { type: 'hero' }),

  getPageAds: () =>
    apiClient.get<{ ads: CommunityAd[] }>('/community/ads', { type: 'page' }),

  getSponsors: () =>
    apiClient.get<{ sponsors: CommunitySponsor[] }>('/community/sponsors'),
};

// ==================== Operator API ====================

export const communityManageApi = {
  // Ads
  listAds: (type?: string) =>
    apiClient.get<{ ads: CommunityAdFull[] }>('/community/manage/ads', type ? { type } : undefined),

  createAd: (data: {
    type: string; title: string; imageUrl: string;
    linkUrl?: string; startDate?: string; endDate?: string;
    displayOrder?: number; isActive?: boolean;
  }) => apiClient.post<CommunityAdFull>('/community/manage/ads', data),

  updateAd: (id: string, data: Record<string, unknown>) =>
    apiClient.put<CommunityAdFull>(`/community/manage/ads/${id}`, data),

  deleteAd: (id: string) =>
    apiClient.delete<void>(`/community/manage/ads/${id}`),

  // Sponsors
  listSponsors: () =>
    apiClient.get<{ sponsors: CommunitySponsorFull[] }>('/community/manage/sponsors'),

  createSponsor: (data: {
    name: string; logoUrl: string; linkUrl?: string;
    displayOrder?: number; isActive?: boolean;
  }) => apiClient.post<CommunitySponsorFull>('/community/manage/sponsors', data),

  updateSponsor: (id: string, data: Record<string, unknown>) =>
    apiClient.put<CommunitySponsorFull>(`/community/manage/sponsors/${id}`, data),

  deleteSponsor: (id: string) =>
    apiClient.delete<void>(`/community/manage/sponsors/${id}`),
};

/**
 * Community Hub API Client - GlycoPharm
 *
 * WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Uses apiClient (centralized) pattern.
 * Public: getHeroAds, getPageAds, getSponsors
 * Operator: CRUD for ads and sponsors
 */

import { apiClient } from './api';

const BASE = '/api/v1/glycopharm';

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
  async getHeroAds() {
    return apiClient.get<{ ads: CommunityAd[] }>(`${BASE}/community/ads?type=hero`);
  },

  async getPageAds() {
    return apiClient.get<{ ads: CommunityAd[] }>(`${BASE}/community/ads?type=page`);
  },

  async getSponsors() {
    return apiClient.get<{ sponsors: CommunitySponsor[] }>(`${BASE}/community/sponsors`);
  },
};

// ==================== Operator API ====================

export const communityManageApi = {
  async listAds(type?: string) {
    const params = type ? `?type=${type}` : '';
    return apiClient.get<{ ads: CommunityAdFull[] }>(`${BASE}/community/manage/ads${params}`);
  },

  async createAd(data: {
    type: string; title: string; imageUrl: string;
    linkUrl?: string; startDate?: string; endDate?: string;
    displayOrder?: number; isActive?: boolean;
  }) {
    return apiClient.post<CommunityAdFull>(`${BASE}/community/manage/ads`, data);
  },

  async updateAd(id: string, data: Record<string, unknown>) {
    return apiClient.put<CommunityAdFull>(`${BASE}/community/manage/ads/${id}`, data);
  },

  async deleteAd(id: string) {
    return apiClient.delete(`${BASE}/community/manage/ads/${id}`);
  },

  async listSponsors() {
    return apiClient.get<{ sponsors: CommunitySponsorFull[] }>(`${BASE}/community/manage/sponsors`);
  },

  async createSponsor(data: {
    name: string; logoUrl: string; linkUrl?: string;
    displayOrder?: number; isActive?: boolean;
  }) {
    return apiClient.post<CommunitySponsorFull>(`${BASE}/community/manage/sponsors`, data);
  },

  async updateSponsor(id: string, data: Record<string, unknown>) {
    return apiClient.put<CommunitySponsorFull>(`${BASE}/community/manage/sponsors/${id}`, data);
  },

  async deleteSponsor(id: string) {
    return apiClient.delete(`${BASE}/community/manage/sponsors/${id}`);
  },
};

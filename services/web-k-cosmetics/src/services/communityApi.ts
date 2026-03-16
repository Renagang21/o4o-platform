/**
 * Community Hub API Client - K-Cosmetics
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * Public: getHeroAds, getPageAds, getSponsors
 * Operator: CRUD for ads and sponsors
 */

import { api } from '../lib/apiClient';

const BASE = '/cosmetics';

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
  async getHeroAds(): Promise<{ success: boolean; data: { ads: CommunityAd[] } }> {
    try {
      const res = await api.get(`${BASE}/community/ads?type=hero`);
      return res.data;
    } catch {
      return { success: false, data: { ads: [] } };
    }
  },

  async getPageAds(): Promise<{ success: boolean; data: { ads: CommunityAd[] } }> {
    try {
      const res = await api.get(`${BASE}/community/ads?type=page`);
      return res.data;
    } catch {
      return { success: false, data: { ads: [] } };
    }
  },

  async getSponsors(): Promise<{ success: boolean; data: { sponsors: CommunitySponsor[] } }> {
    try {
      const res = await api.get(`${BASE}/community/sponsors`);
      return res.data;
    } catch {
      return { success: false, data: { sponsors: [] } };
    }
  },
};

// ==================== Operator API ====================

export const communityManageApi = {
  // Ads
  async listAds(type?: string): Promise<{ success: boolean; data: { ads: CommunityAdFull[] } }> {
    const params = type ? `?type=${type}` : '';
    const res = await api.get(`${BASE}/community/manage/ads${params}`);
    return res.data;
  },

  async createAd(data: {
    type: string; title: string; imageUrl: string;
    linkUrl?: string; startDate?: string; endDate?: string;
    displayOrder?: number; isActive?: boolean;
  }): Promise<{ success: boolean; data: CommunityAdFull }> {
    const res = await api.post(`${BASE}/community/manage/ads`, data);
    return res.data;
  },

  async updateAd(id: string, data: Record<string, unknown>): Promise<{ success: boolean; data: CommunityAdFull }> {
    const res = await api.put(`${BASE}/community/manage/ads/${id}`, data);
    return res.data;
  },

  async deleteAd(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`${BASE}/community/manage/ads/${id}`);
    return res.data;
  },

  // Sponsors
  async listSponsors(): Promise<{ success: boolean; data: { sponsors: CommunitySponsorFull[] } }> {
    const res = await api.get(`${BASE}/community/manage/sponsors`);
    return res.data;
  },

  async createSponsor(data: {
    name: string; logoUrl: string; linkUrl?: string;
    displayOrder?: number; isActive?: boolean;
  }): Promise<{ success: boolean; data: CommunitySponsorFull }> {
    const res = await api.post(`${BASE}/community/manage/sponsors`, data);
    return res.data;
  },

  async updateSponsor(id: string, data: Record<string, unknown>): Promise<{ success: boolean; data: CommunitySponsorFull }> {
    const res = await api.put(`${BASE}/community/manage/sponsors/${id}`, data);
    return res.data;
  },

  async deleteSponsor(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`${BASE}/community/manage/sponsors/${id}`);
    return res.data;
  },
};

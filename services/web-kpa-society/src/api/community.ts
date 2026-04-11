/**
 * Community Hub API Client
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1: Quick Links API 추가
 *
 * Public read endpoints for ads/sponsors/quickLinks + Operator CRUD
 *
 * WO-KPA-A-OPERATOR-COMMUNITY-REGRESSION-FIX-V1:
 * authClient.api (axios, localStorage strategy) 통일
 * — apiClient (fetch 기반)에서 전환하여 다른 operator API와 동일한 인증 방식 사용
 */

import { authClient } from '../contexts/AuthContext';

const KPA_BASE = '/kpa';

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

export interface CommunityQuickLink {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string;
  openInNewTab: boolean;
  displayOrder: number;
}

export interface CommunityQuickLinkFull extends CommunityQuickLink {
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==================== Public API ====================

export const communityApi = {
  getHeroAds: async (): Promise<{ ads: CommunityAd[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/ads`, { params: { type: 'hero' } });
    return res.data?.data ?? res.data;
  },

  getPageAds: async (): Promise<{ ads: CommunityAd[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/ads`, { params: { type: 'page' } });
    return res.data?.data ?? res.data;
  },

  getSponsors: async (): Promise<{ sponsors: CommunitySponsor[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/sponsors`);
    return res.data?.data ?? res.data;
  },

  getQuickLinks: async (): Promise<{ quickLinks: CommunityQuickLink[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/quick-links`);
    return res.data?.data ?? res.data;
  },
};

// ==================== Operator API ====================

export const communityManageApi = {
  // Ads
  listAds: async (type?: string): Promise<{ ads: CommunityAdFull[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/manage/ads`, {
      params: type ? { type } : undefined,
    });
    return res.data?.data ?? res.data;
  },

  createAd: async (data: {
    type: string; title: string; imageUrl: string;
    linkUrl?: string; startDate?: string; endDate?: string;
    displayOrder?: number; isActive?: boolean;
  }): Promise<CommunityAdFull> => {
    const res = await authClient.api.post(`${KPA_BASE}/community/manage/ads`, data);
    return res.data?.data ?? res.data;
  },

  updateAd: async (id: string, data: Record<string, unknown>): Promise<CommunityAdFull> => {
    const res = await authClient.api.put(`${KPA_BASE}/community/manage/ads/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteAd: async (id: string): Promise<void> => {
    await authClient.api.delete(`${KPA_BASE}/community/manage/ads/${id}`);
  },

  // Sponsors
  listSponsors: async (): Promise<{ sponsors: CommunitySponsorFull[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/manage/sponsors`);
    return res.data?.data ?? res.data;
  },

  createSponsor: async (data: {
    name: string; logoUrl: string; linkUrl?: string;
    displayOrder?: number; isActive?: boolean;
  }): Promise<CommunitySponsorFull> => {
    const res = await authClient.api.post(`${KPA_BASE}/community/manage/sponsors`, data);
    return res.data?.data ?? res.data;
  },

  updateSponsor: async (id: string, data: Record<string, unknown>): Promise<CommunitySponsorFull> => {
    const res = await authClient.api.put(`${KPA_BASE}/community/manage/sponsors/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteSponsor: async (id: string): Promise<void> => {
    await authClient.api.delete(`${KPA_BASE}/community/manage/sponsors/${id}`);
  },

  // Quick Links
  listQuickLinks: async (): Promise<{ quickLinks: CommunityQuickLinkFull[] }> => {
    const res = await authClient.api.get(`${KPA_BASE}/community/manage/quick-links`);
    return res.data?.data ?? res.data;
  },

  createQuickLink: async (data: {
    title: string; imageUrl: string; linkUrl: string;
    description?: string; openInNewTab?: boolean;
    displayOrder?: number; isActive?: boolean;
  }): Promise<CommunityQuickLinkFull> => {
    const res = await authClient.api.post(`${KPA_BASE}/community/manage/quick-links`, data);
    return res.data?.data ?? res.data;
  },

  updateQuickLink: async (id: string, data: Record<string, unknown>): Promise<CommunityQuickLinkFull> => {
    const res = await authClient.api.put(`${KPA_BASE}/community/manage/quick-links/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteQuickLink: async (id: string): Promise<void> => {
    await authClient.api.delete(`${KPA_BASE}/community/manage/quick-links/${id}`);
  },
};

/**
 * Community Hub Admin API Client — Neture
 *
 * WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 *
 * Public: getHeroAds, getPageAds, getSponsors
 * Operator: CRUD for ads and sponsors
 */

import { api } from '../apiClient';

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

// ==================== Helpers ====================

async function get<T>(path: string): Promise<T> {
  const response = await api.get(`/neture${path}`);
  const json = response.data;
  return json.data ?? json;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await api.post(`/neture${path}`, body);
  const json = response.data;
  return json.data ?? json;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const response = await api.put(`/neture${path}`, body);
  const json = response.data;
  return json.data ?? json;
}

async function del(path: string): Promise<void> {
  await api.delete(`/neture${path}`);
}

// ==================== Public API ====================

export const communityApi = {
  async getHeroAds() {
    return get<{ ads: CommunityAd[] }>('/community/ads?type=hero');
  },
  async getPageAds() {
    return get<{ ads: CommunityAd[] }>('/community/ads?type=page');
  },
  async getSponsors() {
    return get<{ sponsors: CommunitySponsor[] }>('/community/sponsors');
  },
};

// ==================== Operator API ====================

export const communityManageApi = {
  async listAds(type?: string) {
    const params = type ? `?type=${type}` : '';
    return get<{ ads: CommunityAdFull[] }>(`/community/manage/ads${params}`);
  },
  async createAd(data: {
    type: string; title: string; imageUrl: string;
    linkUrl?: string; startDate?: string; endDate?: string;
    displayOrder?: number; isActive?: boolean;
  }) {
    return post<CommunityAdFull>('/community/manage/ads', data);
  },
  async updateAd(id: string, data: Record<string, unknown>) {
    return put<CommunityAdFull>(`/community/manage/ads/${id}`, data);
  },
  async deleteAd(id: string) {
    return del(`/community/manage/ads/${id}`);
  },
  async listSponsors() {
    return get<{ sponsors: CommunitySponsorFull[] }>('/community/manage/sponsors');
  },
  async createSponsor(data: {
    name: string; logoUrl: string; linkUrl?: string;
    displayOrder?: number; isActive?: boolean;
  }) {
    return post<CommunitySponsorFull>('/community/manage/sponsors', data);
  },
  async updateSponsor(id: string, data: Record<string, unknown>) {
    return put<CommunitySponsorFull>(`/community/manage/sponsors/${id}`, data);
  },
  async deleteSponsor(id: string) {
    return del(`/community/manage/sponsors/${id}`);
  },
};

/**
 * Community Hub Admin API Client — Neture
 *
 * WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1
 *
 * Public: getHeroAds, getPageAds, getSponsors
 * Operator: CRUD for ads and sponsors
 */

import { API_BASE_URL } from './client';

const BASE = `${API_BASE_URL}/api/v1/neture`;

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
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
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

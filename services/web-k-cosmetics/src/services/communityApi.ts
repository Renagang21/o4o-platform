/**
 * Community Hub API Client - K-Cosmetics
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Public: getHeroAds, getPageAds, getSponsors
 * Operator: CRUD for ads and sponsors
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.o4o.world';
const BASE = `${API_URL}/api/v1/cosmetics`;

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

// ==================== Auth Helper ====================

function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.accessToken || parsed.token || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// ==================== Public API ====================

export const communityApi = {
  async getHeroAds(): Promise<{ success: boolean; data: { ads: CommunityAd[] } }> {
    try {
      const res = await fetch(`${BASE}/community/ads?type=hero`);
      return await res.json();
    } catch {
      return { success: false, data: { ads: [] } };
    }
  },

  async getPageAds(): Promise<{ success: boolean; data: { ads: CommunityAd[] } }> {
    try {
      const res = await fetch(`${BASE}/community/ads?type=page`);
      return await res.json();
    } catch {
      return { success: false, data: { ads: [] } };
    }
  },

  async getSponsors(): Promise<{ success: boolean; data: { sponsors: CommunitySponsor[] } }> {
    try {
      const res = await fetch(`${BASE}/community/sponsors`);
      return await res.json();
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
    const res = await fetch(`${BASE}/community/manage/ads${params}`, { headers: authHeaders() });
    return res.json();
  },

  async createAd(data: {
    type: string; title: string; imageUrl: string;
    linkUrl?: string; startDate?: string; endDate?: string;
    displayOrder?: number; isActive?: boolean;
  }): Promise<{ success: boolean; data: CommunityAdFull }> {
    const res = await fetch(`${BASE}/community/manage/ads`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateAd(id: string, data: Record<string, unknown>): Promise<{ success: boolean; data: CommunityAdFull }> {
    const res = await fetch(`${BASE}/community/manage/ads/${id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAd(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE}/community/manage/ads/${id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    return res.json();
  },

  // Sponsors
  async listSponsors(): Promise<{ success: boolean; data: { sponsors: CommunitySponsorFull[] } }> {
    const res = await fetch(`${BASE}/community/manage/sponsors`, { headers: authHeaders() });
    return res.json();
  },

  async createSponsor(data: {
    name: string; logoUrl: string; linkUrl?: string;
    displayOrder?: number; isActive?: boolean;
  }): Promise<{ success: boolean; data: CommunitySponsorFull }> {
    const res = await fetch(`${BASE}/community/manage/sponsors`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSponsor(id: string, data: Record<string, unknown>): Promise<{ success: boolean; data: CommunitySponsorFull }> {
    const res = await fetch(`${BASE}/community/manage/sponsors/${id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteSponsor(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE}/community/manage/sponsors/${id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    return res.json();
  },
};

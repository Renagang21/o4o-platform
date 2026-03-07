/**
 * Partner APIs - Recruiting, Dashboard, Recruitment
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';

// ==================== Recruiting Products ====================

export interface RecruitingProduct {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  is_partner_recruiting: boolean;
  created_at: string;
}

export const recruitingApi = {
  async getRecruitingProducts(): Promise<RecruitingProduct[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/recruiting-products`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[Neture API] Recruiting products API not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Neture API] Failed to fetch recruiting products:', error);
      return [];
    }
  },
};

// ==================== Partner Dashboard ====================

export interface PartnerDashboardItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  price: number;
  pharmacyName?: string;
  serviceId: string;
  status: string;
  contentCount: number;
  primaryContent: {
    contentId: string;
    contentSource: string;
    title: string;
    type: string;
  } | null;
  createdAt: string;
}

export interface BrowsableContent {
  id: string;
  title: string;
  summary: string | null;
  type: string;
  source: 'cms' | 'supplier';
  imageUrl: string | null;
  createdAt: string;
}

export interface LinkedContent {
  linkId: string;
  contentId: string;
  contentSource: 'cms' | 'supplier';
  title: string;
  type: string;
  summary: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export const partnerDashboardApi = {
  async addItem(productId: string, serviceId?: string): Promise<{ success: boolean; already_exists?: boolean; data?: PartnerDashboardItem }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId, serviceId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to add dashboard item: ${response.status}`);
    }
    return response.json();
  },

  async getItems(): Promise<PartnerDashboardItem[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('[Neture API] Dashboard items API not available');
      return [];
    }
    const result = await response.json();
    return result.data || [];
  },

  async toggleStatus(itemId: string, status: 'active' | 'inactive'): Promise<{ id: string; status: string; updatedAt: string }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`Failed to toggle status: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  },

  async browseContents(source?: string): Promise<BrowsableContent[]> {
    const params = source && source !== 'all' ? `?source=${source}` : '';
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/contents${params}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('[Neture API] Browse contents API not available');
      return [];
    }
    const result = await response.json();
    return result.data || [];
  },

  async linkContent(itemId: string, contentId: string, contentSource: string): Promise<{ success: boolean; already_linked?: boolean }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contentId, contentSource }),
    });
    if (!response.ok) {
      throw new Error(`Failed to link content: ${response.status}`);
    }
    return response.json();
  },

  async unlinkContent(itemId: string, linkId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents/${linkId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to unlink content: ${response.status}`);
    }
  },

  async getLinkedContents(itemId: string): Promise<LinkedContent[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('[Neture API] Linked contents API not available');
      return [];
    }
    const result = await response.json();
    return result.data || [];
  },

  async reorderContents(itemId: string, orderedIds: string[]): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      throw new Error('Failed to reorder contents');
    }
  },

  async setPrimaryContent(itemId: string, linkId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/partner/dashboard/items/${itemId}/contents/${linkId}/primary`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to set primary content');
    }
  },
};

// ==================== Partner Recruitment ====================

export interface PartnerRecruitment {
  id: string;
  productId: string;
  productName: string;
  manufacturer: string;
  consumerPrice: number;
  commissionRate: number;
  sellerId: string;
  sellerName: string;
  shopUrl: string;
  serviceName: string;
  serviceId: string;
  imageUrl: string;
  status: 'recruiting' | 'closed';
}

export const partnerRecruitmentApi = {
  async getRecruitments(status?: string): Promise<PartnerRecruitment[]> {
    const url = status
      ? `${API_BASE_URL}/api/v1/neture/partner/recruitments?status=${status}`
      : `${API_BASE_URL}/api/v1/neture/partner/recruitments`;
    const response = await fetchWithTimeout(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`[Recruitment API] ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  async apply(recruitmentId: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partner/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ recruitmentId }),
    });
    const result = await response.json();
    if (response.status === 409) {
      return { success: false, error: 'DUPLICATE_APPLICATION' };
    }
    if (!response.ok) {
      return { success: false, error: result.error || 'UNKNOWN_ERROR' };
    }
    return { success: true };
  },
};

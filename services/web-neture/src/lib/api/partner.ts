/**
 * Partner APIs - Recruiting, Dashboard, Recruitment, Commission
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

// ==================== Partner Commission (WO-O4O-PARTNER-COMMISSION-ENGINE-V1) ====================

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface Commission {
  id: string;
  partner_id: string;
  partner_name?: string;
  supplier_id: string;
  supplier_name?: string;
  order_id: string;
  order_number: string;
  contract_id: string;
  commission_rate: number;
  order_amount: number;
  commission_amount: number;
  status: CommissionStatus;
  period_start: string;
  period_end: string;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionOrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CommissionDetail extends Commission {
  items: CommissionOrderItem[];
}

export interface PartnerCommissionKpi {
  pending_amount: number;
  paid_amount: number;
  total_amount: number;
  pending_count: number;
  paid_count: number;
}

export interface CommissionsResponse {
  data: Commission[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const PARTNER_COMMISSION_KPI_DEFAULT: PartnerCommissionKpi = {
  pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0,
};

export const partnerCommissionApi = {
  /** GET /api/v1/neture/partner/commissions/kpi */
  async getKpi(): Promise<PartnerCommissionKpi> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/commissions/kpi`,
        { credentials: 'include' },
      );
      if (!response.ok) return PARTNER_COMMISSION_KPI_DEFAULT;
      const result = await response.json();
      return result.data || PARTNER_COMMISSION_KPI_DEFAULT;
    } catch {
      return PARTNER_COMMISSION_KPI_DEFAULT;
    }
  },

  /** GET /api/v1/neture/partner/commissions */
  async getCommissions(
    params?: { page?: number; limit?: number; status?: CommissionStatus }
  ): Promise<CommissionsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/commissions${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  /** GET /api/v1/neture/partner/commissions/:id */
  async getDetail(id: string): Promise<CommissionDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/commissions/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },
};

// ==================== Partner Affiliate (WO-O4O-PARTNER-HUB-CORE-V1) ====================

export interface PoolProduct {
  product_id: string;
  product_slug: string;
  store_slug: string;
  product_name: string;
  supplier_name: string;
  commission_per_unit: number;
  commission_start_date: string;
  consumer_reference_price: number | null;
  price_general: number;
  image_url: string | null;
}

export interface ReferralLink {
  id: string;
  referral_token: string;
  product_id: string;
  product_slug: string;
  store_slug: string;
  product_name: string;
  price_general: number;
  commission_per_unit: number | null;
  created_at: string;
}

export const partnerAffiliateApi = {
  async getProductPool(): Promise<PoolProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/product-pool`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  },

  async createReferralLink(productId: string): Promise<{ referral_url: string; referral_token: string } | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/referral-links`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ product_id: productId }),
        },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch {
      return null;
    }
  },

  async getReferralLinks(): Promise<ReferralLink[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/referral-links`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch {
      return [];
    }
  },
};

// ==================== Partner Settlement (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1) ====================

export interface PartnerSettlementSummary {
  id: string;
  partner_id: string;
  total_commission: number;
  commission_count: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export interface PartnerSettlementDetailItem {
  commission_amount: number;
  order_number: string;
  order_amount: number;
  commission_rate: number;
  supplier_name: string | null;
  commission_date: string;
}

export interface PartnerSettlementDetail extends PartnerSettlementSummary {
  items: PartnerSettlementDetailItem[];
}

export const partnerSettlementApi = {
  /** GET /api/v1/neture/partner/settlements */
  async getSettlements(params?: { page?: number; limit?: number }): Promise<{
    data: PartnerSettlementSummary[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/settlements${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  /** GET /api/v1/neture/partner/settlements/:id */
  async getDetail(id: string): Promise<PartnerSettlementDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/partner/settlements/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },
};

/**
 * Neture Core API - Suppliers & Partnership
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from '../apiClient';

// 제품 목적 타입 (WO-NETURE-EXTENSION-P3)
export type ProductPurpose = 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';

// 연락처 공개 범위 (WO-O4O-SUPPLIER-PUBLIC-CONTACT-POLICY-V1)
export type ContactVisibility = 'public' | 'partners' | 'private';

export interface TrustSignals {
  contactCompleteness: number; // 0-4
  hasApprovedPartners: boolean;
  recentActivity: boolean;
}

export type ContactHint = 'available' | 'partner_exclusive' | 'not_registered' | 'private' | 'partners_only';

export interface ContactHints {
  email: ContactHint;
  phone: ContactHint;
  website: ContactHint;
  kakao: ContactHint;
}

export interface Supplier {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  productCount: number;
  trustSignals?: TrustSignals;
}

export interface SupplierDetail {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  description: string;
  products: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    purpose?: ProductPurpose;
  }>;
  pricingPolicy: string;
  moq: string;
  shippingPolicy: {
    standard: string;
    island: string;
    mountain: string;
  };
  contact: {
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    kakao?: string | null;
  };
  contactHints?: ContactHints;
  trustSignals?: TrustSignals;
}

export interface PartnershipRequest {
  id: string;
  seller: {
    id: string;
    name: string;
    serviceType: string;
    storeUrl: string;
  };
  productCount: number;
  period: {
    start: string;
    end: string;
  };
  revenueStructure: string;
  status: 'OPEN' | 'MATCHED' | 'CLOSED';
}

export interface PartnershipRequestDetail extends PartnershipRequest {
  products: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  promotionScope: {
    sns: boolean;
    content: boolean;
    banner: boolean;
    other: string;
  };
  contact: {
    email: string;
    phone: string;
    kakao: string;
  };
  createdAt: string;
  matchedAt: string | null;
}

/**
 * API Client
 */
export const netureApi = {
  async getSuppliers(): Promise<Supplier[]> {
    const response = await api.get('/neture/suppliers');
    const data = response.data;
    return data.suppliers || [];
  },

  async getSupplierBySlug(slug: string): Promise<SupplierDetail> {
    const response = await api.get(`/neture/suppliers/${slug}`);
    return response.data;
  },

  async getPartnershipRequests(status?: 'OPEN' | 'MATCHED' | 'CLOSED'): Promise<PartnershipRequest[]> {
    try {
      const url = status
        ? `/neture/partnership/requests?status=${status}`
        : '/neture/partnership/requests';

      const response = await api.get(url);
      const data = response.data;
      return data.requests || [];
    } catch (error) {
      console.warn('[Neture API] Failed to fetch partnership requests:', error);
      return [];
    }
  },

  async getPartnershipRequestById(id: string): Promise<PartnershipRequestDetail> {
    const response = await api.get(`/neture/partnership/requests/${id}`);
    return response.data;
  },

  async createPartnershipRequest(data: {
    sellerName: string;
    sellerServiceType?: string;
    sellerStoreUrl?: string;
    periodStart?: string;
    periodEnd?: string;
    revenueStructure?: string;
    promotionSns?: boolean;
    promotionContent?: boolean;
    promotionBanner?: boolean;
    promotionOther?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactKakao?: string;
    products?: Array<{ name: string; category?: string }>;
  }): Promise<{ success: boolean; data?: { id: string; status: string; createdAt: string }; error?: string }> {
    const response = await api.post('/neture/partnership/requests', data);
    return response.data;
  },
};

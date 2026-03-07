/**
 * Neture Core API - Suppliers & Partnership
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';

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
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/suppliers`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`[Neture API] Suppliers ${response.status}`);
    }
    const data = await response.json();
    return data.suppliers || [];
  },

  async getSupplierBySlug(slug: string): Promise<SupplierDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/suppliers/${slug}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch supplier detail');
    }
    return response.json();
  },

  async getPartnershipRequests(status?: 'OPEN' | 'MATCHED' | 'CLOSED'): Promise<PartnershipRequest[]> {
    try {
      const url = status
        ? `${API_BASE_URL}/api/v1/neture/partnership/requests?status=${status}`
        : `${API_BASE_URL}/api/v1/neture/partnership/requests`;

      const response = await fetchWithTimeout(url, { credentials: 'include' });
      if (!response.ok) {
        console.warn('[Neture API] Partnership requests API not available, returning empty array');
        return [];
      }
      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.warn('[Neture API] Failed to fetch partnership requests:', error);
      return [];
    }
  },

  async getPartnershipRequestById(id: string): Promise<PartnershipRequestDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch partnership request detail');
    }
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  },
};

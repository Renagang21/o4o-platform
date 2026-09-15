/**
 * Neture Core API - Suppliers (Partnership 요청 API 는 WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1 로 은퇴)
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
  hasApprovedBuyers: boolean;
  recentActivity: boolean;
}

export type ContactHint = 'available' | 'approved_buyer_exclusive' | 'not_registered' | 'private' | 'approved_buyers_only';

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

};

/**
 * Neture API Client
 *
 * Work Order: WO-NETURE-CORE-P1
 * Phase: P1 (Frontend Integration)
 *
 * Simple fetch-based API client for Neture backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

interface Supplier {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  productCount: number;
}

interface SupplierDetail {
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
  }>;
  pricingPolicy: string;
  moq: string;
  shippingPolicy: {
    standard: string;
    island: string;
    mountain: string;
  };
  contact: {
    email: string;
    phone: string;
    website: string;
    kakao: string;
  };
}

interface PartnershipRequest {
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

interface PartnershipRequestDetail extends PartnershipRequest {
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
  /**
   * GET /api/v1/neture/suppliers
   */
  async getSuppliers(): Promise<Supplier[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/suppliers`);
    if (!response.ok) {
      throw new Error('Failed to fetch suppliers');
    }
    const data = await response.json();
    return data.suppliers;
  },

  /**
   * GET /api/v1/neture/suppliers/:slug
   */
  async getSupplierBySlug(slug: string): Promise<SupplierDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/suppliers/${slug}`);
    if (!response.ok) {
      throw new Error('Failed to fetch supplier detail');
    }
    return response.json();
  },

  /**
   * GET /api/v1/neture/partnership/requests
   */
  async getPartnershipRequests(status?: 'OPEN' | 'MATCHED' | 'CLOSED'): Promise<PartnershipRequest[]> {
    const url = status
      ? `${API_BASE_URL}/api/v1/neture/partnership/requests?status=${status}`
      : `${API_BASE_URL}/api/v1/neture/partnership/requests`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch partnership requests');
    }
    const data = await response.json();
    return data.requests;
  },

  /**
   * GET /api/v1/neture/partnership/requests/:id
   */
  async getPartnershipRequestById(id: string): Promise<PartnershipRequestDetail> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/partnership/requests/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch partnership request detail');
    }
    return response.json();
  },
};

export type {
  Supplier,
  SupplierDetail,
  PartnershipRequest,
  PartnershipRequestDetail,
};

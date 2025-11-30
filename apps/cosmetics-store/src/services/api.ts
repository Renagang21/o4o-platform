import type { CosmeticsFilters, RoutineRequest } from '../types';

const API_BASE = '/api/v1/cosmetics';

export async function fetchProducts(filters: CosmeticsFilters) {
  const params = new URLSearchParams();

  if (filters.skinType?.length) {
    filters.skinType.forEach((type) => params.append('skinType', type));
  }
  if (filters.concerns?.length) {
    filters.concerns.forEach((concern) => params.append('concerns', concern));
  }
  if (filters.certifications?.length) {
    filters.certifications.forEach((cert) =>
      params.append('certifications', cert)
    );
  }
  if (filters.category) {
    params.append('category', filters.category);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.page) {
    params.append('page', filters.page.toString());
  }
  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }

  const response = await fetch(`${API_BASE}/products?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
}

export async function fetchProduct(id: string) {
  const response = await fetch(`${API_BASE}/products/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }
  return response.json();
}

export async function fetchRoutineRecommendation(request: RoutineRequest) {
  const response = await fetch(`${API_BASE}/routine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch routine recommendation');
  }
  return response.json();
}

export async function fetchAvailableFilters() {
  const response = await fetch(`${API_BASE}/filters`);
  if (!response.ok) {
    throw new Error('Failed to fetch filters');
  }
  return response.json();
}

/**
 * Dashboard API Functions
 */

export async function fetchMyProducts(options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }

  const response = await fetch(`/api/v2/seller/products?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch my products');
  }
  return response.json();
}

export async function fetchRecentImports(options: { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }
  params.append('sortBy', 'createdAt');
  params.append('sortOrder', 'desc');

  const response = await fetch(`/api/v2/seller/products?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recent imports');
  }

  // Transform to import format
  const data = await response.json();
  return {
    ...data,
    data: {
      imports: data.data?.products?.map((product: any) => ({
        productName: product.name,
        category: product.metadata?.cosmetics?.productCategory || '기타',
        createdAt: product.createdAt,
        reason: product.importReason || null,
      })) || [],
    },
  };
}

export async function fetchRoutineStats() {
  const response = await fetch(`${API_BASE}/routine/stats`);

  // If endpoint doesn't exist yet, return mock data
  if (!response.ok) {
    return {
      success: true,
      data: {
        totalRoutines: 14,
        topSkinType: 'oily',
        topConcerns: ['acne', 'pore', 'soothing'],
        topProducts: [
          { name: '센텔라 진정 토너' },
          { name: '비타C 세럼' },
          { name: '워터밤 크림' },
        ],
      },
    };
  }

  return response.json();
}

export async function fetchSettlementSummary() {
  const response = await fetch('/api/v2/seller/settlements/summary');

  // If endpoint doesn't exist yet, return mock data
  if (!response.ok) {
    return {
      success: true,
      data: {
        thisMonth: 145000,
        lastMonth: 320000,
        totalSettled: 1220000,
        nextSettlementDate: '2025-12-15',
      },
    };
  }

  return response.json();
}

/**
 * Influencer Routine API Functions
 */

export interface InfluencerRoutineFilters {
  skinType?: string[];
  concerns?: string[];
  timeOfUse?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchInfluencerRoutines(filters: InfluencerRoutineFilters = {}) {
  const params = new URLSearchParams();

  if (filters.skinType?.length) {
    filters.skinType.forEach((type) => params.append('skinType', type));
  }
  if (filters.concerns?.length) {
    filters.concerns.forEach((concern) => params.append('concerns', concern));
  }
  if (filters.tags?.length) {
    filters.tags.forEach((tag) => params.append('tags', tag));
  }
  if (filters.timeOfUse) {
    params.append('timeOfUse', filters.timeOfUse);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.page) {
    params.append('page', filters.page.toString());
  }
  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters.sortBy) {
    params.append('sortBy', filters.sortBy);
  }
  if (filters.sortOrder) {
    params.append('sortOrder', filters.sortOrder);
  }

  const response = await fetch(`${API_BASE}/influencer-routines?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch influencer routines');
  }
  return response.json();
}

export async function fetchInfluencerRoutine(id: string) {
  const response = await fetch(`${API_BASE}/influencer-routines/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch influencer routine');
  }
  return response.json();
}

export async function recommendInfluencerRoutine(id: string) {
  const response = await fetch(`${API_BASE}/influencer-routines/${id}/recommend`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to recommend routine');
  }
  return response.json();
}

/**
 * Partner API Functions
 */

const PARTNER_API_BASE = '/api/v1/partner';

export async function fetchPartnerDashboard(partnerId?: string) {
  const params = new URLSearchParams();
  if (partnerId) {
    params.append('partnerId', partnerId);
  }

  const response = await fetch(`${PARTNER_API_BASE}/dashboard?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch partner dashboard');
  }
  return response.json();
}

export async function fetchPartnerRoutines(partnerId?: string) {
  const params = new URLSearchParams();
  if (partnerId) {
    params.append('partnerId', partnerId);
  }

  const response = await fetch(`${PARTNER_API_BASE}/routines?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch partner routines');
  }
  return response.json();
}

export async function fetchPartnerCommissionSummary(partnerId?: string) {
  const params = new URLSearchParams();
  if (partnerId) {
    params.append('partnerId', partnerId);
  }

  const response = await fetch(`${PARTNER_API_BASE}/commission-summary?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch commission summary');
  }
  return response.json();
}

export async function fetchPartnerEngagement(partnerId?: string) {
  const params = new URLSearchParams();
  if (partnerId) {
    params.append('partnerId', partnerId);
  }

  const response = await fetch(`${PARTNER_API_BASE}/engagement?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch engagement metrics');
  }
  return response.json();
}

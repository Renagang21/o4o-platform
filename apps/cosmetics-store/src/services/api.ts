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

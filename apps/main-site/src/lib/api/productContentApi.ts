/**
 * ProductContent API Client
 *
 * API client for interacting with the lms-marketing product content endpoints.
 */

import { authClient } from '@o4o/auth-client';

const API_BASE = '/api/v1/lms/marketing/products';

/**
 * Target audience type
 */
export type TargetAudience = 'seller' | 'consumer' | 'pharmacist' | 'all';

/**
 * Targeting configuration
 */
export interface ProductContentTargeting {
  targets: TargetAudience[];
  regions?: string[];
  tags?: string[];
  sellerTypes?: string[];
}

/**
 * Product content data structure
 */
export interface ProductContent {
  id: string;
  supplierId: string;
  bundleId: string;
  title: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  isActive: boolean;
  isPublished: boolean;
  targeting: ProductContentTargeting;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

/**
 * User context for targeted content
 */
export interface UserContext {
  role: TargetAudience;
  region?: string;
  sellerType?: string;
  tags?: string[];
}

/**
 * Get product content by ID
 */
export async function getProductContent(
  id: string
): Promise<ApiResponse<ProductContent>> {
  try {
    const response = await authClient.api.get(`${API_BASE}/${id}`);
    return response.data;
  } catch (error) {
    console.error('[productContentApi] getProductContent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get product content',
    };
  }
}

/**
 * Get product contents targeted for user
 */
export async function getTargetedProductContents(
  userContext: UserContext
): Promise<ApiResponse<ProductContent[]>> {
  try {
    const params = new URLSearchParams();
    params.append('role', userContext.role);
    if (userContext.region) params.append('region', userContext.region);
    if (userContext.sellerType) params.append('sellerType', userContext.sellerType);
    if (userContext.tags) params.append('tags', userContext.tags.join(','));

    const response = await authClient.api.get(
      `${API_BASE}/targeted?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error('[productContentApi] getTargetedProductContents error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get targeted product contents',
    };
  }
}

/**
 * Get product contents by supplier
 */
export async function getSupplierProductContents(
  supplierId: string,
  options?: { isActive?: boolean; isPublished?: boolean }
): Promise<ApiResponse<ProductContent[]>> {
  try {
    const params = new URLSearchParams();
    if (options?.isActive !== undefined)
      params.append('isActive', String(options.isActive));
    if (options?.isPublished !== undefined)
      params.append('isPublished', String(options.isPublished));

    const url =
      params.toString().length > 0
        ? `${API_BASE}/supplier/${supplierId}?${params.toString()}`
        : `${API_BASE}/supplier/${supplierId}`;

    const response = await authClient.api.get(url);
    return response.data;
  } catch (error) {
    console.error('[productContentApi] getSupplierProductContents error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get supplier product contents',
    };
  }
}

/**
 * List product contents with filtering
 */
export async function listProductContents(options?: {
  supplierId?: string;
  isActive?: boolean;
  isPublished?: boolean;
  category?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<ProductContent[]>> {
  try {
    const params = new URLSearchParams();
    if (options?.supplierId) params.append('supplierId', options.supplierId);
    if (options?.isActive !== undefined)
      params.append('isActive', String(options.isActive));
    if (options?.isPublished !== undefined)
      params.append('isPublished', String(options.isPublished));
    if (options?.category) params.append('category', options.category);
    if (options?.brand) params.append('brand', options.brand);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));

    const url =
      params.toString().length > 0
        ? `${API_BASE}?${params.toString()}`
        : API_BASE;

    const response = await authClient.api.get(url);
    return response.data;
  } catch (error) {
    console.error('[productContentApi] listProductContents error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to list product contents',
    };
  }
}

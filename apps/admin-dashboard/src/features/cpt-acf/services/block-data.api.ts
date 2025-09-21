/**
 * Block Data API Service
 * Handles block editor data fetching with caching
 */

import { authClient } from '@o4o/auth-client';
import {
  BlockData,
  BlockDataRequest,
  BlockDataResponse,
  DynamicContentRequest,
  DynamicContentResponse,
  FeaturedImageResponse,
  ACFFieldResponse
} from '../types/block-data.types';

const API_BASE = '/api/block-data';

/**
 * Block Data API
 */
export const blockDataApi = {
  // Get block data for a post/page
  async getBlockData(
    postId: string,
    options?: Partial<BlockDataRequest>
  ): Promise<BlockDataResponse> {
    const params = new URLSearchParams();
    
    if (options?.postType) params.append('postType', options.postType);
    if (options?.fields) params.append('fields', options.fields.join(','));
    if (options?.includeACF !== undefined) {
      params.append('includeACF', options.includeACF.toString());
    }
    if (options?.includeMeta !== undefined) {
      params.append('includeMeta', options.includeMeta.toString());
    }

    const queryString = params.toString();
    const url = `${API_BASE}/posts/${postId}${queryString ? `?${queryString}` : ''}`;

    const response = await authClient.api.get(url);
    return response.data;
  },

  // Get featured image for a post
  async getFeaturedImage(postId: string): Promise<FeaturedImageResponse> {
    const response = await authClient.api.get(
      `${API_BASE}/posts/${postId}/featured-image`
    );
    return response.data;
  },

  // Get ACF field value
  async getACFField(
    postId: string,
    fieldName: string
  ): Promise<ACFFieldResponse> {
    const response = await authClient.api.get(
      `${API_BASE}/posts/${postId}/acf/${fieldName}`
    );
    return response.data;
  },

  // Get all ACF fields for a post
  async getAllACFFields(postId: string): Promise<ACFFieldResponse> {
    const response = await authClient.api.get(
      `${API_BASE}/posts/${postId}/acf`
    );
    return response.data;
  },

  // Get dynamic content for current context
  async getDynamicContent(
    options?: DynamicContentRequest
  ): Promise<DynamicContentResponse> {
    const response = await authClient.api.post(
      `${API_BASE}/dynamic`,
      options || {}
    );
    return response.data;
  },

  // Batch fetch multiple posts
  async getBatchBlockData(
    postIds: string[],
    options?: Partial<BlockDataRequest>
  ): Promise<BlockDataResponse[]> {
    const response = await authClient.api.post(
      `${API_BASE}/batch`,
      {
        postIds,
        ...options
      }
    );
    return response.data;
  },

  // Prefetch block data (for preloading)
  async prefetchBlockData(
    postId: string,
    options?: Partial<BlockDataRequest>
  ): Promise<void> {
    // This triggers server-side caching
    await authClient.api.post(
      `${API_BASE}/prefetch`,
      {
        postId,
        ...options
      }
    );
  },

  // Clear cache for a specific post
  async clearCache(postId: string): Promise<void> {
    await authClient.api.delete(
      `${API_BASE}/cache/${postId}`
    );
  },

  // Get block template data
  async getTemplateData(templateName: string): Promise<BlockDataResponse> {
    const response = await authClient.api.get(
      `${API_BASE}/templates/${templateName}`
    );
    return response.data;
  },

  // Search posts with block data
  async searchWithBlockData(
    query: string,
    options?: {
      postType?: string;
      limit?: number;
      includeACF?: boolean;
    }
  ): Promise<BlockDataResponse[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options?.postType) params.append('postType', options.postType);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.includeACF !== undefined) {
      params.append('includeACF', options.includeACF.toString());
    }

    const response = await authClient.api.get(
      `${API_BASE}/search?${params.toString()}`
    );
    return response.data;
  }
};

/**
 * Block Preview API
 */
export const blockPreviewApi = {
  // Get preview data for editing
  async getPreviewData(
    postId: string,
    revisionId?: string
  ): Promise<BlockDataResponse> {
    const url = revisionId
      ? `${API_BASE}/preview/${postId}?revision=${revisionId}`
      : `${API_BASE}/preview/${postId}`;
    
    const response = await authClient.api.get(url);
    return response.data;
  },

  // Save preview data
  async savePreviewData(
    postId: string,
    data: Partial<BlockData>
  ): Promise<{ revisionId: string }> {
    const response = await authClient.api.post(
      `${API_BASE}/preview/${postId}`,
      data
    );
    return response.data;
  },

  // Get preview URL
  async getPreviewUrl(
    postId: string,
    revisionId?: string
  ): Promise<{ url: string }> {
    const params = revisionId ? `?revision=${revisionId}` : '';
    const response = await authClient.api.get(
      `${API_BASE}/preview/${postId}/url${params}`
    );
    return response.data;
  }
};

// Export combined API
export default {
  data: blockDataApi,
  preview: blockPreviewApi
};
/**
 * CPT API Service
 * Handles all API calls related to Custom Post Types
 */

import { authClient } from '@o4o/auth-client';
import {
  CustomPostType,
  CustomPost,
  CPTApiResponse,
  CreateCPTDto,
  UpdateCPTDto,
  CreatePostDto,
  UpdatePostDto,
  CPTListOptions,
  PostStatus
} from '../types/cpt.types';

const API_BASE = '/api/cpt';

/**
 * CPT Type Management
 */
export const cptApi = {
  // Get all CPT types
  async getAllTypes(active?: boolean): Promise<CPTApiResponse<CustomPostType[]>> {
    const params = active !== undefined ? `?active=${active}` : '';
    const response = await authClient.api.get(`${API_BASE}/types${params}`);
    return response.data;
  },

  // Get single CPT type by slug
  async getTypeBySlug(slug: string): Promise<CPTApiResponse<CustomPostType>> {
    const response = await authClient.api.get(`${API_BASE}/types/${slug}`);
    return response.data;
  },

  // Create new CPT type
  async createType(data: CreateCPTDto): Promise<CPTApiResponse<CustomPostType>> {
    const response = await authClient.api.post(`${API_BASE}/types`, data);
    return response.data;
  },

  // Update CPT type
  async updateType(slug: string, data: UpdateCPTDto): Promise<CPTApiResponse<CustomPostType>> {
    const response = await authClient.api.put(`${API_BASE}/types/${slug}`, data);
    return response.data;
  },

  // Delete CPT type
  async deleteType(slug: string): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/types/${slug}`);
    return response.data;
  },

  // Initialize default CPT types
  async initializeDefaults(): Promise<CPTApiResponse<CustomPostType[]>> {
    const response = await authClient.api.post(`${API_BASE}/initialize`);
    return response.data;
  }
};

/**
 * CPT Post Management
 */
export const cptPostApi = {
  // Get posts by CPT type
  async getPostsByType(
    slug: string,
    options: CPTListOptions = {}
  ): Promise<CPTApiResponse<CustomPost[]>> {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    if (options.search) params.append('search', options.search);
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.order) params.append('order', options.order);

    const queryString = params.toString();
    const url = `${API_BASE}/${slug}/posts${queryString ? `?${queryString}` : ''}`;

    const response = await authClient.api.get(url);
    return response.data;
  },

  // Get single post
  async getPost(slug: string, postId: string): Promise<CPTApiResponse<CustomPost>> {
    const response = await authClient.api.get(`${API_BASE}/${slug}/posts/${postId}`);
    return response.data;
  },

  // Create new post
  async createPost(slug: string, data: CreatePostDto): Promise<CPTApiResponse<CustomPost>> {
    const response = await authClient.api.post(`${API_BASE}/${slug}/posts`, data);
    return response.data;
  },

  // Update post
  async updatePost(
    slug: string,
    postId: string,
    data: UpdatePostDto
  ): Promise<CPTApiResponse<CustomPost>> {
    const response = await authClient.api.put(`${API_BASE}/${slug}/posts/${postId}`, data);
    return response.data;
  },

  // Delete post
  async deletePost(slug: string, postId: string): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/${slug}/posts/${postId}`);
    return response.data;
  },

  // Bulk actions
  async bulkAction(
    slug: string,
    action: 'trash' | 'restore' | 'delete' | 'publish' | 'draft',
    postIds: string[]
  ): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.post(`${API_BASE}/${slug}/posts/bulk`, {
      action,
      ids: postIds
    });
    return response.data;
  }
};

// Export combined API
export default {
  types: cptApi,
  posts: cptPostApi
};
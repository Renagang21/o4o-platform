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

const API_BASE = '/cpt';

/**
 * CPT Type Management
 */
export const cptApi = {
  // Get all CPT types
  async getAllTypes(active?: boolean): Promise<CPTApiResponse<CustomPostType[]>> {
    // CPT 대시보드에서는 모든 CPT를 보여줘야 하므로
    // active 파라미터를 전달하지 않으면 백엔드에서 모든 CPT 반환
    const params = active === true ? '?active=true' : '';
    // Fix: Remove /public prefix to match backend routing
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
 * Field Groups Management  
 */
export const fieldGroupApi = {
  // Get all field groups
  async getAll(postType?: string): Promise<CPTApiResponse<any[]>> {
    const params = postType ? `?postType=${postType}` : '';
    const response = await authClient.api.get(`${API_BASE}/field-groups${params}`);
    return response.data;
  },

  // Get single field group
  async getById(id: string): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.get(`${API_BASE}/field-groups/${id}`);
    return response.data;
  },

  // Create field group
  async create(data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.post(`${API_BASE}/field-groups`, data);
    return response.data;
  },

  // Update field group
  async update(id: string, data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.put(`${API_BASE}/field-groups/${id}`, data);
    return response.data;
  },

  // Delete field group
  async delete(id: string): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/field-groups/${id}`);
    return response.data;
  }
};

/**
 * Taxonomies Management
 */
export const taxonomyApi = {
  // Get all taxonomies
  async getAll(): Promise<CPTApiResponse<any[]>> {
    const response = await authClient.api.get(`${API_BASE}/taxonomies`);
    return response.data;
  },

  // Get single taxonomy
  async getById(id: string): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.get(`${API_BASE}/taxonomies/${id}`);
    return response.data;
  },

  // Create taxonomy
  async create(data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.post(`${API_BASE}/taxonomies`, data);
    return response.data;
  },

  // Update taxonomy
  async update(id: string, data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.put(`${API_BASE}/taxonomies/${id}`, data);
    return response.data;
  },

  // Delete taxonomy
  async delete(id: string): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/taxonomies/${id}`);
    return response.data;
  },

  // Get terms for taxonomy
  async getTerms(taxonomyId: string): Promise<CPTApiResponse<any[]>> {
    const response = await authClient.api.get(`${API_BASE}/taxonomies/${taxonomyId}/terms`);
    return response.data;
  },

  // Create term
  async createTerm(taxonomyId: string, data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.post(`${API_BASE}/taxonomies/${taxonomyId}/terms`, data);
    return response.data;
  },

  // Update term
  async updateTerm(taxonomyId: string, termId: string, data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.put(`${API_BASE}/taxonomies/${taxonomyId}/terms/${termId}`, data);
    return response.data;
  },

  // Delete term
  async deleteTerm(taxonomyId: string, termId: string): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/taxonomies/${taxonomyId}/terms/${termId}`);
    return response.data;
  }
};

/**
 * Forms Management
 */
export const formApi = {
  // Get all forms
  async getAll(): Promise<CPTApiResponse<any[]>> {
    const response = await authClient.api.get(`${API_BASE}/forms`);
    return response.data;
  },

  // Get single form
  async getById(id: string): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.get(`${API_BASE}/forms/${id}`);
    return response.data;
  },

  // Create form
  async create(data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.post(`${API_BASE}/forms`, data);
    return response.data;
  },

  // Update form
  async update(id: string, data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.put(`${API_BASE}/forms/${id}`, data);
    return response.data;
  },

  // Delete form
  async delete(id: string): Promise<CPTApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/forms/${id}`);
    return response.data;
  },

  // Submit form
  async submit(id: string, data: any): Promise<CPTApiResponse<any>> {
    const response = await authClient.api.post(`${API_BASE}/forms/${id}/submit`, data);
    return response.data;
  },

  // Get form submissions
  async getSubmissions(id: string): Promise<CPTApiResponse<any[]>> {
    const response = await authClient.api.get(`${API_BASE}/forms/${id}/submissions`);
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
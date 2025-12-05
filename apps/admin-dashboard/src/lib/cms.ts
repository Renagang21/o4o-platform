/**
 * CMS V2 API Client for Admin Dashboard
 *
 * Provides type-safe API functions for managing CMS content:
 * - Custom Post Types (CPTs)
 * - Custom Fields (ACF)
 * - View Templates
 * - Pages & Publishing Workflow
 */

import api from './api';

// ========================================
// TYPES & INTERFACES
// ========================================

export enum CPTStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived',
}

export enum ViewStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  RICHTEXT = 'richtext',
  NUMBER = 'number',
  EMAIL = 'email',
  URL = 'url',
  DATE = 'date',
  DATETIME = 'datetime',
  TIME = 'time',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  IMAGE = 'image',
  FILE = 'file',
  RELATION = 'relation',
  REPEATER = 'repeater',
  GROUP = 'group',
}

export interface CPT {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon: string;
  schema: any;
  status: CPTStatus;
  isPublic: boolean;
  isHierarchical: boolean;
  supportedFeatures?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomField {
  id: string;
  postTypeId: string;
  name: string;
  label: string;
  type: FieldType;
  groupName?: string;
  order: number;
  required: boolean;
  config: Record<string, any>;
  conditionalLogic?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface View {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: string;
  status: ViewStatus;
  schema: ViewSchema;
  postTypeSlug?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ViewSchema {
  version: string;
  type: string;
  components: ViewComponent[];
  bindings?: ViewBinding[];
  styles?: Record<string, any>;
}

export interface ViewComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

export interface ViewBinding {
  source: string;
  target: string;
  query?: Record<string, any>;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: Record<string, any>;
  viewId?: string;
  view?: View;
  seo?: PageSEO;
  status: PageStatus;
  publishedAt?: string;
  scheduledAt?: string;
  versions?: PageVersion[];
  currentVersion: number;
  siteId?: string;
  createdBy: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}

export interface PageVersion {
  version: number;
  content: Record<string, any>;
  createdAt: string;
  createdBy: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface APIListResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

// ========================================
// CUSTOM POST TYPE (CPT) API
// ========================================

export const cmsAPI = {
  // CPT CRUD
  async createCPT(data: {
    slug: string;
    name: string;
    icon: string;
    description?: string;
    schema: any;
    isPublic?: boolean;
    isHierarchical?: boolean;
    supportedFeatures?: string[];
  }): Promise<CPT> {
    const response = await api.post('/cms/cpts', data);
    return response.data.data;
  },

  async listCPTs(params?: {
    status?: CPTStatus;
    isPublic?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<APIListResponse<CPT>> {
    const response = await api.get('/cms/cpts', { params });
    return response.data;
  },

  async getCPT(id: string): Promise<CPT> {
    const response = await api.get(`/cms/cpts/${id}`);
    return response.data.data;
  },

  async getCPTBySlug(slug: string): Promise<CPT> {
    const response = await api.get(`/cms/cpts/slug/${slug}`);
    return response.data.data;
  },

  async updateCPT(id: string, data: Partial<CPT>): Promise<CPT> {
    const response = await api.put(`/cms/cpts/${id}`, data);
    return response.data.data;
  },

  async deleteCPT(id: string): Promise<void> {
    await api.delete(`/cms/cpts/${id}`);
  },

  async activateCPT(id: string): Promise<CPT> {
    const response = await api.post(`/cms/cpts/${id}/activate`);
    return response.data.data;
  },

  async archiveCPT(id: string): Promise<CPT> {
    const response = await api.post(`/cms/cpts/${id}/archive`);
    return response.data.data;
  },

  // ========================================
  // CUSTOM FIELD (ACF) API
  // ========================================

  async createField(data: {
    postTypeId: string;
    name: string;
    label: string;
    type: FieldType;
    groupName?: string;
    order: number;
    required?: boolean;
    config?: Record<string, any>;
    conditionalLogic?: any[];
  }): Promise<CustomField> {
    const response = await api.post('/cms/fields', data);
    return response.data.data;
  },

  async listFields(params?: {
    postTypeId?: string;
    page?: number;
    limit?: number;
  }): Promise<APIListResponse<CustomField>> {
    const response = await api.get('/cms/fields', { params });
    return response.data;
  },

  async getField(id: string): Promise<CustomField> {
    const response = await api.get(`/cms/fields/${id}`);
    return response.data.data;
  },

  async getFieldsForCPT(postTypeId: string): Promise<CustomField[]> {
    const response = await api.get(`/cms/fields/cpt/${postTypeId}`);
    return response.data.data;
  },

  async getFieldsByGroup(postTypeId: string): Promise<Record<string, CustomField[]>> {
    const response = await api.get(`/cms/fields/cpt/${postTypeId}/grouped`);
    return response.data.data;
  },

  async updateField(id: string, data: Partial<CustomField>): Promise<CustomField> {
    const response = await api.put(`/cms/fields/${id}`, data);
    return response.data.data;
  },

  async deleteField(id: string): Promise<void> {
    await api.delete(`/cms/fields/${id}`);
  },

  async reorderFields(postTypeId: string, fieldIds: string[]): Promise<void> {
    await api.post(`/cms/fields/cpt/${postTypeId}/reorder`, { fieldIds });
  },

  async validateFieldValue(id: string, value: any): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await api.post(`/cms/fields/${id}/validate`, { value });
    return response.data.data;
  },

  // ========================================
  // VIEW API
  // ========================================

  async createView(data: {
    slug: string;
    name: string;
    description?: string;
    type: string;
    status?: ViewStatus;
    schema: ViewSchema;
    postTypeSlug?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<View> {
    const response = await api.post('/cms/views', data);
    return response.data.data;
  },

  async listViews(params?: {
    status?: ViewStatus;
    type?: string;
    postTypeSlug?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<APIListResponse<View>> {
    const response = await api.get('/cms/views', { params });
    return response.data;
  },

  async getView(id: string): Promise<View> {
    const response = await api.get(`/cms/views/${id}`);
    return response.data.data;
  },

  async getViewBySlug(slug: string): Promise<View> {
    const response = await api.get(`/cms/views/slug/${slug}`);
    return response.data.data;
  },

  async getViewsForCPT(postTypeSlug: string): Promise<View[]> {
    const response = await api.get(`/cms/views/cpt/${postTypeSlug}`);
    return response.data.data;
  },

  async getComponentsInView(id: string): Promise<ViewComponent[]> {
    const response = await api.get(`/cms/views/${id}/components`);
    return response.data.data;
  },

  async updateView(id: string, data: Partial<View>): Promise<View> {
    const response = await api.put(`/cms/views/${id}`, data);
    return response.data.data;
  },

  async deleteView(id: string): Promise<void> {
    await api.delete(`/cms/views/${id}`);
  },

  async activateView(id: string): Promise<View> {
    const response = await api.post(`/cms/views/${id}/activate`);
    return response.data.data;
  },

  async archiveView(id: string): Promise<View> {
    const response = await api.post(`/cms/views/${id}/archive`);
    return response.data.data;
  },

  async cloneView(id: string, newSlug?: string): Promise<View> {
    const response = await api.post(`/cms/views/${id}/clone`, { newSlug });
    return response.data.data;
  },

  // ========================================
  // PAGE API
  // ========================================

  async createPage(data: {
    slug: string;
    title: string;
    viewId?: string;
    content: Record<string, any>;
    seo?: PageSEO;
    status?: PageStatus;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<Page> {
    const response = await api.post('/cms/pages', data);
    return response.data.data;
  },

  async listPages(params?: {
    status?: PageStatus;
    viewId?: string;
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<APIListResponse<Page>> {
    const response = await api.get('/cms/pages', { params });
    return response.data;
  },

  async getPage(id: string): Promise<Page> {
    const response = await api.get(`/cms/pages/${id}`);
    return response.data.data;
  },

  async getPageBySlug(slug: string): Promise<Page> {
    const response = await api.get(`/cms/pages/slug/${slug}`);
    return response.data.data;
  },

  async updatePage(id: string, data: Partial<Page>): Promise<Page> {
    const response = await api.put(`/cms/pages/${id}`, data);
    return response.data.data;
  },

  async deletePage(id: string): Promise<void> {
    await api.delete(`/cms/pages/${id}`);
  },

  async publishPage(id: string): Promise<Page> {
    const response = await api.post(`/cms/pages/${id}/publish`);
    return response.data.data;
  },

  async schedulePage(id: string, scheduledAt: string): Promise<Page> {
    const response = await api.post(`/cms/pages/${id}/schedule`, { scheduledAt });
    return response.data.data;
  },

  async draftPage(id: string): Promise<Page> {
    const response = await api.post(`/cms/pages/${id}/draft`);
    return response.data.data;
  },

  async archivePage(id: string): Promise<Page> {
    const response = await api.post(`/cms/pages/${id}/archive`);
    return response.data.data;
  },

  async getVersionHistory(id: string): Promise<PageVersion[]> {
    const response = await api.get(`/cms/pages/${id}/versions`);
    return response.data.data;
  },

  async revertToVersion(id: string, version: number): Promise<Page> {
    const response = await api.post(`/cms/pages/${id}/revert`, { version });
    return response.data.data;
  },

  // ========================================
  // PUBLIC API (No Auth Required)
  // ========================================

  async getPublishedPage(slug: string): Promise<{ page: Page; view: View | null }> {
    const response = await api.get(`/cms/public/page/${slug}`);
    return response.data.data;
  },

  async getPublishedPages(params?: {
    page?: number;
    limit?: number;
  }): Promise<APIListResponse<Page>> {
    const response = await api.get('/cms/public/pages', { params });
    return response.data;
  },
};

export default cmsAPI;

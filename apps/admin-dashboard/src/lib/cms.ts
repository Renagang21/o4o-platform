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
    // Map frontend 'name' field to server 'key' field
    const serverData = {
      postTypeId: data.postTypeId,
      key: data.name,  // Server expects 'key', frontend sends 'name'
      label: data.label,
      type: data.type,
      group: data.groupName,
      order: data.order,
      validation: data.required ? { required: true } : undefined,
      options: data.config,
      conditional: data.conditionalLogic,
    };
    const response = await api.post('/cms/fields', serverData);
    return response.data.data;
  },

  async listFields(params?: {
    postTypeId?: string;
    page?: number;
    limit?: number;
  }): Promise<APIListResponse<CustomField>> {
    const response = await api.get('/cms/fields', { params });
    // Server returns { success, data: { fields, total } }
    const serverData = response.data?.data || response.data;
    const rawFields = serverData.fields || [];
    const fields = rawFields.map((field: any) => ({
      ...field,
      name: field.key,  // Server uses 'key', client uses 'name'
      groupName: field.group,
      required: field.validation?.required || false,
      config: field.options || {},
      conditionalLogic: field.conditional || [],
    }));
    return {
      success: true,
      data: fields,
      pagination: {
        total: serverData.total || 0,
        page: params?.page || 1,
        limit: params?.limit || 100,
        totalPages: Math.ceil((serverData.total || 0) / (params?.limit || 100)),
      },
    };
  },

  async getField(id: string): Promise<CustomField> {
    const response = await api.get(`/cms/fields/${id}`);
    // Server returns { field }, map to CustomField
    const serverData = response.data;
    const field = serverData.field || serverData.data;
    // Map server field names to client field names
    return {
      ...field,
      name: field.key,  // Server uses 'key', client uses 'name'
      groupName: field.group,
      required: field.validation?.required || false,
      config: field.options || {},
      conditionalLogic: field.conditional || [],
    };
  },

  async getFieldsForCPT(postTypeId: string): Promise<CustomField[]> {
    const response = await api.get(`/cms/fields/cpt/${postTypeId}`);
    // Server returns { fields, total }
    const serverData = response.data;
    const fields = serverData.fields || serverData.data || [];
    // Map server field names to client field names
    return fields.map((field: any) => ({
      ...field,
      name: field.key,
      groupName: field.group,
      required: field.validation?.required || false,
      config: field.options || {},
      conditionalLogic: field.conditional || [],
    }));
  },

  async getFieldsByGroup(postTypeId: string): Promise<Record<string, CustomField[]>> {
    const response = await api.get(`/cms/fields/cpt/${postTypeId}/grouped`);
    return response.data.data;
  },

  async updateField(id: string, data: Partial<CustomField> & { groupName?: string; required?: boolean; config?: Record<string, any>; conditionalLogic?: any[] }): Promise<CustomField> {
    // Map frontend fields to server fields
    const serverData: Record<string, any> = {};
    if (data.postTypeId) serverData.postTypeId = data.postTypeId;
    if (data.name) serverData.key = data.name;  // Server expects 'key'
    if (data.label) serverData.label = data.label;
    if (data.type) serverData.type = data.type;
    if (data.groupName !== undefined) serverData.group = data.groupName;
    if (data.order !== undefined) serverData.order = data.order;
    if (data.required !== undefined) serverData.validation = data.required ? { required: true } : {};
    if (data.config) serverData.options = data.config;
    if (data.conditionalLogic) serverData.conditional = data.conditionalLogic;

    const response = await api.put(`/cms/fields/${id}`, serverData);
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
    // API returns { success, data: [...views array...], pagination: {...} }
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

  // ========================================
  // CMS CONTENT API (P3: Admin CRUD)
  // ========================================

  async listContents(params?: {
    serviceKey?: string;
    organizationId?: string;
    type?: ContentType;
    status?: ContentStatus;
    isPinned?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: CmsContent[]; pagination: { total: number; limit: number; offset: number } }> {
    const response = await api.get('/cms/contents', { params });
    return response.data;
  },

  async getContent(id: string): Promise<CmsContent> {
    const response = await api.get(`/cms/contents/${id}`);
    return response.data.data;
  },

  async createContent(data: {
    serviceKey?: string;
    organizationId?: string;
    type: ContentType;
    title: string;
    summary?: string;
    body?: string;
    imageUrl?: string;
    linkUrl?: string;
    linkText?: string;
    sortOrder?: number;
    isPinned?: boolean;
    isOperatorPicked?: boolean;
    metadata?: Record<string, any>;
  }): Promise<CmsContent> {
    const response = await api.post('/cms/contents', data);
    return response.data.data;
  },

  async updateContent(id: string, data: Partial<{
    serviceKey: string;
    type: ContentType;
    title: string;
    summary: string;
    body: string;
    imageUrl: string;
    linkUrl: string;
    linkText: string;
    sortOrder: number;
    isPinned: boolean;
    isOperatorPicked: boolean;
    metadata: Record<string, any>;
  }>): Promise<CmsContent> {
    const response = await api.put(`/cms/contents/${id}`, data);
    return response.data.data;
  },

  async updateContentStatus(id: string, status: ContentStatus): Promise<CmsContent> {
    const response = await api.patch(`/cms/contents/${id}/status`, { status });
    return response.data.data;
  },

  async getContentStats(params?: {
    serviceKey?: string;
    organizationId?: string;
  }): Promise<{
    hero: { total: number; active: number };
    notice: { total: number; active: number };
    news: { total: number; active: number };
    featured: { total: number; operatorPicked: number };
    promo: { total: number; active: number };
    event: { total: number; active: number };
  }> {
    const response = await api.get('/cms/stats', { params });
    return response.data.data;
  },

  // ========================================
  // CMS SLOT API (P3: WO-P3-CMS-SLOT-MANAGEMENT-P1)
  // ========================================

  async listSlots(params?: {
    serviceKey?: string;
    slotKey?: string;
    isActive?: boolean;
  }): Promise<{ data: CmsContentSlot[]; meta: { total: number; slotKeys: string[] } }> {
    const response = await api.get('/cms/slots', { params });
    return response.data;
  },

  async createSlot(data: {
    slotKey: string;
    serviceKey?: string;
    organizationId?: string;
    contentId: string;
    sortOrder?: number;
    isActive?: boolean;
    startsAt?: string;
    endsAt?: string;
  }): Promise<CmsContentSlot> {
    const response = await api.post('/cms/slots', data);
    return response.data.data;
  },

  async updateSlot(id: string, data: Partial<{
    slotKey: string;
    serviceKey: string;
    contentId: string;
    sortOrder: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }>): Promise<CmsContentSlot> {
    const response = await api.put(`/cms/slots/${id}`, data);
    return response.data.data;
  },

  async deleteSlot(id: string): Promise<void> {
    await api.delete(`/cms/slots/${id}`);
  },

  async assignSlotContents(slotKey: string, data: {
    serviceKey?: string;
    organizationId?: string;
    contents: Array<{
      contentId: string;
      sortOrder?: number;
      isActive?: boolean;
      startsAt?: string;
      endsAt?: string;
    }>;
  }): Promise<{ data: CmsContentSlot[]; meta: { slotKey: string; serviceKey: string | null; total: number } }> {
    const response = await api.put(`/cms/slots/${slotKey}/contents`, data);
    return response.data;
  },

  async getSlotContents(slotKey: string, params?: {
    serviceKey?: string;
    organizationId?: string;
    activeOnly?: boolean;
  }): Promise<{ data: CmsContentSlot[]; meta: { slotKey: string; total: number } }> {
    const response = await api.get(`/cms/slots/${slotKey}`, { params });
    return response.data;
  },
};

// ========================================
// CMS CONTENT TYPES (P3)
// ========================================

export type ContentType = 'hero' | 'notice' | 'news' | 'featured' | 'promo' | 'event';
// WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: added 'pending' for approval workflow
export type ContentStatus = 'draft' | 'pending' | 'published' | 'archived';

export interface CmsContent {
  id: string;
  serviceKey: string | null;
  organizationId: string | null;
  type: ContentType;
  title: string;
  summary: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  sortOrder: number;
  isPinned: boolean;
  isOperatorPicked: boolean;
  metadata: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// CMS SLOT TYPES (P3: WO-P3-CMS-SLOT-MANAGEMENT-P1)
// ========================================

export interface CmsContentSlot {
  id: string;
  slotKey: string;
  serviceKey: string | null;
  organizationId: string | null;
  contentId: string;
  content: {
    id: string;
    type: ContentType;
    title: string;
    status: ContentStatus;
  } | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default cmsAPI;

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
  // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — dead 메서드 제거
  //
  //   제거한 섹션: CPT CRUD · CUSTOM FIELD(ACF) API · VIEW API · PAGE API · PUBLIC API
  //   (총 약 350줄 / `/cms/cpts` · `/cms/fields` · `/cms/views` · `/cms/pages` · `/cms/public/*`)
  //
  //   이 endpoint 들의 **백엔드가 존재하지 않는다.** `apps/api-server/src/modules/cms/` 에는
  //   entity 만 있고 라우트·컨트롤러가 0건이며 `bootstrap/register-routes.ts` 에 등록된 적이 없다
  //   (`/api/v1/cms` 는 `cms-content.routes.ts` 만 마운트하며 contents·slots·stats 만 제공).
  //   프로덕션 실측 404 — 2026-08-10 `/api/v1/cms/fields` · `/api/v1/cms/cpts`.
  //
  //   호출 화면(`pages/cms/{cpts,fields,views,pages,designer}`)·라우트 13건·
  //   ViewComponentRegistry 등록 10건을 함께 제거했으므로 소비처는 0 이다.
  //
  //   타입 정의(`CPT` · `CustomField` · `View` · `Page` 등)는 **보존**한다 —
  //   entity·테이블이 남아 있고 후속 판정 대상이므로 타입까지 지우지 않는다.
  //   조사 정본: docs/investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md

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

  /**
   * WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1:
   *   상세 조회도 `serviceKey` 가 read boundary 다. 목록에서 얻은 `content.serviceKey` 를
   *   그대로 넘긴다. 생략하면 platform admin 역할일 때만 cross-service 로 허용된다.
   */
  async getContent(id: string, params?: { serviceKey?: string }): Promise<CmsContent> {
    const response = await api.get(`/cms/contents/${id}`, { params });
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
    bodyBlocks?: Record<string, any>[] | null;
    attachments?: Array<{ name: string; url: string; type: string; size?: number }> | null;
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
    bodyBlocks: Record<string, any>[] | null;
    attachments: Array<{ name: string; url: string; type: string; size?: number }> | null;
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

export type ContentType = 'hero' | 'notice' | 'news' | 'featured' | 'promo' | 'event' | 'guide' | 'knowledge';
// WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: added 'pending' for approval workflow
export type ContentStatus = 'draft' | 'pending' | 'published' | 'archived';

export interface CmsContent {
  id: string;
  serviceKey: string | null;
  organizationId: string | null;
  type: ContentType;
  title: string;
  summary: string | null;
  // WO-O4O-ADMIN-CMS-BODY-CANONICAL-EDIT-HYDRATION-FIX-V2:
  //   아래 4개 필드는 상세 API(GET /cms/contents/:id)만 반환한다.
  //   목록 API(GET /cms/contents)는 손으로 쓴 projection 이라 이 필드들을 아예 내려주지 않으므로
  //   optional 로 선언해 "미조회(undefined)" 와 "실제 빈 값(null)" 을 타입에서 구분할 수 있게 한다.
  //   (기존에는 필수로 선언돼 목록 row 에 대해 타입이 거짓이었고, 빈 본문 버그가 컴파일에서 잡히지 않았다.)
  body?: string | null;
  bodyBlocks?: Record<string, any>[] | null;
  attachments?: Array<{ name: string; url: string; type: string; size?: number }> | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  sortOrder: number;
  isPinned: boolean;
  isOperatorPicked: boolean;
  metadata?: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
  producer?: string;
  producerRef?: string;
  visibility?: string;
  contentType?: string;
  metaStatus?: string;
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

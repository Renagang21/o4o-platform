/**
 * Store Content API Client
 *
 * WO-O4O-STORE-CONTENT-UI
 *
 * StoreContent CRUD + Template Copy + Usage (SNS/POP/QR)
 * API 경로: /api/v1/lms/store-contents, /api/v1/lms/templates
 */

import { authClient } from '@o4o/auth-client';

// ============================================
// Types
// ============================================

export type StoreContentStatus = 'draft' | 'active' | 'archived';

export interface StoreContent {
  id: string;
  templateId: string;
  templateVersionId: string;
  storeId: string;
  title: string;
  description?: string;
  status: StoreContentStatus;
  slug?: string;
  shareImage?: string;
  isPublic: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type StoreContentBlockType = 'text' | 'image' | 'video' | 'question' | 'choice';

export interface StoreContentBlock {
  id: string;
  storeContentId: string;
  blockType: StoreContentBlockType;
  content: Record<string, any>;
  position: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateTag {
  id: string;
  name: string;
  slug: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface SNSPayload {
  title: string;
  description: string;
  image: string | null;
  shareUrl: string;
}

export interface POPPayload {
  title: string;
  description: string;
  image: string | null;
  qrDataUrl: string;
}

export interface QRPayload {
  qrImage: string;
  contentUrl: string;
}

// Content Analytics (WO-O4O-CONTENT-ANALYTICS)
export interface ContentAnalyticsStats {
  views: number;
  qrScans: number;
  quizSubmits: number;
  surveySubmits: number;
  shares: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// Store Content API
// ============================================

class StoreContentApi {
  private readonly basePath = '/api/v1/lms/store-contents';
  private readonly templatePath = '/api/v1/lms/templates';

  // --- StoreContent CRUD ---

  async list(params: {
    storeId: string;
    status?: StoreContentStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: StoreContent[]; total: number; totalPages: number }> {
    try {
      const queryParams: Record<string, string | number> = { storeId: params.storeId };
      if (params.status) queryParams.status = params.status;
      if (params.search) queryParams.search = params.search;
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;

      const response = await authClient.api.get<ApiResponse<StoreContent[]>>(
        this.basePath,
        { params: queryParams },
      );

      if (response.data?.success) {
        return {
          items: response.data.data || [],
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0,
        };
      }
      return { items: [], total: 0, totalPages: 0 };
    } catch (error) {
      console.error('Error fetching store contents:', error);
      return { items: [], total: 0, totalPages: 0 };
    }
  }

  async getById(id: string): Promise<StoreContent | null> {
    try {
      const response = await authClient.api.get<ApiResponse<{ storeContent: StoreContent }>>(
        `${this.basePath}/${id}`,
      );
      if (response.data?.success) {
        return response.data.data.storeContent;
      }
      return null;
    } catch (error) {
      console.error('Error fetching store content:', error);
      return null;
    }
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    status?: StoreContentStatus;
    shareImage?: string;
    isPublic?: boolean;
    metadata?: Record<string, any>;
  }): Promise<StoreContent | null> {
    try {
      const response = await authClient.api.patch<ApiResponse<{ storeContent: StoreContent }>>(
        `${this.basePath}/${id}`,
        data,
      );
      if (response.data?.success) {
        return response.data.data.storeContent;
      }
      return null;
    } catch (error) {
      console.error('Error updating store content:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await authClient.api.delete(`${this.basePath}/${id}`);
      return response.status === 204 || response.data?.success;
    } catch (error) {
      console.error('Error deleting store content:', error);
      throw error;
    }
  }

  async copyTemplate(templateId: string, storeId: string): Promise<StoreContent | null> {
    try {
      const response = await authClient.api.post<ApiResponse<{ storeContent: StoreContent }>>(
        `${this.basePath}/copy`,
        { templateId, storeId },
      );
      if (response.data?.success) {
        return response.data.data.storeContent;
      }
      return null;
    } catch (error) {
      console.error('Error copying template:', error);
      throw error;
    }
  }

  // --- Blocks ---

  async getBlocks(storeContentId: string): Promise<StoreContentBlock[]> {
    try {
      const response = await authClient.api.get<ApiResponse<{ blocks: StoreContentBlock[] }>>(
        `${this.basePath}/${storeContentId}/blocks`,
      );
      if (response.data?.success) {
        return response.data.data.blocks || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching blocks:', error);
      return [];
    }
  }

  async updateBlock(blockId: string, data: {
    content?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<StoreContentBlock | null> {
    try {
      const response = await authClient.api.patch<ApiResponse<{ block: StoreContentBlock }>>(
        `/api/v1/lms/store-content-blocks/${blockId}`,
        data,
      );
      if (response.data?.success) {
        return response.data.data.block;
      }
      return null;
    } catch (error) {
      console.error('Error updating block:', error);
      throw error;
    }
  }

  // --- Usage (SNS/POP/QR) ---

  async getSNSPayload(id: string): Promise<SNSPayload | null> {
    try {
      const response = await authClient.api.get<ApiResponse<SNSPayload>>(
        `${this.basePath}/${id}/sns`,
      );
      if (response.data?.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching SNS payload:', error);
      return null;
    }
  }

  async getPOPPayload(id: string): Promise<POPPayload | null> {
    try {
      const response = await authClient.api.get<ApiResponse<POPPayload>>(
        `${this.basePath}/${id}/pop`,
      );
      if (response.data?.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching POP payload:', error);
      return null;
    }
  }

  async getQRPayload(id: string): Promise<QRPayload | null> {
    try {
      const response = await authClient.api.get<ApiResponse<QRPayload>>(
        `${this.basePath}/${id}/qr`,
      );
      if (response.data?.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching QR payload:', error);
      return null;
    }
  }

  // --- Template Library ---

  async listLibraryTemplates(params?: {
    search?: string;
    category?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: TemplateListItem[]; total: number }> {
    try {
      const queryParams: Record<string, string | number> = {};
      if (params?.search) queryParams.search = params.search;
      if (params?.category) queryParams.category = params.category;
      if (params?.tag) queryParams.tag = params.tag;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      const response = await authClient.api.get<ApiResponse<TemplateListItem[]>>(
        `${this.templatePath}/library`,
        { params: queryParams },
      );

      if (response.data?.success) {
        return {
          items: response.data.data || [],
          total: response.data.pagination?.total || 0,
        };
      }
      return { items: [], total: 0 };
    } catch (error) {
      console.error('Error fetching library templates:', error);
      return { items: [], total: 0 };
    }
  }

  async listTags(): Promise<TemplateTag[]> {
    try {
      const response = await authClient.api.get<ApiResponse<{ tags: TemplateTag[] }>>(
        `${this.templatePath}/tags`,
      );
      if (response.data?.success) {
        return response.data.data.tags || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  async listCategories(): Promise<TemplateCategory[]> {
    try {
      const response = await authClient.api.get<ApiResponse<{ categories: TemplateCategory[] }>>(
        `${this.templatePath}/categories`,
      );
      if (response.data?.success) {
        return response.data.data.categories || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // --- Analytics (WO-O4O-CONTENT-ANALYTICS) ---

  async getContentAnalytics(storeContentId: string): Promise<ContentAnalyticsStats | null> {
    try {
      const response = await authClient.api.get<ApiResponse<ContentAnalyticsStats>>(
        `/api/v1/lms/content-analytics/content/${storeContentId}`,
      );
      if (response.data?.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching content analytics:', error);
      return null;
    }
  }

  async trackEvent(
    storeContentId: string,
    eventType: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await authClient.api.post('/api/v1/lms/content-analytics/track', {
        storeContentId,
        eventType,
        metadata,
      });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }
}

export const storeContentApi = new StoreContentApi();

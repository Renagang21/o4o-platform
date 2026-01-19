/**
 * Content Assets API Client
 *
 * WO-O4O-CONTENT-ASSETS-DB-READONLY-V1
 * WO-O4O-CONTENT-COPY-MINIMAL-V1 (copy method added)
 *
 * 대부분 READ-ONLY:
 * - cms_media 데이터를 Content Core 관점으로 조회
 *
 * 예외 - copy():
 * - 비즈니스 사용자가 PUBLIC 콘텐츠를 자신의 콘텐츠로 복사
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { authClient } from '@o4o/auth-client';
import {
  ContentType,
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '@o4o-apps/content-core';

/**
 * ContentAssetView - API Response Type
 *
 * Read-only projection of cms_media data
 * mapped to Content Core concepts.
 */
export interface ContentAssetView {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  status: ContentStatus;
  visibility: ContentVisibility;
  ownerType: ContentOwnerType;
  // CMS metadata
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  originalFilename: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ContentAssetDetail - Detail View Response
 */
export interface ContentAssetDetail extends ContentAssetView {
  organizationId: string | null;
  folderId: string | null;
  metadata: Record<string, unknown>;
  files: Array<{
    id: string;
    variant: string;
    url: string | null;
    mimeType: string;
    fileSize: number;
    width: number | null;
    height: number | null;
  }>;
}

/**
 * ContentAssetStats - Statistics Response
 */
export interface ContentAssetStats {
  totalAssets: number;
  byStatus: {
    published: number;
    archived: number;
    draft: number;
  };
  byType: {
    video: number;
    image: number;
    document: number;
    block: number;
  };
  byOwner: {
    platform: number;
    service: number;
    partner: number;
  };
  byVisibility: {
    public: number;
    restricted: number;
  };
}

/**
 * List query parameters
 */
export interface ContentAssetsListParams {
  type?: ContentType | 'all';
  status?: ContentStatus | 'all';
  organizationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Copy Response - WO-O4O-CONTENT-COPY-MINIMAL-V1
 */
export interface ContentAssetCopyResult {
  asset: ContentAssetView;
  sourceContentId: string;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
  meta?: {
    source: string;
    readOnly: boolean;
    mappings?: Record<string, string>;
  };
  error?: {
    code: string;
    message: string;
  };
}

class ContentAssetsApi {
  private readonly basePath = '/api/v1/content/assets';

  /**
   * Get list of content assets
   *
   * ⚠️ READ-ONLY: SELECT only
   */
  async list(params?: ContentAssetsListParams): Promise<{
    assets: ContentAssetView[];
    total: number;
    meta?: Record<string, unknown>;
  }> {
    try {
      // Build query params, filtering out 'all' values
      const queryParams: Record<string, string | number> = {};
      if (params?.type && params.type !== 'all') {
        queryParams.type = params.type;
      }
      if (params?.status && params.status !== 'all') {
        queryParams.status = params.status;
      }
      if (params?.organizationId) {
        queryParams.organizationId = params.organizationId;
      }
      if (params?.limit) {
        queryParams.limit = params.limit;
      }
      if (params?.offset) {
        queryParams.offset = params.offset;
      }

      const response = await authClient.api.get<ApiResponse<ContentAssetView[]>>(
        this.basePath,
        { params: queryParams }
      );

      if (response.data?.success) {
        return {
          assets: response.data.data || [],
          total: response.data.pagination?.total || 0,
          meta: response.data.meta,
        };
      }

      console.error('Content Assets API error:', response.data?.error);
      return { assets: [], total: 0 };
    } catch (error) {
      console.error('Error fetching content assets:', error);
      return { assets: [], total: 0 };
    }
  }

  /**
   * Get single content asset by ID
   *
   * ⚠️ READ-ONLY: SELECT only
   */
  async getById(id: string): Promise<ContentAssetDetail | null> {
    try {
      const response = await authClient.api.get<ApiResponse<ContentAssetDetail>>(
        `${this.basePath}/${id}`
      );

      if (response.data?.success) {
        return response.data.data;
      }

      console.error('Content Asset API error:', response.data?.error);
      return null;
    } catch (error) {
      console.error('Error fetching content asset:', error);
      return null;
    }
  }

  /**
   * Get content asset statistics
   *
   * ⚠️ READ-ONLY: SELECT COUNT only
   */
  async getStats(organizationId?: string): Promise<ContentAssetStats | null> {
    try {
      const params = organizationId ? { organizationId } : {};
      const response = await authClient.api.get<ApiResponse<ContentAssetStats>>(
        `${this.basePath}/stats`,
        { params }
      );

      if (response.data?.success) {
        return response.data.data;
      }

      console.error('Content Assets Stats API error:', response.data?.error);
      return null;
    } catch (error) {
      console.error('Error fetching content asset stats:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async health(): Promise<boolean> {
    try {
      const response = await authClient.api.get(`${this.basePath}/health`);
      return response.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Copy a public content asset to user's own content
   *
   * WO-O4O-CONTENT-COPY-MINIMAL-V1
   *
   * - 비즈니스 사용자 전용 (partner, affiliate, seller, supplier)
   * - PUBLIC 콘텐츠만 복사 가능
   * - 새 cms_media 레코드 생성 (원본 참조 유지)
   *
   * ⚠️ WRITE OPERATION (예외적 허용)
   */
  async copy(id: string): Promise<ContentAssetCopyResult | null> {
    try {
      const response = await authClient.api.post<
        ApiResponse<ContentAssetView & { sourceContentId: string }>
      >(`${this.basePath}/${id}/copy`);

      if (response.data?.success) {
        const { sourceContentId, ...asset } = response.data.data;
        return {
          asset,
          sourceContentId,
        };
      }

      console.error('Content Copy API error:', response.data?.error);
      return null;
    } catch (error) {
      console.error('Error copying content asset:', error);
      throw error; // Re-throw to allow caller to handle error message
    }
  }
}

export const contentAssetsApi = new ContentAssetsApi();

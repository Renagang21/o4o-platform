/**
 * Content Assets Routes
 *
 * WO-O4O-CONTENT-ASSETS-DB-READONLY-V1
 * WO-O4O-CONTENT-COPY-MINIMAL-V1 (copy endpoint added)
 *
 * 대부분 READ-ONLY 작업:
 * - cms_media 테이블에서 SELECT 수행
 * - Content Core 타입(enum)으로 매핑하여 반환
 *
 * 예외 - 복사 기능 (POST /:id/copy):
 * - 비즈니스 사용자가 PUBLIC 콘텐츠를 자신의 콘텐츠로 복사
 * - 새 cms_media 레코드 INSERT (원본 참조 유지)
 *
 * Content Core는 DB를 소유하지 않음.
 * cms_media가 유일한 Source of Truth.
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CmsMedia } from '@o4o-apps/cms-core';
import { requireAdmin, requireRole, type AuthRequest } from '../../middleware/auth.middleware.js';

/**
 * Content Core Types (Read-only reference)
 *
 * These enums are from @o4o-apps/content-core.
 * We use them for mapping cms_media data to Content concepts.
 */
import {
  ContentType,
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '@o4o-apps/content-core';

/**
 * ContentAssetView - Projection DTO (Not an Entity)
 *
 * This is a read-only view/projection of cms_media data
 * mapped to Content Core concepts.
 *
 * ⚠️ This is NOT a TypeORM Entity.
 * ⚠️ No Repository is created for this type.
 */
interface ContentAssetView {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  status: ContentStatus;
  visibility: ContentVisibility;
  ownerType: ContentOwnerType;
  // Additional CMS metadata (read-only)
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  originalFilename: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map cms_media.type to ContentType
 *
 * cms_media.type values: 'image', 'video', 'audio', 'document', 'archive', 'other'
 * ContentType values: VIDEO, IMAGE, DOCUMENT, BLOCK
 */
function mapToContentType(cmsType: string): ContentType {
  switch (cmsType.toLowerCase()) {
    case 'video':
      return ContentType.VIDEO;
    case 'image':
      return ContentType.IMAGE;
    case 'document':
    case 'archive': // Archives are treated as documents
      return ContentType.DOCUMENT;
    case 'audio':
      // Audio doesn't have direct mapping, treat as document
      return ContentType.DOCUMENT;
    default:
      // 'other' and unknown types default to BLOCK
      return ContentType.BLOCK;
  }
}

/**
 * Map cms_media.isActive to ContentStatus
 *
 * cms_media has isActive boolean.
 * Content Core has DRAFT, PUBLISHED, ARCHIVED.
 *
 * Simple mapping:
 * - isActive: true → PUBLISHED
 * - isActive: false → ARCHIVED
 *
 * Note: DRAFT status not directly available from cms_media.
 * All existing media in cms_media are considered either
 * published (active) or archived (inactive).
 */
function mapToContentStatus(isActive: boolean): ContentStatus {
  return isActive ? ContentStatus.PUBLISHED : ContentStatus.ARCHIVED;
}

/**
 * Determine ContentOwnerType
 *
 * cms_media doesn't have explicit owner type.
 * We infer from organizationId:
 * - NULL organizationId → PLATFORM (global asset)
 * - Non-NULL organizationId → SERVICE (org-specific asset)
 *
 * PARTNER type reserved for future partner integrations.
 */
function mapToContentOwnerType(organizationId: string | null): ContentOwnerType {
  return organizationId ? ContentOwnerType.SERVICE : ContentOwnerType.PLATFORM;
}

/**
 * Determine ContentVisibility
 *
 * cms_media doesn't have explicit visibility field.
 * Default to PUBLIC for active items, RESTRICTED for inactive.
 *
 * Future enhancement: Add visibility field to cms_media or metadata.
 */
function mapToContentVisibility(isActive: boolean): ContentVisibility {
  return isActive ? ContentVisibility.PUBLIC : ContentVisibility.RESTRICTED;
}

/**
 * Transform CmsMedia entity to ContentAssetView projection
 */
function toContentAssetView(media: CmsMedia): ContentAssetView {
  return {
    id: media.id,
    type: mapToContentType(media.type),
    title: media.title,
    description: media.description,
    status: mapToContentStatus(media.isActive),
    visibility: mapToContentVisibility(media.isActive),
    ownerType: mapToContentOwnerType(media.organizationId),
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    width: media.width,
    height: media.height,
    duration: media.duration,
    originalFilename: media.originalFilename,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

/**
 * Create Content Assets routes (Read-Only)
 *
 * All endpoints perform SELECT queries only.
 * No INSERT / UPDATE / DELETE operations.
 */
export function createContentAssetsRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /content/assets
   * List content assets with filters
   *
   * Query params:
   * - type: Filter by ContentType (video, image, document, block)
   * - status: Filter by ContentStatus (draft, published, archived)
   * - organizationId: Filter by organization
   * - limit: Max items (default: 50)
   * - offset: Pagination offset (default: 0)
   *
   * ⚠️ READ-ONLY: SELECT only
   */
  router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        type,
        status,
        organizationId,
        limit = '50',
        offset = '0',
      } = req.query;

      const mediaRepo = dataSource.getRepository(CmsMedia);

      // Build where clause
      const where: any = {};

      // Map ContentType back to cms_media.type for filtering
      if (type) {
        const contentType = type as string;
        switch (contentType.toLowerCase()) {
          case 'video':
            where.type = 'video';
            break;
          case 'image':
            where.type = 'image';
            break;
          case 'document':
            where.type = 'document';
            break;
          case 'block':
            where.type = 'other';
            break;
        }
      }

      // Map ContentStatus back to cms_media.isActive for filtering
      if (status) {
        const contentStatus = status as string;
        switch (contentStatus.toLowerCase()) {
          case 'published':
            where.isActive = true;
            break;
          case 'archived':
            where.isActive = false;
            break;
          case 'draft':
            // DRAFT not directly supported in cms_media
            // Return empty result for draft filter
            res.json({
              success: true,
              data: [],
              pagination: {
                total: 0,
                limit: parseInt(limit as string, 10),
                offset: parseInt(offset as string, 10),
              },
              meta: {
                source: 'cms_media',
                readOnly: true,
                note: 'DRAFT status not available in cms_media',
              },
            });
            return;
        }
      }

      if (organizationId) {
        where.organizationId = organizationId as string;
      }

      // Execute SELECT query (READ-ONLY)
      const [mediaItems, total] = await mediaRepo.findAndCount({
        where,
        order: { updatedAt: 'DESC', createdAt: 'DESC' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      });

      // Transform to ContentAssetView projections
      const assets = mediaItems.map(toContentAssetView);

      res.json({
        success: true,
        data: assets,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
        meta: {
          source: 'cms_media',
          readOnly: true,
          mappings: {
            type: 'cms_media.type → ContentType',
            status: 'cms_media.isActive → ContentStatus',
            visibility: 'derived from isActive',
            ownerType: 'derived from organizationId',
          },
        },
      });
    } catch (error: any) {
      console.error('Failed to list content assets:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /content/assets/stats
   * Get content asset statistics
   *
   * Returns counts by type, status, owner, visibility.
   *
   * ⚠️ READ-ONLY: SELECT COUNT only
   */
  router.get('/stats', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.query;
      const mediaRepo = dataSource.getRepository(CmsMedia);

      // Build base where clause
      const baseWhere: any = {};
      if (organizationId) {
        baseWhere.organizationId = organizationId as string;
      }

      // Get counts (READ-ONLY queries)
      const [
        totalCount,
        activeCount,
        inactiveCount,
        videoCount,
        imageCount,
        documentCount,
        audioCount,
        otherCount,
        platformCount,
        serviceCount,
      ] = await Promise.all([
        // Total
        mediaRepo.count({ where: baseWhere }),
        // By status
        mediaRepo.count({ where: { ...baseWhere, isActive: true } }),
        mediaRepo.count({ where: { ...baseWhere, isActive: false } }),
        // By type
        mediaRepo.count({ where: { ...baseWhere, type: 'video' } }),
        mediaRepo.count({ where: { ...baseWhere, type: 'image' } }),
        mediaRepo.count({ where: { ...baseWhere, type: 'document' } }),
        mediaRepo.count({ where: { ...baseWhere, type: 'audio' } }),
        mediaRepo.count({ where: { ...baseWhere, type: 'other' } }),
        // By owner (platform = no org, service = has org)
        // Note: TypeORM IsNull() needed for null checks
        mediaRepo.createQueryBuilder('media')
          .where('media."organizationId" IS NULL')
          .getCount(),
        mediaRepo.createQueryBuilder('media')
          .where('media."organizationId" IS NOT NULL')
          .getCount(),
      ]);

      res.json({
        success: true,
        data: {
          totalAssets: totalCount,
          byStatus: {
            published: activeCount,
            archived: inactiveCount,
            draft: 0, // Not available in cms_media
          },
          byType: {
            video: videoCount,
            image: imageCount,
            document: documentCount + audioCount, // Audio mapped to document
            block: otherCount,
          },
          byOwner: {
            platform: platformCount,
            service: serviceCount,
            partner: 0, // Future enhancement
          },
          byVisibility: {
            public: activeCount,
            restricted: inactiveCount,
          },
        },
        meta: {
          source: 'cms_media',
          readOnly: true,
          organizationId: organizationId || null,
        },
      });
    } catch (error: any) {
      console.error('Failed to get content asset stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /content/assets/:id
   * Get single content asset by ID
   *
   * ⚠️ READ-ONLY: SELECT only
   */
  router.get('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const mediaRepo = dataSource.getRepository(CmsMedia);

      // Execute SELECT query (READ-ONLY)
      const media = await mediaRepo.findOne({
        where: { id },
        relations: ['files'], // Include related files
      });

      if (!media) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Asset not found' },
        });
        return;
      }

      // Transform to ContentAssetView projection
      const asset = toContentAssetView(media);

      // Include files for detail view
      const files = media.files?.map(file => ({
        id: file.id,
        variant: file.variant,
        url: file.url,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        width: file.width,
        height: file.height,
      })) || [];

      res.json({
        success: true,
        data: {
          ...asset,
          files,
          // Include raw organizationId for reference
          organizationId: media.organizationId,
          folderId: media.folderId,
          metadata: media.metadata,
        },
        meta: {
          source: 'cms_media',
          readOnly: true,
        },
      });
    } catch (error: any) {
      console.error('Failed to get content asset:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /content/assets/:id/copy
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
  router.post(
    '/:id/copy',
    requireRole(['partner', 'affiliate', 'seller', 'supplier']),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const mediaRepo = dataSource.getRepository(CmsMedia);

        // 1. 원본 콘텐츠 조회
        const originalMedia = await mediaRepo.findOne({
          where: { id },
        });

        if (!originalMedia) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Original asset not found' },
          });
          return;
        }

        // 2. PUBLIC 콘텐츠 여부 확인 (isActive = true && organizationId = null)
        // PUBLIC = PLATFORM 소유 (organizationId가 null) + 활성 상태
        const isPublic = originalMedia.isActive && !originalMedia.organizationId;

        if (!isPublic) {
          res.status(403).json({
            success: false,
            error: {
              code: 'NOT_PUBLIC',
              message: 'Only public (platform) content can be copied',
            },
          });
          return;
        }

        // 3. 새 cms_media 레코드 생성
        const newMediaId = uuidv4();
        const newMedia = mediaRepo.create({
          id: newMediaId,
          // 사용자 조직 ID (없으면 사용자 ID 사용)
          organizationId: user.id, // 비즈니스 사용자의 ID를 조직으로 사용
          folderId: null,
          uploadedBy: user.id,
          // 원본 정보 복사
          title: `${originalMedia.title} (복사본)`,
          altText: originalMedia.altText,
          caption: originalMedia.caption,
          description: originalMedia.description,
          type: originalMedia.type,
          mimeType: originalMedia.mimeType,
          originalFilename: originalMedia.originalFilename,
          fileSize: originalMedia.fileSize,
          width: originalMedia.width,
          height: originalMedia.height,
          duration: originalMedia.duration,
          // 메타데이터에 원본 참조 추가
          metadata: {
            ...originalMedia.metadata,
            sourceContentId: originalMedia.id,
            copiedAt: new Date().toISOString(),
            copiedBy: user.id,
          },
          // 복사본 기본 설정: 비활성(DRAFT) 상태
          isActive: false,
        });

        await mediaRepo.save(newMedia);

        // 4. 새 콘텐츠 반환
        const copiedAsset = toContentAssetView(newMedia);

        res.status(201).json({
          success: true,
          data: {
            ...copiedAsset,
            sourceContentId: originalMedia.id,
          },
          meta: {
            operation: 'copy',
            sourceId: originalMedia.id,
            newId: newMediaId,
          },
        });
      } catch (error: any) {
        console.error('Failed to copy content asset:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      service: 'content-assets',
      mode: 'read-only',
      source: 'cms_media',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

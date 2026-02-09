/**
 * Dashboard Assets Routes
 *
 * WO-APP-DATA-HUB-COPY-PHASE2A-V1
 * WO-APP-DATA-HUB-COPY-PHASE2B-V1: 복사 옵션 추가
 *
 * 통합 대시보드 자산 복사 API
 * - 허브 콘텐츠를 내 대시보드 자산으로 복사
 * - Content / Signage Media / Signage Playlist 지원
 *
 * 핵심 원칙:
 * - Hub = Read Only
 * - My Dashboard = Write / Edit / Delete
 * - 원본 데이터는 절대 수정되지 않음
 */

import { Router, Response } from 'express';
import type { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, type AuthRequest } from '../../middleware/auth.middleware.js';
import { CmsMedia } from '@o4o-apps/cms-core';
import {
  SignagePlaylist,
  SignageMedia,
} from '@o4o-apps/digital-signage-core/entities';

/**
 * Source types for dashboard asset copy
 */
type DashboardAssetSourceType = 'content' | 'signage_media' | 'signage_playlist';

/**
 * Copy options (Phase 2-B)
 */
type TitleMode = 'keep' | 'edit';
type DescriptionMode = 'keep' | 'empty';
type TemplateType = 'info' | 'promo' | 'guide';

interface CopyOptions {
  titleMode?: TitleMode;
  title?: string;
  descriptionMode?: DescriptionMode;
  templateType?: TemplateType;
}

/**
 * Request body for copy operation
 */
interface CopyAssetRequest {
  sourceType: DashboardAssetSourceType;
  sourceId: string;
  targetDashboardId: string;
  options?: CopyOptions;
}

/**
 * Response for copy operation
 */
interface CopyAssetResponse {
  success: boolean;
  dashboardAssetId: string;
  status: 'draft';
  sourceType: DashboardAssetSourceType;
  sourceId: string;
}

/**
 * Create Dashboard Assets routes
 */
export function createDashboardAssetsRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * POST /api/v1/dashboard/assets/copy
   *
   * 허브 콘텐츠를 내 대시보드로 복사
   *
   * Request:
   * {
   *   sourceType: 'content' | 'signage_media' | 'signage_playlist',
   *   sourceId: 'uuid',
   *   targetDashboardId: 'uuid'
   * }
   *
   * Response:
   * {
   *   success: true,
   *   dashboardAssetId: 'uuid',
   *   status: 'draft'
   * }
   */
  router.post('/copy', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        });
        return;
      }

      const { sourceType, sourceId, targetDashboardId, options } = req.body as CopyAssetRequest;

      // Validate required fields
      if (!sourceType || !sourceId || !targetDashboardId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sourceType, sourceId, targetDashboardId는 필수입니다.',
          },
        });
        return;
      }

      // Validate sourceType
      const validSourceTypes: DashboardAssetSourceType[] = ['content', 'signage_media', 'signage_playlist'];
      if (!validSourceTypes.includes(sourceType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SOURCE_TYPE',
            message: `sourceType은 ${validSourceTypes.join(', ')} 중 하나여야 합니다.`,
          },
        });
        return;
      }

      // Apply default options (Phase 2-B)
      const copyOptions: CopyOptions = {
        titleMode: options?.titleMode || 'keep',
        title: options?.title,
        descriptionMode: options?.descriptionMode || 'keep',
        templateType: options?.templateType || 'info',
      };

      // TODO: Phase 2-A enhancement - verify dashboard ownership
      // For now, we trust targetDashboardId and use it as organizationId
      // In future, validate that user has access to this dashboard

      let result: CopyAssetResponse;

      switch (sourceType) {
        case 'content':
          result = await copyContent(dataSource, sourceId, targetDashboardId, user.id, copyOptions);
          break;

        case 'signage_media':
          result = await copySignageMedia(dataSource, sourceId, targetDashboardId, user.id, copyOptions);
          break;

        case 'signage_playlist':
          result = await copySignagePlaylist(dataSource, sourceId, targetDashboardId, user.id, copyOptions);
          break;

        default:
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_SOURCE_TYPE', message: '지원하지 않는 소스 타입입니다.' },
          });
          return;
      }

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Dashboard asset copy failed:', error);

      if (error.message === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '원본 콘텐츠를 찾을 수 없습니다.' },
        });
        return;
      }

      if (error.message === 'NOT_PUBLIC') {
        res.status(403).json({
          success: false,
          error: { code: 'NOT_PUBLIC', message: '공개된 콘텐츠만 복사할 수 있습니다.' },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /api/v1/dashboard/assets
   *
   * 내 대시보드 자산 목록 조회
   */
  router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { dashboardId, sourceType, status } = req.query;

      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' },
        });
        return;
      }

      // Query copied assets from cms_media where metadata contains sourceContentId
      const mediaRepo = dataSource.getRepository(CmsMedia);

      const query = mediaRepo.createQueryBuilder('media')
        .where('media."organizationId" = :dashboardId', { dashboardId })
        .andWhere("media.metadata->>'sourceContentId' IS NOT NULL");

      if (status === 'draft') {
        query.andWhere('media."isActive" = false');
      } else if (status === 'active') {
        query.andWhere('media."isActive" = true');
      }

      const assets = await query
        .orderBy('media."createdAt"', 'DESC')
        .getMany();

      res.json({
        success: true,
        data: assets.map(asset => ({
          id: asset.id,
          title: asset.title,
          type: asset.type,
          status: asset.isActive ? 'active' : 'draft',
          sourceContentId: asset.metadata?.sourceContentId,
          copiedAt: asset.metadata?.copiedAt,
          createdAt: asset.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('Failed to list dashboard assets:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}

/**
 * Copy content (CmsMedia) to dashboard
 */
async function copyContent(
  dataSource: DataSource,
  sourceId: string,
  targetDashboardId: string,
  userId: string,
  options: CopyOptions
): Promise<CopyAssetResponse> {
  const mediaRepo = dataSource.getRepository(CmsMedia);

  // 1. Find original content
  const original = await mediaRepo.findOne({ where: { id: sourceId } });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  // 2. Check if public (platform content = organizationId is null + active)
  const isPublic = original.isActive && !original.organizationId;
  if (!isPublic) {
    throw new Error('NOT_PUBLIC');
  }

  // 3. Apply options (Phase 2-B)
  const title = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.title} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.description;

  // 4. Create new record
  const newId = uuidv4();
  const newAsset = mediaRepo.create({
    id: newId,
    organizationId: targetDashboardId,
    folderId: null,
    uploadedBy: userId,
    // Apply title/description from options
    title,
    altText: original.altText,
    caption: original.caption,
    description,
    type: original.type,
    mimeType: original.mimeType,
    originalFilename: original.originalFilename,
    fileSize: original.fileSize,
    width: original.width,
    height: original.height,
    duration: original.duration,
    // Metadata with source reference and template type
    metadata: {
      ...original.metadata,
      sourceContentId: original.id,
      sourceType: 'content',
      templateType: options.templateType,
      copiedAt: new Date().toISOString(),
      copiedBy: userId,
    },
    // New asset starts as draft
    isActive: false,
  });

  await mediaRepo.save(newAsset);

  return {
    success: true,
    dashboardAssetId: newId,
    status: 'draft',
    sourceType: 'content',
    sourceId: sourceId,
  };
}

/**
 * Copy Signage Media to dashboard
 */
async function copySignageMedia(
  dataSource: DataSource,
  sourceId: string,
  targetDashboardId: string,
  userId: string,
  options: CopyOptions
): Promise<CopyAssetResponse> {
  const mediaRepo = dataSource.getRepository(SignageMedia);

  // 1. Find original media
  const original = await mediaRepo.findOne({ where: { id: sourceId } });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  // 2. Check if public (status = active and scope = global or no organizationId)
  const isPublicContent = original.status === 'active' &&
    (original.scope === 'global' || !original.organizationId);

  if (!isPublicContent) {
    throw new Error('NOT_PUBLIC');
  }

  // 3. Apply options (Phase 2-B)
  const name = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.name} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.description;

  // 4. Create new record
  const newId = uuidv4();
  const newMedia = mediaRepo.create({
    id: newId,
    serviceKey: original.serviceKey,
    organizationId: targetDashboardId,
    createdByUserId: userId,
    // Apply name/description from options
    name,
    description,
    mediaType: original.mediaType,
    sourceType: original.sourceType,
    sourceUrl: original.sourceUrl,
    embedId: original.embedId,
    thumbnailUrl: original.thumbnailUrl,
    duration: original.duration,
    resolution: original.resolution,
    fileSize: original.fileSize,
    mimeType: original.mimeType,
    content: original.content,
    tags: original.tags,
    category: original.category,
    // New media is store-specific and inactive (draft)
    source: 'store',
    scope: 'store',
    status: 'inactive',
    parentMediaId: original.id,
    // Metadata with source reference and template type
    metadata: {
      ...original.metadata,
      sourceContentId: original.id,
      sourceType: 'signage_media',
      templateType: options.templateType,
      copiedAt: new Date().toISOString(),
      copiedBy: userId,
    },
  });

  await mediaRepo.save(newMedia);

  return {
    success: true,
    dashboardAssetId: newId,
    status: 'draft', // Return draft for UI consistency
    sourceType: 'signage_media',
    sourceId: sourceId,
  };
}

/**
 * Copy Signage Playlist to dashboard
 */
async function copySignagePlaylist(
  dataSource: DataSource,
  sourceId: string,
  targetDashboardId: string,
  userId: string,
  options: CopyOptions
): Promise<CopyAssetResponse> {
  const playlistRepo = dataSource.getRepository(SignagePlaylist);

  // 1. Find original playlist
  const original = await playlistRepo.findOne({
    where: { id: sourceId },
    relations: ['items'],
  });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  // 2. Check if public (status = active and isPublic or scope = global)
  const isPublicContent = original.status === 'active' &&
    (original.isPublic || original.scope === 'global' || !original.organizationId);

  if (!isPublicContent) {
    throw new Error('NOT_PUBLIC');
  }

  // 3. Apply options (Phase 2-B)
  const name = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.name} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.description;

  // 4. Create new playlist record
  const newId = uuidv4();
  const newPlaylist = playlistRepo.create({
    id: newId,
    serviceKey: original.serviceKey,
    organizationId: targetDashboardId,
    createdByUserId: userId,
    // Apply name/description from options
    name,
    description,
    loopEnabled: original.loopEnabled,
    defaultItemDuration: original.defaultItemDuration,
    transitionType: original.transitionType,
    transitionDuration: original.transitionDuration,
    totalDuration: original.totalDuration,
    itemCount: 0, // Items not copied in Phase 2-A
    // New playlist is store-specific and draft
    source: 'store',
    scope: 'store',
    status: 'draft',
    isPublic: false,
    parentPlaylistId: original.id,
    // Metadata with source reference and template type
    metadata: {
      ...original.metadata,
      sourceContentId: original.id,
      sourceType: 'signage_playlist',
      templateType: options.templateType,
      copiedAt: new Date().toISOString(),
      copiedBy: userId,
    },
  });

  await playlistRepo.save(newPlaylist);

  // Note: Playlist items are NOT copied in Phase 2-A
  // Items can be added/modified in the dashboard later

  return {
    success: true,
    dashboardAssetId: newId,
    status: 'draft',
    sourceType: 'signage_playlist',
    sourceId: sourceId,
  };
}

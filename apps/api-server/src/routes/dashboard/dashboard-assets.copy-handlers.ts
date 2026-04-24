/**
 * Dashboard Assets — Copy Handlers
 *
 * Extracted from dashboard-assets.routes.ts (WO-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-V1)
 * Contains: copyAsset route handler + copyContent, copySignageMedia, copySignagePlaylist
 */

import { Response } from 'express';
import type { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CmsMedia, CmsContent } from '@o4o-apps/cms-core';
import {
  SignagePlaylist,
  SignageMedia,
} from '@o4o-apps/digital-signage-core/entities';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import type {
  DashboardAssetSourceType,
  CopyAssetRequest,
  CopyAssetResponse,
  CopyOptions,
} from './dashboard-assets.types.js';

/**
 * POST /api/v1/dashboard/assets/copy
 *
 * 허브 콘텐츠를 내 대시보드로 복사
 */
export function createCopyAssetHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
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
      const validSourceTypes: DashboardAssetSourceType[] = ['content', 'signage_media', 'signage_playlist', 'hub_content'];
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

        case 'hub_content':
          result = await copyHubContent(dataSource, sourceId, targetDashboardId, user.id, copyOptions);
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
  };
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

  const original = await mediaRepo.findOne({ where: { id: sourceId } });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  const isPublic = original.isActive && !original.organizationId;
  if (!isPublic) {
    throw new Error('NOT_PUBLIC');
  }

  const title = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.title} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.description;

  const newId = uuidv4();
  const newAsset = mediaRepo.create({
    id: newId,
    organizationId: targetDashboardId,
    folderId: null,
    uploadedBy: userId,
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
    metadata: {
      ...original.metadata,
      sourceContentId: original.id,
      sourceType: 'content',
      templateType: options.templateType,
      copiedAt: new Date().toISOString(),
      copiedBy: userId,
    },
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

  const original = await mediaRepo.findOne({ where: { id: sourceId } });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  const isPublicContent = original.status === 'active' &&
    (original.scope === 'global' || !original.organizationId);

  if (!isPublicContent) {
    throw new Error('NOT_PUBLIC');
  }

  const name = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.name} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.description;

  const newId = uuidv4();
  const newMedia = mediaRepo.create({
    id: newId,
    serviceKey: original.serviceKey,
    organizationId: targetDashboardId,
    createdByUserId: userId,
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
    source: 'store',
    scope: 'store',
    status: 'draft',
    parentMediaId: original.id,
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
    status: 'draft',
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

  const original = await playlistRepo.findOne({
    where: { id: sourceId },
    relations: ['items'],
  });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  const isPublicContent = original.status === 'active' &&
    (original.isPublic || original.scope === 'global' || !original.organizationId);

  if (!isPublicContent) {
    throw new Error('NOT_PUBLIC');
  }

  const name = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.name} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.description;

  const newId = uuidv4();
  const newPlaylist = playlistRepo.create({
    id: newId,
    serviceKey: original.serviceKey,
    organizationId: targetDashboardId,
    createdByUserId: userId,
    name,
    description,
    loopEnabled: original.loopEnabled,
    defaultItemDuration: original.defaultItemDuration,
    transitionType: original.transitionType,
    transitionDuration: original.transitionDuration,
    totalDuration: original.totalDuration,
    itemCount: 0,
    source: 'store',
    scope: 'store',
    status: 'draft',
    isPublic: false,
    parentPlaylistId: original.id,
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

  return {
    success: true,
    dashboardAssetId: newId,
    status: 'draft',
    sourceType: 'signage_playlist',
    sourceId: sourceId,
  };
}

/**
 * Copy Hub Content (CmsContent) to dashboard as CmsMedia
 *
 * WO-O4O-CONTENT-LIBRARY-TO-MY-CONTENT-V1
 *
 * Hub Content API returns cms_contents.id, which is a different table from cms_media.
 * This function reads from cms_contents and creates a new cms_media entry.
 */
async function copyHubContent(
  dataSource: DataSource,
  sourceId: string,
  targetDashboardId: string,
  userId: string,
  options: CopyOptions
): Promise<CopyAssetResponse> {
  const contentRepo = dataSource.getRepository(CmsContent);
  const original = await contentRepo.findOne({ where: { id: sourceId } });

  if (!original) {
    throw new Error('NOT_FOUND');
  }

  if (original.status !== 'published') {
    throw new Error('NOT_PUBLIC');
  }

  const title = options.titleMode === 'edit' && options.title
    ? options.title
    : `${original.title} (복사본)`;

  const description = options.descriptionMode === 'empty'
    ? null
    : original.summary;

  const mediaRepo = dataSource.getRepository(CmsMedia);
  const newId = uuidv4();
  const newAsset = mediaRepo.create({
    id: newId,
    organizationId: targetDashboardId,
    folderId: null,
    uploadedBy: userId,
    title,
    description,
    type: original.type || 'notice',
    mimeType: 'text/html',
    metadata: {
      sourceContentId: original.id,
      sourceType: 'hub_content',
      templateType: options.templateType,
      copiedAt: new Date().toISOString(),
      copiedBy: userId,
      originalImageUrl: original.imageUrl,
      originalLinkUrl: original.linkUrl,
    },
    isActive: false,
  });

  await mediaRepo.save(newAsset);

  return {
    success: true,
    dashboardAssetId: newId,
    status: 'draft',
    sourceType: 'hub_content',
    sourceId: sourceId,
  };
}

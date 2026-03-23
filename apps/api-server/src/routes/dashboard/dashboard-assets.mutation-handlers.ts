/**
 * Dashboard Assets — Mutation Handlers (PATCH/POST/DELETE)
 *
 * Extracted from dashboard-assets.routes.ts (WO-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-V1)
 * Contains: updateAsset, publishAsset, archiveAsset, deleteAsset
 */

import { Response } from 'express';
import type { DataSource } from 'typeorm';
import { CmsMedia } from '@o4o-apps/cms-core';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { deriveDashboardStatus } from './dashboard-assets.types.js';

/**
 * PATCH /api/v1/dashboard/assets/:id
 *
 * 대시보드 자산 제목/설명 편집
 */
export function createUpdateAssetHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { title, description, dashboardId } = req.body;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' } });
        return;
      }

      const mediaRepo = dataSource.getRepository(CmsMedia);
      const asset = await mediaRepo.findOne({
        where: { id, organizationId: dashboardId },
      });

      if (!asset || !asset.metadata?.sourceContentId) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '대시보드 자산을 찾을 수 없습니다.' } });
        return;
      }

      if (title !== undefined) asset.title = title;
      if (description !== undefined) asset.description = description;
      await mediaRepo.save(asset);

      res.json({
        success: true,
        data: {
          id: asset.id,
          title: asset.title,
          description: asset.description || null,
          status: deriveDashboardStatus(asset),
        },
      });
    } catch (error: any) {
      console.error('Failed to update dashboard asset:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/**
 * POST /api/v1/dashboard/assets/:id/publish
 *
 * 대시보드 자산 공개 (draft/archived → active)
 */
export function createPublishAssetHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { dashboardId } = req.body;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' } });
        return;
      }

      const mediaRepo = dataSource.getRepository(CmsMedia);
      const asset = await mediaRepo.findOne({
        where: { id, organizationId: dashboardId },
      });

      if (!asset || !asset.metadata?.sourceContentId) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '대시보드 자산을 찾을 수 없습니다.' } });
        return;
      }

      asset.isActive = true;
      asset.metadata = { ...asset.metadata, dashboardStatus: 'published' };
      await mediaRepo.save(asset);

      res.json({
        success: true,
        data: { id: asset.id, status: 'active' as const },
      });
    } catch (error: any) {
      console.error('Failed to publish dashboard asset:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/**
 * POST /api/v1/dashboard/assets/:id/archive
 *
 * 대시보드 자산 보관 (active/draft → archived)
 */
export function createArchiveAssetHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { dashboardId } = req.body;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' } });
        return;
      }

      const mediaRepo = dataSource.getRepository(CmsMedia);
      const asset = await mediaRepo.findOne({
        where: { id, organizationId: dashboardId },
      });

      if (!asset || !asset.metadata?.sourceContentId) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '대시보드 자산을 찾을 수 없습니다.' } });
        return;
      }

      asset.isActive = false;
      asset.metadata = { ...asset.metadata, dashboardStatus: 'archived' };
      await mediaRepo.save(asset);

      res.json({
        success: true,
        data: { id: asset.id, status: 'archived' as const },
      });
    } catch (error: any) {
      console.error('Failed to archive dashboard asset:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/**
 * DELETE /api/v1/dashboard/assets/:id
 *
 * 대시보드 자산 삭제 (소프트 삭제 = 보관 처리)
 */
export function createDeleteAssetHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { id } = req.params;
      const dashboardId = req.query.dashboardId as string;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' } });
        return;
      }

      const mediaRepo = dataSource.getRepository(CmsMedia);
      const asset = await mediaRepo.findOne({
        where: { id, organizationId: dashboardId },
      });

      if (!asset || !asset.metadata?.sourceContentId) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '대시보드 자산을 찾을 수 없습니다.' } });
        return;
      }

      // Soft delete: mark as archived
      asset.isActive = false;
      asset.metadata = { ...asset.metadata, dashboardStatus: 'archived' };
      await mediaRepo.save(asset);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete dashboard asset:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

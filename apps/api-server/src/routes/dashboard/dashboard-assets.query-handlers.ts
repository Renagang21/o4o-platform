/**
 * Dashboard Assets — Query Handlers (GET)
 *
 * Extracted from dashboard-assets.routes.ts (WO-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-V1)
 * Contains: listAssets, getCopiedSourceIds, getKpi, getSupplierSignal, getSellerSignal
 */

import { Response } from 'express';
import type { DataSource } from 'typeorm';
import { CmsMedia } from '@o4o-apps/cms-core';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { deriveDashboardStatus, computeExposure } from './dashboard-assets.types.js';

/**
 * GET /api/v1/dashboard/assets
 *
 * 내 대시보드 자산 목록 조회
 */
export function createListAssetsHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { dashboardId, sourceType, status, sort } = req.query;

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

      // Phase 4A: Use raw SQL for sort by views/recommend (JOIN with source content)
      const validSorts = ['recent', 'views', 'recommend'];
      const sortParam = validSorts.includes(sort as string) ? sort as string : 'recent';

      // Build WHERE clause
      let statusFilter = '';
      if (status === 'draft') {
        statusFilter = `AND m."isActive" = false AND (m.metadata->>'dashboardStatus' IS NULL OR m.metadata->>'dashboardStatus' != 'archived')`;
      } else if (status === 'active') {
        statusFilter = `AND m."isActive" = true`;
      } else if (status === 'archived') {
        statusFilter = `AND m."isActive" = false AND m.metadata->>'dashboardStatus' = 'archived'`;
      }

      // Build ORDER BY + JOINs based on sort
      let joinClause = '';
      let orderByClause = 'm."createdAt" DESC';
      let extraSelectFields = '';

      if (sortParam === 'views') {
        joinClause = `LEFT JOIN cms_contents c ON c.id::text = m.metadata->>'sourceContentId'`;
        extraSelectFields = `, COALESCE(c."viewCount", 0) AS "sourceViewCount"`;
        orderByClause = '"sourceViewCount" DESC, m."createdAt" DESC';
      } else if (sortParam === 'recommend') {
        joinClause = `LEFT JOIN (
          SELECT content_id, COUNT(*) AS rec_count
          FROM cms_content_recommendations
          GROUP BY content_id
        ) rc ON rc.content_id::text = m.metadata->>'sourceContentId'`;
        extraSelectFields = `, COALESCE(rc.rec_count, 0) AS "sourceRecommendCount"`;
        orderByClause = '"sourceRecommendCount" DESC, m."createdAt" DESC';
      }

      const rows = await dataSource.query(`
        SELECT m.id, m.title, m.description, m.type, m."isActive",
               m.metadata, m."createdAt"${extraSelectFields}
        FROM cms_media m
        ${joinClause}
        WHERE m."organizationId" = $1
          AND m.metadata->>'sourceContentId' IS NOT NULL
          ${statusFilter}
        ORDER BY ${orderByClause}
      `, [dashboardId]);

      // Batch-fetch viewCount + recommendCount for all source content IDs
      const sourceIds = rows
        .map((r: any) => r.metadata?.sourceContentId)
        .filter(Boolean);

      let viewCountMap: Record<string, number> = {};
      let recCountMap: Record<string, number> = {};

      if (sourceIds.length > 0) {
        try {
          const viewRows = await dataSource.query(`
            SELECT id::text AS id, "viewCount" FROM cms_contents WHERE id::text = ANY($1)
          `, [sourceIds]);
          for (const r of viewRows) {
            viewCountMap[r.id] = parseInt(r.viewCount || '0', 10);
          }
        } catch { /* graceful fallback */ }

        try {
          const recRows = await dataSource.query(`
            SELECT content_id::text AS "contentId", COUNT(*) AS "count"
            FROM cms_content_recommendations
            WHERE content_id::text = ANY($1)
            GROUP BY content_id
          `, [sourceIds]);
          for (const r of recRows) {
            recCountMap[r.contentId] = parseInt(r.count || '0', 10);
          }
        } catch { /* graceful fallback */ }
      }

      res.json({
        success: true,
        data: rows.map((asset: any) => {
          const srcId = asset.metadata?.sourceContentId;
          return {
            id: asset.id,
            title: asset.title,
            description: asset.description || null,
            type: asset.type,
            status: deriveDashboardStatus(asset),
            sourceContentId: srcId,
            copiedAt: asset.metadata?.copiedAt,
            createdAt: asset.createdAt,
            viewCount: srcId ? (viewCountMap[srcId] || 0) : 0,
            recommendCount: srcId ? (recCountMap[srcId] || 0) : 0,
            exposure: computeExposure(asset),
          };
        }),
      });
    } catch (error: any) {
      console.error('Failed to list dashboard assets:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  };
}

/**
 * GET /api/v1/dashboard/assets/copied-source-ids
 *
 * 사용자가 이미 복사한 원본 콘텐츠 ID 목록 (허브 목록에서 배치 체크용)
 */
export function createGetCopiedSourceIdsHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { dashboardId } = req.query;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' } });
        return;
      }

      const mediaRepo = dataSource.getRepository(CmsMedia);
      const assets = await mediaRepo.createQueryBuilder('media')
        .select("media.metadata->>'sourceContentId'", 'sourceContentId')
        .where('media."organizationId" = :dashboardId', { dashboardId })
        .andWhere("media.metadata->>'sourceContentId' IS NOT NULL")
        .andWhere("(media.metadata->>'dashboardStatus' IS NULL OR media.metadata->>'dashboardStatus' != 'archived')")
        .getRawMany();

      const sourceIds = assets
        .map((a: any) => a.sourceContentId)
        .filter(Boolean);

      res.json({ success: true, sourceIds });
    } catch (error: any) {
      console.error('Failed to get copied source IDs:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/**
 * GET /api/v1/dashboard/assets/kpi
 *
 * 대시보드 KPI 요약 (Phase 4A)
 */
export function createGetKpiHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { dashboardId } = req.query;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
        return;
      }

      if (!dashboardId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'dashboardId는 필수입니다.' } });
        return;
      }

      // 1. Total + Active counts
      const countRows = await dataSource.query(`
        SELECT
          COUNT(*) AS "totalAssets",
          COUNT(*) FILTER (WHERE m."isActive" = true) AS "activeAssets"
        FROM cms_media m
        WHERE m."organizationId" = $1
          AND m.metadata->>'sourceContentId' IS NOT NULL
          AND (m.metadata->>'dashboardStatus' IS NULL OR m.metadata->>'dashboardStatus' != 'archived')
      `, [dashboardId]);

      const totalAssets = parseInt(countRows[0]?.totalAssets || '0', 10);
      const activeAssets = parseInt(countRows[0]?.activeAssets || '0', 10);

      // 2. Recent 7-day views sum
      let recentViewsSum = 0;
      try {
        const viewRows = await dataSource.query(`
          SELECT COALESCE(SUM(c."viewCount"), 0) AS "viewsSum"
          FROM cms_media m
          INNER JOIN cms_contents c ON c.id::text = m.metadata->>'sourceContentId'
          WHERE m."organizationId" = $1
            AND m.metadata->>'sourceContentId' IS NOT NULL
            AND (m.metadata->>'dashboardStatus' IS NULL OR m.metadata->>'dashboardStatus' != 'archived')
            AND m."createdAt" >= NOW() - INTERVAL '7 days'
        `, [dashboardId]);
        recentViewsSum = parseInt(viewRows[0]?.viewsSum || '0', 10);
      } catch {
        // cms_contents may not have viewCount yet - graceful fallback
      }

      // 3. Top recommended asset
      let topRecommended: { id: string; title: string; recommendCount: number } | null = null;
      try {
        const recRows = await dataSource.query(`
          SELECT m.id, m.title, COUNT(r.id) AS "recommendCount"
          FROM cms_media m
          INNER JOIN cms_content_recommendations r ON r.content_id::text = m.metadata->>'sourceContentId'
          WHERE m."organizationId" = $1
            AND m.metadata->>'sourceContentId' IS NOT NULL
            AND (m.metadata->>'dashboardStatus' IS NULL OR m.metadata->>'dashboardStatus' != 'archived')
          GROUP BY m.id, m.title
          ORDER BY "recommendCount" DESC
          LIMIT 1
        `, [dashboardId]);

        if (recRows.length > 0) {
          topRecommended = {
            id: recRows[0].id,
            title: recRows[0].title,
            recommendCount: parseInt(recRows[0].recommendCount || '0', 10),
          };
        }
      } catch {
        // cms_content_recommendations may not exist yet - graceful fallback
      }

      res.json({
        success: true,
        data: {
          totalAssets,
          activeAssets,
          recentViewsSum,
          topRecommended,
        },
      });
    } catch (error: any) {
      console.error('Failed to get dashboard KPI:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/**
 * GET /api/v1/dashboard/assets/supplier-signal
 *
 * 판매자 행동 신호: 승인된 공급자 파트너십 존재 여부
 */
export function createGetSupplierSignalHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.json({ success: true, hasApprovedSupplier: false });
        return;
      }

      let hasApprovedSupplier = false;
      try {
        const rows = await dataSource.query(
          `SELECT EXISTS(
            SELECT 1 FROM product_approvals
            WHERE organization_id = $1
              AND approval_type = 'private'
              AND approval_status = 'approved'
            LIMIT 1
          ) AS "exists"`,
          [user.id],
        );
        hasApprovedSupplier = rows[0]?.exists === true;
      } catch {
        // Table may not exist — silent fallback
      }

      res.json({ success: true, hasApprovedSupplier });
    } catch {
      res.json({ success: true, hasApprovedSupplier: false });
    }
  };
}

/**
 * GET /api/v1/dashboard/assets/seller-signal
 *
 * 공급자 행동 신호: 승인된 판매자 파트너십 존재 여부
 */
export function createGetSellerSignalHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.json({ success: true, hasApprovedSeller: false });
        return;
      }

      let hasApprovedSeller = false;
      try {
        const rows = await dataSource.query(
          `SELECT EXISTS(
            SELECT 1 FROM product_approvals pa
            JOIN supplier_product_offers spo ON spo.id = pa.offer_id
            WHERE spo.supplier_id = $1
              AND pa.approval_type = 'private'
              AND pa.approval_status = 'approved'
            LIMIT 1
          ) AS "exists"`,
          [user.id],
        );
        hasApprovedSeller = rows[0]?.exists === true;
      } catch {
        // Table may not exist — silent fallback
      }

      res.json({ success: true, hasApprovedSeller });
    } catch {
      res.json({ success: true, hasApprovedSeller: false });
    }
  };
}

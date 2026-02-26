/**
 * Dashboard Assets Routes
 *
 * WO-APP-DATA-HUB-COPY-PHASE2A-V1
 * WO-APP-DATA-HUB-COPY-PHASE2B-V1: 복사 옵션 추가
 * WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1: 자산 관리 (편집/공개/보관/삭제) + 중복 체크
 * WO-APP-DASHBOARD-KPI-PHASE4A-V1: KPI 미니 대시보드 + 정렬 + 안내 메시지
 *
 * 통합 대시보드 자산 API
 * - 허브 콘텐츠를 내 대시보드 자산으로 복사
 * - 복사된 자산 관리 (편집, 공개, 보관, 삭제)
 * - Content / Signage Media / Signage Playlist 지원
 *
 * 핵심 원칙:
 * - Hub = Read Only
 * - My Dashboard = Write / Edit / Delete
 * - 원본 데이터는 절대 수정되지 않음
 *
 * 상태 모델:
 * - draft: isActive=false, dashboardStatus 미설정 또는 'draft'
 * - active(published): isActive=true, dashboardStatus='published'
 * - archived: isActive=false, dashboardStatus='archived'
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
 * Derive dashboard asset status from CmsMedia fields
 */
function deriveDashboardStatus(asset: { isActive: boolean; metadata?: any }): 'draft' | 'active' | 'archived' {
  if (asset.metadata?.dashboardStatus === 'archived') return 'archived';
  if (asset.isActive) return 'active';
  return 'draft';
}

/**
 * Phase 5: Compute exposure locations for a dashboard asset
 * 읽기 전용 계산 — DB 조회 없음
 */
type ExposureLocation = 'home' | 'signage' | 'promo';

function computeExposure(asset: { type: string; isActive: boolean; metadata?: any }): ExposureLocation[] {
  if (deriveDashboardStatus(asset) !== 'active') return [];

  const sourceType = asset.metadata?.sourceType;

  // 사이니지 자산 → 디지털 사이니지
  if (sourceType === 'signage_media' || sourceType === 'signage_playlist') {
    return ['signage'];
  }

  // 콘텐츠 자산 — type 기반 판단
  const contentType = asset.type;
  if (contentType === 'hero' || contentType === 'promo') {
    return ['home', 'promo'];
  }
  // notice, news, featured, event 등 → 매장 홈
  return ['home'];
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
  });

  /**
   * GET /api/v1/dashboard/assets/copied-source-ids
   *
   * 사용자가 이미 복사한 원본 콘텐츠 ID 목록 (허브 목록에서 배치 체크용)
   */
  router.get('/copied-source-ids', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
  });

  /**
   * GET /api/v1/dashboard/assets/kpi
   *
   * 대시보드 KPI 요약 (Phase 4A)
   * - totalAssets: 전체 자산 수
   * - activeAssets: 공개 자산 수
   * - recentViewsSum: 최근 7일 내 복사한 콘텐츠의 원본 조회수 합계
   * - topRecommended: 추천 많은 자산 (원본 기준)
   */
  router.get('/kpi', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

      // 2. Recent 7-day views sum (sum of original content viewCount for assets copied in last 7 days)
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

      // 3. Top recommended asset (highest recommendation count from source content)
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
  });

  /**
   * GET /api/v1/dashboard/assets/supplier-signal
   *
   * 판매자 행동 신호: 승인된 공급자 파트너십 존재 여부 (Boolean)
   * - 세션 당 1회 조회 용도
   * - 실패 시 조용히 false 반환
   */
  router.get('/supplier-signal', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.json({ success: true, hasApprovedSupplier: false });
        return;
      }

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
      let hasApprovedSupplier = false;
      try {
        const rows = await dataSource.query(
          `SELECT EXISTS(
            SELECT 1 FROM product_approvals
            WHERE organization_id = $1
              AND approval_type = 'PRIVATE'
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
  });

  /**
   * GET /api/v1/dashboard/assets/seller-signal
   *
   * 공급자 행동 신호: 승인된 판매자 파트너십 존재 여부 (Boolean)
   * - 세션 당 1회 조회 용도
   * - 실패 시 조용히 false 반환
   */
  router.get('/seller-signal', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.json({ success: true, hasApprovedSeller: false });
        return;
      }

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
      let hasApprovedSeller = false;
      try {
        const rows = await dataSource.query(
          `SELECT EXISTS(
            SELECT 1 FROM product_approvals pa
            JOIN neture_supplier_products nsp ON nsp.id = pa.product_id
            WHERE nsp.supplier_id = $1
              AND pa.approval_type = 'PRIVATE'
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
  });

  /**
   * PATCH /api/v1/dashboard/assets/:id
   *
   * 대시보드 자산 제목/설명 편집
   */
  router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
  });

  /**
   * POST /api/v1/dashboard/assets/:id/publish
   *
   * 대시보드 자산 공개 (draft/archived → active)
   */
  router.post('/:id/publish', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
  });

  /**
   * POST /api/v1/dashboard/assets/:id/archive
   *
   * 대시보드 자산 보관 (active/draft → archived)
   */
  router.post('/:id/archive', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
  });

  /**
   * DELETE /api/v1/dashboard/assets/:id
   *
   * 대시보드 자산 삭제 (소프트 삭제 = 보관 처리)
   */
  router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
    // New media is store-specific and starts as draft
    source: 'store',
    scope: 'store',
    status: 'draft',
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

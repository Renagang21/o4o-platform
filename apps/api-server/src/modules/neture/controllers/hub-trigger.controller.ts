/**
 * Neture Hub Trigger Controller
 *
 * WO-NETURE-HUB-ACTION-TRIGGER-EXPANSION-V1
 * WO-PLATFORM-ACTION-LOG-CORE-V1 (ActionLog integration)
 *
 * Hub QuickAction에서 호출하는 트리거 API.
 * 각 엔드포인트는 인증 + 공급자 소유권을 검증한 후 실행한다.
 *
 * 원칙:
 * - 공급자(supplier) 엔드포인트: getSupplierIdFromUser로 격리
 * - 관리자(admin) 엔드포인트: requireNetureScope('neture:admin')
 * - AI refresh: runAIInsight 재실행
 * - 모든 결과: { success, message, data? }
 */

import { Router } from 'express';
import type { Request, Response, RequestHandler, Router as ExpressRouter } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';
import { AppDataSource } from '../../../database/connection.js';
import type { ActionLogService } from '@o4o/action-log-core';
import type { NetureService } from '../neture.service.js';
import { ContentStatus } from '../entities/NetureSupplierContent.entity.js';
import { PartnershipStatus } from '../entities/NeturePartnershipRequest.entity.js';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    name?: string;
    role: string;
    supplierId?: string;
  };
};

interface TriggerDeps {
  dataSource: DataSource;
  requireAuth: RequestHandler;
  requireNetureScope: (scope: string) => RequestHandler;
  getSupplierIdFromUser: (req: AuthenticatedRequest) => Promise<string | null>;
  netureService: NetureService;
  actionLogService?: ActionLogService;
}

export function createNetureHubTriggerController(deps: TriggerDeps): ExpressRouter {
  const router: ExpressRouter = Router();
  const { requireAuth, requireNetureScope, getSupplierIdFromUser, netureService, actionLogService } = deps;

  // Helper: extract userId from req
  function getUserId(req: Request): string | undefined {
    return (req as AuthenticatedRequest).user?.id;
  }

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // ============================================================================
  // Supplier Triggers (authenticated supplier only)
  // ============================================================================

  /**
   * POST /hub/trigger/review-pending
   * 대기 중인 요청을 일괄 검토 — 현황 요약 반환
   */
  router.post('/review-pending', requireAuth, async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: ACTIVE 검증
      const supplier = await netureService.getSupplierByUserId(authReq.user!.id);
      if (!supplier || supplier.status !== 'ACTIVE') {
        res.status(403).json({ success: false, message: 'Supplier account is not active' });
        return;
      }

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const pendingRows = await AppDataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'PRIVATE' AND pa.approval_status = 'pending'`,
        [supplierId],
      );
      const count = pendingRows[0]?.cnt ?? 0;

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.review_pending', {
          organizationId: supplierId, durationMs: Date.now() - start,
          meta: { pendingCount: count },
        }).catch(() => {});
      }

      if (count === 0) {
        res.json({ success: true, message: '대기 중인 요청이 없습니다.' });
        return;
      }

      res.json({
        success: true,
        message: `대기 중인 요청 ${count}건이 있습니다. 요청 관리 페이지에서 검토하세요.`,
        data: { pendingCount: count },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.review_pending', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] review-pending error:', error);
      res.status(500).json({ success: false, message: '요청 검토 실패' });
    }
  });

  /**
   * POST /hub/trigger/auto-product
   * 비활성 상품 자동 활성화 제안
   */
  router.post('/auto-product', requireAuth, async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: ACTIVE 검증
      const supplier = await netureService.getSupplierByUserId(authReq.user!.id);
      if (!supplier || supplier.status !== 'ACTIVE') {
        res.status(403).json({ success: false, message: 'Supplier account is not active' });
        return;
      }

      const products = await netureService.getSupplierProducts(supplierId);
      const inactive = (products || []).filter((p) => !p.isActive);

      if (inactive.length === 0) {
        const userId = getUserId(req);
        if (userId) {
          actionLogService?.logSuccess('neture', userId, 'neture.trigger.auto_product', {
            organizationId: supplierId, durationMs: Date.now() - start,
            meta: { activated: 0 },
          }).catch(() => {});
        }
        res.json({ success: true, message: '모든 상품이 활성 상태입니다.' });
        return;
      }

      let activated = 0;
      for (const product of inactive.slice(0, 5)) {
        try {
          await netureService.updateSupplierOffer(product.id, supplierId, { isActive: true });
          activated++;
        } catch {
          // Skip individual failures
        }
      }

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.auto_product', {
          organizationId: supplierId, durationMs: Date.now() - start,
          meta: { activated, remaining: Math.max(0, inactive.length - 5) },
        }).catch(() => {});
      }

      res.json({
        success: true,
        message: `${activated}개 상품을 활성화했습니다.${inactive.length > 5 ? ` (${inactive.length - 5}개 추가 비활성 상품 존재)` : ''}`,
        data: { activated, remaining: Math.max(0, inactive.length - 5) },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.auto_product', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] auto-product error:', error);
      res.status(500).json({ success: false, message: '상품 자동 활성화 실패' });
    }
  });

  /**
   * POST /hub/trigger/copy-best-content
   * 우수 콘텐츠 복제 제안 — 발행 가능한 초안 목록 반환
   */
  router.post('/copy-best-content', requireAuth, async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: ACTIVE 검증
      const supplier = await netureService.getSupplierByUserId(authReq.user!.id);
      if (!supplier || supplier.status !== 'ACTIVE') {
        res.status(403).json({ success: false, message: 'Supplier account is not active' });
        return;
      }

      const contents = await netureService.getSupplierContents(supplierId, { status: ContentStatus.DRAFT });
      const drafts = contents || [];

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.copy_best_content', {
          organizationId: supplierId, durationMs: Date.now() - start,
          meta: { draftCount: drafts.length },
        }).catch(() => {});
      }

      if (drafts.length === 0) {
        res.json({
          success: true,
          message: '발행 대기 중인 초안이 없습니다. 새 콘텐츠를 작성해보세요.',
        });
        return;
      }

      res.json({
        success: true,
        message: `발행 가능한 초안 ${drafts.length}건이 있습니다. 콘텐츠 관리에서 발행하세요.`,
        data: { draftCount: drafts.length },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.copy_best_content', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] copy-best-content error:', error);
      res.status(500).json({ success: false, message: '콘텐츠 분석 실패' });
    }
  });

  /**
   * POST /hub/trigger/refresh-settlement
   * 정산 데이터 갱신 — 연결 서비스 현황 반환
   */
  router.post('/refresh-settlement', requireAuth, async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: ACTIVE 검증
      const supplier = await netureService.getSupplierByUserId(authReq.user!.id);
      if (!supplier || supplier.status !== 'ACTIVE') {
        res.status(403).json({ success: false, message: 'Supplier account is not active' });
        return;
      }

      const summary = await netureService.getSupplierOrdersSummary(supplierId);
      const services = summary?.services || [];

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.refresh_settlement', {
          organizationId: supplierId, durationMs: Date.now() - start,
          meta: { serviceCount: services.length },
        }).catch(() => {});
      }

      res.json({
        success: true,
        message: `${services.length}개 연결 서비스의 정산 현황을 갱신했습니다.`,
        data: {
          serviceCount: services.length,
          totalApprovedSellers: summary?.totalApprovedSellers || 0,
        },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.refresh_settlement', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] refresh-settlement error:', error);
      res.status(500).json({ success: false, message: '정산 갱신 실패' });
    }
  });

  /**
   * POST /hub/trigger/ai-refresh
   * AI 인사이트 재실행 — runAIInsight 호출
   */
  router.post('/ai-refresh', requireAuth, async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: ACTIVE 검증
      const supplier = await netureService.getSupplierByUserId(authReq.user!.id);
      if (!supplier || supplier.status !== 'ACTIVE') {
        res.status(403).json({ success: false, message: 'Supplier account is not active' });
        return;
      }

      const dashboardSummary = await netureService.getSupplierDashboardSummary(supplierId);
      const stats = dashboardSummary.stats;

      const topProductShare = stats.totalProducts > 0
        ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
        : 0;

      const { runAIInsight } = await import('@o4o/ai-core');

      const aiResult = await runAIInsight({
        service: 'neture',
        insightType: 'seller-growth',
        contextData: {
          requests: {
            total: stats.totalRequests,
            pending: stats.pendingRequests,
            approved: stats.approvedRequests,
            rejected: stats.rejectedRequests,
            recentApprovals: stats.recentApprovals,
            approvalRate: stats.totalRequests > 0
              ? Math.round((stats.approvedRequests / stats.totalRequests) * 100)
              : 0,
          },
          products: {
            total: stats.totalProducts,
            active: stats.activeProducts,
            activeRatio: topProductShare,
            skuCount: stats.totalProducts,
          },
          content: {
            total: stats.totalContents,
            published: stats.publishedContents,
            publishRate: stats.totalContents > 0
              ? Math.round((stats.publishedContents / stats.totalContents) * 100)
              : 0,
          },
          connectedServices: stats.connectedServices,
          recentActivityCount: dashboardSummary.recentActivity?.length ?? 0,
        },
        user: {
          id: authReq.user?.id || '',
          role: 'neture:supplier',
        },
      });

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.refresh_ai', {
          organizationId: supplierId, durationMs: Date.now() - start, source: 'ai',
        }).catch(() => {});
      }

      if (aiResult.success && aiResult.insight) {
        res.json({
          success: true,
          message: 'AI 인사이트를 갱신했습니다.',
          data: { insight: aiResult.insight },
        });
      } else {
        res.json({
          success: true,
          message: 'AI 분석을 완료했습니다 (규칙 기반 결과).',
        });
      }
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.refresh_ai', getErrorMessage(error), {
          durationMs: Date.now() - start, source: 'ai',
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] ai-refresh error:', error);
      res.status(500).json({ success: false, message: 'AI 인사이트 갱신 실패' });
    }
  });

  // ============================================================================
  // Admin Triggers (neture:admin scope required)
  // ============================================================================

  /**
   * POST /hub/trigger/approve-supplier
   * 관리자: 대기 중 공급자 요청 일괄 검토 현황
   */
  router.post('/approve-supplier', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const allPendingRows = await AppDataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM product_approvals pa
         WHERE pa.approval_type = 'PRIVATE' AND pa.approval_status = 'pending'`,
      );
      const count = allPendingRows[0]?.cnt ?? 0;

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.approve_supplier', {
          durationMs: Date.now() - start,
          meta: { pendingCount: count },
        }).catch(() => {});
      }

      if (count === 0) {
        res.json({ success: true, message: '대기 중인 공급자 요청이 없습니다.' });
        return;
      }

      res.json({
        success: true,
        message: `대기 중인 공급자 요청 ${count}건. 관리자 페이지에서 검토하세요.`,
        data: { pendingCount: count },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.approve_supplier', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] approve-supplier error:', error);
      res.status(500).json({ success: false, message: '공급자 요청 조회 실패' });
    }
  });

  /**
   * POST /hub/trigger/manage-partnership
   * 관리자: 제휴 요청 현황 확인
   */
  router.post('/manage-partnership', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const openRequests = await netureService.getPartnershipRequests({ status: PartnershipStatus.OPEN });
      const count = openRequests?.length ?? 0;

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.manage_partnership', {
          durationMs: Date.now() - start,
          meta: { openCount: count },
        }).catch(() => {});
      }

      if (count === 0) {
        res.json({ success: true, message: '대기 중인 제휴 요청이 없습니다.' });
        return;
      }

      res.json({
        success: true,
        message: `열린 제휴 요청 ${count}건. 파트너십 관리에서 확인하세요.`,
        data: { openCount: count },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.manage_partnership', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] manage-partnership error:', error);
      res.status(500).json({ success: false, message: '제휴 요청 조회 실패' });
    }
  });

  /**
   * POST /hub/trigger/audit-review
   * 관리자: 감사 로그 요약 생성
   */
  router.post('/audit-review', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      const adminSummary = await netureService.getAdminDashboardSummary();
      const stats = adminSummary?.stats;

      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logSuccess('neture', userId, 'neture.trigger.audit_review', {
          durationMs: Date.now() - start,
          meta: { totalSuppliers: stats?.totalSuppliers || 0 },
        }).catch(() => {});
      }

      res.json({
        success: true,
        message: `운영 현황: 공급자 ${stats?.totalSuppliers || 0}개, 활성 ${stats?.activeSuppliers || 0}개, 요청 ${stats?.totalRequests || 0}건.`,
        data: {
          totalSuppliers: stats?.totalSuppliers || 0,
          activeSuppliers: stats?.activeSuppliers || 0,
          totalRequests: stats?.totalRequests || 0,
          pendingRequests: stats?.pendingRequests || 0,
        },
      });
    } catch (error: unknown) {
      const userId = getUserId(req);
      if (userId) {
        actionLogService?.logFailure('neture', userId, 'neture.trigger.audit_review', getErrorMessage(error), {
          durationMs: Date.now() - start,
        }).catch(() => {});
      }
      logger.error('[Neture Hub Trigger] audit-review error:', error);
      res.status(500).json({ success: false, message: '감사 요약 생성 실패' });
    }
  });

  return router;
}

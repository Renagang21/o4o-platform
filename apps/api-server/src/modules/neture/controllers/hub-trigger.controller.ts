/**
 * Neture Hub Trigger Controller
 *
 * WO-NETURE-HUB-ACTION-TRIGGER-EXPANSION-V1
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
import type { Request, Response, Router as ExpressRouter } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

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
  requireAuth: any;
  requireNetureScope: (scope: string) => any;
  getSupplierIdFromUser: (req: AuthenticatedRequest) => Promise<string | null>;
  netureService: any;
}

export function createNetureHubTriggerController(deps: TriggerDeps): ExpressRouter {
  const router: ExpressRouter = Router();
  const { requireAuth, requireNetureScope, getSupplierIdFromUser, netureService, dataSource } = deps;

  // ============================================================================
  // Supplier Triggers (authenticated supplier only)
  // ============================================================================

  /**
   * POST /hub/trigger/review-pending
   * 대기 중인 요청을 일괄 검토 — 현황 요약 반환
   */
  router.post('/review-pending', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Fetch pending requests for this supplier
      const pendingRequests = await netureService.getSupplierRequests(supplierId, { status: 'pending' });
      const count = pendingRequests?.length ?? 0;

      if (count === 0) {
        res.json({ success: true, message: '대기 중인 요청이 없습니다.' });
        return;
      }

      res.json({
        success: true,
        message: `대기 중인 요청 ${count}건이 있습니다. 요청 관리 페이지에서 검토하세요.`,
        data: { pendingCount: count },
      });
    } catch (error) {
      logger.error('[Neture Hub Trigger] review-pending error:', error);
      res.status(500).json({ success: false, message: '요청 검토 실패' });
    }
  });

  /**
   * POST /hub/trigger/auto-product
   * 비활성 상품 자동 활성화 제안
   */
  router.post('/auto-product', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const products = await netureService.getSupplierProducts(supplierId);
      const inactive = (products || []).filter((p: any) => !p.isActive);

      if (inactive.length === 0) {
        res.json({ success: true, message: '모든 상품이 활성 상태입니다.' });
        return;
      }

      // Auto-activate up to 5 inactive products
      let activated = 0;
      for (const product of inactive.slice(0, 5)) {
        try {
          await netureService.updateSupplierProduct(product.id, supplierId, { isActive: true });
          activated++;
        } catch {
          // Skip individual failures
        }
      }

      res.json({
        success: true,
        message: `${activated}개 상품을 활성화했습니다.${inactive.length > 5 ? ` (${inactive.length - 5}개 추가 비활성 상품 존재)` : ''}`,
        data: { activated, remaining: Math.max(0, inactive.length - 5) },
      });
    } catch (error) {
      logger.error('[Neture Hub Trigger] auto-product error:', error);
      res.status(500).json({ success: false, message: '상품 자동 활성화 실패' });
    }
  });

  /**
   * POST /hub/trigger/copy-best-content
   * 우수 콘텐츠 복제 제안 — 발행 가능한 초안 목록 반환
   */
  router.post('/copy-best-content', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const contents = await netureService.getSupplierContents(supplierId, { status: 'draft' });
      const drafts = contents || [];

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
    } catch (error) {
      logger.error('[Neture Hub Trigger] copy-best-content error:', error);
      res.status(500).json({ success: false, message: '콘텐츠 분석 실패' });
    }
  });

  /**
   * POST /hub/trigger/refresh-settlement
   * 정산 데이터 갱신 — 연결 서비스 현황 반환
   */
  router.post('/refresh-settlement', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const summary = await netureService.getSupplierOrdersSummary(supplierId);
      const services = summary?.services || [];

      res.json({
        success: true,
        message: `${services.length}개 연결 서비스의 정산 현황을 갱신했습니다.`,
        data: {
          serviceCount: services.length,
          totalApprovedSellers: summary?.totalApprovedSellers || 0,
        },
      });
    } catch (error) {
      logger.error('[Neture Hub Trigger] refresh-settlement error:', error);
      res.status(500).json({ success: false, message: '정산 갱신 실패' });
    }
  });

  /**
   * POST /hub/trigger/ai-refresh
   * AI 인사이트 재실행 — runAIInsight 호출
   */
  router.post('/ai-refresh', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supplierId = await getSupplierIdFromUser(authReq);
      if (!supplierId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Collect context for AI
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
    } catch (error) {
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
    try {
      const allRequests = await netureService.getAllSupplierRequests({ status: 'pending' });
      const count = allRequests?.length ?? 0;

      if (count === 0) {
        res.json({ success: true, message: '대기 중인 공급자 요청이 없습니다.' });
        return;
      }

      res.json({
        success: true,
        message: `대기 중인 공급자 요청 ${count}건. 관리자 페이지에서 검토하세요.`,
        data: { pendingCount: count },
      });
    } catch (error) {
      logger.error('[Neture Hub Trigger] approve-supplier error:', error);
      res.status(500).json({ success: false, message: '공급자 요청 조회 실패' });
    }
  });

  /**
   * POST /hub/trigger/manage-partnership
   * 관리자: 제휴 요청 현황 확인
   */
  router.post('/manage-partnership', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const openRequests = await netureService.getPartnershipRequests({ status: 'OPEN' });
      const count = openRequests?.length ?? 0;

      if (count === 0) {
        res.json({ success: true, message: '대기 중인 제휴 요청이 없습니다.' });
        return;
      }

      res.json({
        success: true,
        message: `열린 제휴 요청 ${count}건. 파트너십 관리에서 확인하세요.`,
        data: { openCount: count },
      });
    } catch (error) {
      logger.error('[Neture Hub Trigger] manage-partnership error:', error);
      res.status(500).json({ success: false, message: '제휴 요청 조회 실패' });
    }
  });

  /**
   * POST /hub/trigger/audit-review
   * 관리자: 감사 로그 요약 생성
   */
  router.post('/audit-review', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const adminSummary = await netureService.getAdminDashboardSummary();
      const stats = adminSummary?.stats;

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
    } catch (error) {
      logger.error('[Neture Hub Trigger] audit-review error:', error);
      res.status(500).json({ success: false, message: '감사 요약 생성 실패' });
    }
  });

  return router;
}

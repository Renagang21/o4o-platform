/**
 * SupplierManagementController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/register, supplier/dashboard/*, supplier/profile/*
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

export function createSupplierManagementController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // POST /supplier/register
  router.post('/register', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }
      const { name, slug, contactEmail } = req.body || {};
      const result = await netureService.registerSupplier(userId, { name, slug, contactEmail });
      if (!result.success) {
        const statusMap: Record<string, number> = {
          MISSING_NAME: 400,
          INVALID_SLUG: 400,
          USER_ALREADY_HAS_SUPPLIER: 409,
          SLUG_ALREADY_EXISTS: 409,
        };
        return res.status(statusMap[result.error!] || 400).json({ success: false, error: { code: result.error, message: result.error } });
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error registering supplier:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register supplier' } });
    }
  });

  // GET /supplier/dashboard/summary
  router.get('/dashboard/summary', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const summary = await netureService.getSupplierDashboardSummary(supplierId);
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier dashboard summary:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard summary' });
    }
  });

  // GET /supplier/dashboard/ai-insight
  router.get('/dashboard/ai-insight', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
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
        user: { id: req.user?.id || '', role: 'neture:supplier' },
      });

      if (aiResult.success && aiResult.insight) {
        res.json({
          success: true,
          data: {
            insight: aiResult.insight,
            meta: {
              provider: aiResult.meta.provider,
              model: aiResult.meta.model,
              durationMs: aiResult.meta.durationMs,
              confidenceScore: aiResult.insight.confidenceScore,
            },
          },
        });
      } else {
        // Graceful fallback — rule-based
        const actions: string[] = [];
        if (stats.pendingRequests > 0) actions.push(`대기 중인 요청 ${stats.pendingRequests}건 확인 필요`);
        if (stats.activeProducts === 0) actions.push('활성 상품이 없습니다 — 상품 등록을 시작하세요');
        if (stats.publishedContents === 0) actions.push('발행된 콘텐츠가 없습니다 — 콘텐츠 작성을 권장합니다');
        if (stats.recentApprovals > 0) actions.push(`최근 7일 ${stats.recentApprovals}건 승인 — 상품 업데이트 확인`);
        const riskLevel = stats.rejectedRequests > stats.approvedRequests ? 'high'
          : stats.pendingRequests > 3 ? 'medium' : 'low';
        res.json({
          success: true,
          data: {
            insight: {
              summary: `총 요청 ${stats.totalRequests}건 (승인 ${stats.approvedRequests}건), 상품 ${stats.totalProducts}개, 콘텐츠 ${stats.totalContents}건.`,
              riskLevel,
              recommendedActions: actions,
              confidenceScore: 1.0,
            },
            meta: { provider: 'fallback', model: 'rule-based', durationMs: 0, confidenceScore: 1.0 },
          },
        });
      }
    } catch (error) {
      logger.error('[Neture API] Error generating AI insight:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to generate AI insight' });
    }
  });

  // GET /supplier/profile
  router.get('/profile', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const profile = await netureService.getSupplierProfile(supplierId);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier profile:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // GET /supplier/profile/completeness
  router.get('/profile/completeness', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await netureService.computeProfileCompleteness(supplierId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error fetching profile completeness:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /supplier/profile
  router.patch('/profile', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const {
        contactEmail, contactPhone, contactWebsite, contactKakao,
        contactEmailVisibility, contactPhoneVisibility,
        contactWebsiteVisibility, contactKakaoVisibility,
        // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
        businessNumber, representativeName, businessAddress,
        // WO-O4O-POSTAL-CODE-ADDRESS-V1
        businessZipCode, businessAddressDetail,
        managerName, managerPhone, businessType, taxEmail,
      } = req.body;
      const result = await netureService.updateSupplierProfile(supplierId, {
        contactEmail, contactPhone, contactWebsite, contactKakao,
        contactEmailVisibility, contactPhoneVisibility,
        contactWebsiteVisibility, contactKakaoVisibility,
        businessNumber, representativeName, businessAddress,
        businessZipCode, businessAddressDetail,
        managerName, managerPhone, businessType, taxEmail,
      });
      if (!result) {
        return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error updating supplier profile:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}

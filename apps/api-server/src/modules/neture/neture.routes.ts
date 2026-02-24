import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { NetureService } from './neture.service.js';
import { SupplierStatus, PartnershipStatus, SupplierRequestStatus, RecruitmentStatus } from './entities/index.js';
import logger from '../../utils/logger.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
import { AppDataSource } from '../../database/connection.js';
import { GlycopharmRepository } from '../../routes/glycopharm/repositories/glycopharm.repository.js';
import { NeturePartnerDashboardItem } from './entities/NeturePartnerDashboardItem.entity.js';
import { NeturePartnerDashboardItemContent } from './entities/NeturePartnerDashboardItemContent.entity.js';
import { NetureSupplierContent } from './entities/NetureSupplierContent.entity.js';
import { createNetureAssetSnapshotController } from './controllers/neture-asset-snapshot.controller.js';
import { createNetureHubTriggerController } from './controllers/hub-trigger.controller.js';
import { ActionLogService } from '@o4o/action-log-core';

const router: ExpressRouter = Router();
const netureService = new NetureService();

// Extended Request type with user info
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};

/**
 * GET /api/v1/neture/suppliers
 * Get all suppliers
 *
 * Query Parameters:
 * - category (optional): Filter by category
 * - status (optional): Filter by status (default: ACTIVE)
 */
router.get('/suppliers', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;

    const filters: { category?: string; status?: SupplierStatus } = {};

    if (category && typeof category === 'string') {
      filters.category = category;
    }

    if (status && typeof status === 'string') {
      filters.status = status as SupplierStatus;
    }

    const suppliers = await netureService.getSuppliers(filters);

    res.json({
      suppliers,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching suppliers:', error);
    res.status(500).json({
      error: 'Failed to fetch suppliers',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/neture/suppliers/:slug
 * Get supplier detail by slug
 */
router.get('/suppliers/:slug', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const viewerId = req.user?.id || null;

    const supplier = await netureService.getSupplierBySlug(slug, viewerId);

    if (!supplier) {
      return res.status(404).json({
        error: 'Supplier not found',
      });
    }

    res.json(supplier);
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier detail:', error);
    res.status(500).json({
      error: 'Failed to fetch supplier detail',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/neture/partnership/requests
 * Get all partnership requests
 *
 * Query Parameters:
 * - status (optional): Filter by status ('OPEN', 'MATCHED', 'CLOSED')
 */
router.get('/partnership/requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const filters: { status?: PartnershipStatus } = {};

    if (status && typeof status === 'string') {
      filters.status = status as PartnershipStatus;
    }

    const requests = await netureService.getPartnershipRequests(filters);

    res.json({
      requests,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching partnership requests:', error);
    res.status(500).json({
      error: 'Failed to fetch partnership requests',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/neture/partnership/requests/:id
 * Get partnership request detail by ID
 */
router.get('/partnership/requests/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await netureService.getPartnershipRequestById(id);

    if (!request) {
      return res.status(404).json({
        error: 'Partnership request not found',
      });
    }

    res.json(request);
  } catch (error) {
    logger.error('[Neture API] Error fetching partnership request detail:', error);
    res.status(500).json({
      error: 'Failed to fetch partnership request detail',
      details: (error as Error).message,
    });
  }
});

// ==================== Supplier Request API (WO-NETURE-SUPPLIER-REQUEST-API-V1) ====================

/**
 * Helper: Get supplier ID from authenticated user
 * First checks userId -> supplier mapping, then falls back to user.id
 */
async function getSupplierIdFromUser(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.user?.id) return null;

  // First try to find supplier linked to this user
  const linkedSupplierId = await netureService.getSupplierIdByUserId(req.user.id);
  if (linkedSupplierId) {
    return linkedSupplierId;
  }

  // Fallback: use user ID directly (for backwards compatibility)
  return req.user.id;
}

/**
 * GET /api/v1/neture/supplier/requests
 * Get supplier requests for authenticated supplier
 *
 * Query Parameters:
 * - status (optional): Filter by status ('pending', 'approved', 'rejected')
 * - serviceId (optional): Filter by service
 */
router.get('/supplier/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 인증 확인 및 supplierId 조회
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { status, serviceId } = req.query;

    const filters: { status?: SupplierRequestStatus; serviceId?: string } = {};

    if (status && typeof status === 'string') {
      filters.status = status as SupplierRequestStatus;
    }

    if (serviceId && typeof serviceId === 'string') {
      filters.serviceId = serviceId;
    }

    const requests = await netureService.getSupplierRequests(supplierId, filters);

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier requests:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier requests',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/requests/:id
 * Get supplier request detail
 */
router.get('/supplier/requests/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const request = await netureService.getSupplierRequestById(id, supplierId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Supplier request not found',
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier request detail:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier request detail',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests/:id/approve
 * Approve a supplier request
 *
 * State transition: pending → approved
 */
router.post('/supplier/requests/:id/approve', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const result = await netureService.approveSupplierRequest(id, supplierId);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error approving supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to approve supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests/:id/reject
 * Reject a supplier request
 *
 * State transition: pending → rejected
 *
 * Body:
 * - reason (optional): Rejection reason
 */
router.post('/supplier/requests/:id/reject', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const result = await netureService.rejectSupplierRequest(id, supplierId, reason);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error rejecting supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to reject supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests
 * Create a new supplier request (판매자 취급 요청)
 *
 * WO-S2S-FLOW-RECOVERY-PHASE1-V1:
 * - requireAuth 추가 (인증 필수)
 * - 인증된 사용자 정보를 sellerId/sellerName으로 자동 설정
 * - 중복 요청 시 409 Conflict
 */
router.post('/supplier/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // WO-NETURE-OWNERSHIP-GUARD-PHASE3-V1: Force authenticated user as seller (no client override)
    const sellerId = userId;
    const sellerName = data.sellerName || req.user?.name || '';

    // 필수 필드 검증
    if (!data.supplierId || !data.serviceId || !data.serviceName ||
        !data.productId || !data.productName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: supplierId, serviceId, serviceName, productId, productName',
      });
    }

    const result = await netureService.createSupplierRequest({
      ...data,
      sellerId,
      sellerName,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // WO-S2S-FLOW-RECOVERY-PHASE1-V1: 중복 요청 처리
    if ((error as Error).message === 'DUPLICATE_REQUEST') {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_REQUEST',
        message: '이미 동일한 취급 요청이 존재합니다.',
        existingStatus: (error as any).existingStatus,
      });
    }

    logger.error('[Neture API] Error creating supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create supplier request',
    });
  }
});

// ==================== Supplier Products (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2) ====================

/**
 * GET /api/v1/neture/supplier/products
 * Get products for authenticated supplier
 */
router.get('/supplier/products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const products = await netureService.getSupplierProducts(supplierId);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier products',
    });
  }
});

/**
 * PATCH /api/v1/neture/supplier/products/:id
 * Update product status (activation, applications toggle)
 */
router.patch('/supplier/products/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { isActive, acceptsApplications, distributionType, allowedSellerIds } = req.body;

    const result = await netureService.updateSupplierProduct(id, supplierId, {
      isActive,
      acceptsApplications,
      distributionType,
      allowedSellerIds,
    });

    if (!result.success) {
      const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error updating supplier product:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update supplier product',
    });
  }
});

// ==================== Order Summary (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4) ====================

/**
 * GET /api/v1/neture/supplier/orders/summary
 * Get service-wise order summary for supplier
 *
 * NOTE: Neture does NOT process orders.
 * This endpoint provides summary and links to navigate to each service.
 */
router.get('/supplier/orders/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const summary = await netureService.getSupplierOrdersSummary(supplierId);

    res.json({
      success: true,
      data: summary,
      notice: 'Neture는 주문을 직접 처리하지 않습니다. 각 서비스에서 주문을 관리하세요.',
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching order summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch order summary',
    });
  }
});

// ==================== Supplier Contents (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.1) ====================

/**
 * GET /api/v1/neture/supplier/contents
 * Get contents for authenticated supplier
 */
router.get('/supplier/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { type, status } = req.query;

    const filters: { type?: string; status?: string } = {};
    if (type && typeof type === 'string') filters.type = type;
    if (status && typeof status === 'string') filters.status = status;

    const contents = await netureService.getSupplierContents(supplierId, filters as any);

    res.json({
      success: true,
      data: contents,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier contents:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier contents',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/contents/:id
 * Get content detail
 */
router.get('/supplier/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const content = await netureService.getSupplierContentById(id, supplierId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Content not found',
      });
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier content',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/contents
 * Create new content
 */
router.post('/supplier/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { type, title, description, body, imageUrl, availableServices, availableAreas } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'type and title are required',
      });
    }

    const result = await netureService.createSupplierContent(supplierId, {
      type,
      title,
      description,
      body,
      imageUrl,
      availableServices,
      availableAreas,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('[Neture API] Error creating supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create supplier content',
    });
  }
});

/**
 * PATCH /api/v1/neture/supplier/contents/:id
 * Update content
 */
router.patch('/supplier/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const result = await netureService.updateSupplierContent(id, supplierId, updates);

    if (!result.success) {
      const statusCode = result.error === 'CONTENT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error updating supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update supplier content',
    });
  }
});

/**
 * DELETE /api/v1/neture/supplier/contents/:id
 * Delete content
 */
router.delete('/supplier/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const result = await netureService.deleteSupplierContent(id, supplierId);

    if (!result.success) {
      const statusCode = result.error === 'CONTENT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error deleting supplier content:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete supplier content',
    });
  }
});

// ==================== Dashboard Summary API ====================

/**
 * GET /api/v1/neture/supplier/dashboard/summary
 * Get dashboard summary for authenticated supplier
 */
router.get('/supplier/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const summary = await netureService.getSupplierDashboardSummary(supplierId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch dashboard summary',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/dashboard/ai-insight
 * AI-powered seller growth insight — aggregated supplier data → AI analysis.
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 Phase 4
 *
 * Principles:
 * - Only authenticated supplier's own data (ownership enforced)
 * - Aggregated stats only (no cross-supplier data)
 * - AI failure → graceful fallback
 */
router.get('/supplier/dashboard/ai-insight', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Collect aggregated context from existing service
    const dashboardSummary = await netureService.getSupplierDashboardSummary(supplierId);
    const stats = dashboardSummary.stats;

    // Product distribution analysis
    const topProductShare = stats.totalProducts > 0
      ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
      : 0;

    // Call AI Orchestrator
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
        id: req.user?.id || '',
        role: 'neture:supplier',
      },
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
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate AI insight',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/profile
 * Get supplier profile for authenticated supplier (contact info etc.)
 */
router.get('/supplier/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

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

/**
 * GET /api/v1/neture/supplier/profile/completeness
 * Get profile completeness indicator (internal, supplier-only)
 * WO-O4O-SUPPLIER-PROFILE-COMPLETENESS-V1
 */
router.get('/supplier/profile/completeness', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

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

/**
 * PATCH /api/v1/neture/supplier/profile
 * Update supplier contact info
 */
router.patch('/supplier/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const {
      contactEmail, contactPhone, contactWebsite, contactKakao,
      contactEmailVisibility, contactPhoneVisibility,
      contactWebsiteVisibility, contactKakaoVisibility,
    } = req.body;

    const result = await netureService.updateSupplierProfile(supplierId, {
      contactEmail,
      contactPhone,
      contactWebsite,
      contactKakao,
      contactEmailVisibility,
      contactPhoneVisibility,
      contactWebsiteVisibility,
      contactKakaoVisibility,
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

/**
 * GET /api/v1/neture/operator/supply-products
 * 운영자용 공급 가능 제품 목록 + 공급요청 상태
 * WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1
 */
router.get('/operator/supply-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const data = await netureService.getOperatorSupplyProducts(userId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching operator supply products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch operator supply products',
    });
  }
});

/**
 * GET /api/v1/neture/admin/dashboard/summary
 * Get admin/operator dashboard summary (requires admin role)
 *
 * WO-P1-SERVICE-ROLE-PREFIX-ROLLING-IMPLEMENTATION-V1 (Phase 3: Neture)
 * Security Fix: Changed from requireAuth to requireAdmin
 * - Enforces platform:admin or platform:super_admin (via Phase 2 middleware update)
 */
router.get('/admin/dashboard/summary', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await netureService.getAdminDashboardSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch admin dashboard summary',
    });
  }
});

/**
 * GET /api/v1/neture/partner/recruiting-products
 * Get products marked for partner recruiting (public, no auth)
 * WO-PARTNER-RECRUIT-PHASE1-V1
 */
router.get('/partner/recruiting-products', async (_req: Request, res: Response) => {
  try {
    const glycopharmRepo = new GlycopharmRepository(AppDataSource);
    const products = await glycopharmRepo.findPartnerRecruitingProducts();

    const data = products.map((p) => ({
      id: p.id,
      pharmacy_id: p.pharmacy_id,
      pharmacy_name: p.pharmacy?.name,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: Number(p.price),
      sale_price: p.sale_price ? Number(p.sale_price) : undefined,
      stock_quantity: p.stock_quantity,
      status: p.status,
      is_featured: p.is_featured,
      is_partner_recruiting: p.is_partner_recruiting,
      created_at: p.created_at.toISOString(),
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching recruiting products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch recruiting products',
    });
  }
});

// ==================== Partner Recruitment API (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

/**
 * GET /api/v1/neture/partner/recruitments
 * 파트너 모집 목록 조회 (public)
 */
router.get('/partner/recruitments', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filters: { status?: RecruitmentStatus } = {};
    if (status && typeof status === 'string') {
      filters.status = status as RecruitmentStatus;
    }

    const data = await netureService.getPartnerRecruitments(filters);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner recruitments:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch partner recruitments' });
  }
});

/**
 * POST /api/v1/neture/partner/applications
 * 파트너 신청 (requires auth)
 */
router.post('/partner/applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { recruitmentId } = req.body;
    if (!recruitmentId) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'recruitmentId is required' });
    }

    const partnerName = req.user?.name || '';
    const result = await netureService.createPartnerApplication(recruitmentId, userId, partnerName);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'RECRUITMENT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '모집 공고를 찾을 수 없습니다.' });
    }
    if (msg === 'RECRUITMENT_CLOSED') {
      return res.status(400).json({ success: false, error: 'RECRUITMENT_CLOSED', message: '마감된 모집입니다.' });
    }
    if (msg === 'DUPLICATE_APPLICATION') {
      return res.status(409).json({ success: false, error: 'DUPLICATE_APPLICATION', message: '이미 신청한 모집입니다.' });
    }
    logger.error('[Neture API] Error creating partner application:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create application' });
  }
});

/**
 * POST /api/v1/neture/partner/applications/:id/approve
 * 파트너 신청 승인 (모집 주체 판매자)
 */
router.post('/partner/applications/:id/approve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await netureService.approvePartnerApplication(id, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
    }
    if (msg === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
    }
    if (msg === 'NOT_RECRUITMENT_OWNER') {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 승인할 수 있습니다.' });
    }
    if (msg === 'ACTIVE_CONTRACT_EXISTS') {
      return res.status(409).json({ success: false, error: 'CONFLICT', message: '이미 활성 계약이 존재합니다.' });
    }
    logger.error('[Neture API] Error approving partner application:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to approve application' });
  }
});

/**
 * POST /api/v1/neture/partner/applications/:id/reject
 * 파트너 신청 거절 (모집 주체 판매자)
 */
router.post('/partner/applications/:id/reject', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const result = await netureService.rejectPartnerApplication(id, userId, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'APPLICATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '신청을 찾을 수 없습니다.' });
    }
    if (msg === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '승인/거절 가능한 상태가 아닙니다.' });
    }
    if (msg === 'NOT_RECRUITMENT_OWNER') {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: '모집 주체만 거절할 수 있습니다.' });
    }
    logger.error('[Neture API] Error rejecting partner application:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reject application' });
  }
});

/**
 * POST /api/v1/neture/partner/dashboard/items
 * Add a product to partner's dashboard
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 */
router.post('/partner/dashboard/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { productId, serviceId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'productId is required' });
    }

    const repo = AppDataSource.getRepository(NeturePartnerDashboardItem);

    // Check duplicate
    const existing = await repo.findOne({
      where: { partnerUserId: userId, productId },
    });

    if (existing) {
      return res.json({ success: true, already_exists: true, data: existing });
    }

    const item = repo.create({
      partnerUserId: userId,
      productId,
      serviceId: serviceId || 'glycopharm',
      status: 'active',
    });

    const saved = await repo.save(item);

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error('[Neture API] Error adding partner dashboard item:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to add dashboard item' });
  }
});

/**
 * GET /api/v1/neture/partner/dashboard/items
 * Get partner's dashboard items with product details
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 */
router.get('/partner/dashboard/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const repo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const items = await repo.find({
      where: { partnerUserId: userId },
      order: { createdAt: 'DESC' },
    });

    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Batch-fetch product details
    const productIds = items.map((item) => item.productId);
    const glycopharmRepo = new GlycopharmRepository(AppDataSource);
    const productMap = new Map<string, any>();

    for (const id of productIds) {
      const product = await glycopharmRepo.findProductById(id);
      if (product) {
        productMap.set(id, product);
      }
    }

    // Batch-fetch content link counts (WO-PARTNER-CONTENT-LINK-PHASE1-V1)
    const itemIds = items.map((item) => item.id);
    const contentCountMap = new Map<string, number>();
    if (itemIds.length > 0) {
      const countRows: Array<{ dashboard_item_id: string; cnt: string }> = await AppDataSource.query(
        `SELECT dashboard_item_id, COUNT(*)::text as cnt FROM neture_partner_dashboard_item_contents WHERE dashboard_item_id = ANY($1) GROUP BY dashboard_item_id`,
        [itemIds],
      );
      for (const row of countRows) {
        contentCountMap.set(row.dashboard_item_id, parseInt(row.cnt, 10));
      }
    }

    // Batch-fetch primary content info (WO-PARTNER-CONTENT-PRESENTATION-PHASE3-V1)
    const primaryContentMap = new Map<string, { contentId: string; contentSource: string; title: string; type: string }>();
    if (itemIds.length > 0) {
      const primaryLinks: Array<{ dashboard_item_id: string; content_id: string; content_source: string }> = await AppDataSource.query(
        `SELECT dashboard_item_id, content_id, content_source FROM neture_partner_dashboard_item_contents WHERE dashboard_item_id = ANY($1) AND is_primary = true`,
        [itemIds],
      );

      // Fetch titles for primary contents
      const cmsPrimaryIds = primaryLinks.filter((l) => l.content_source === 'cms').map((l) => l.content_id);
      const supplierPrimaryIds = primaryLinks.filter((l) => l.content_source === 'supplier').map((l) => l.content_id);
      const titleMap = new Map<string, { title: string; type: string }>();

      if (cmsPrimaryIds.length > 0) {
        const cmsRows: Array<{ id: string; title: string; type: string }> = await AppDataSource.query(
          `SELECT id, title, type FROM cms_contents WHERE id = ANY($1)`,
          [cmsPrimaryIds],
        );
        for (const row of cmsRows) {
          titleMap.set(`cms:${row.id}`, { title: row.title, type: row.type });
        }
      }

      if (supplierPrimaryIds.length > 0) {
        const supplierRepo = AppDataSource.getRepository(NetureSupplierContent);
        for (const sid of supplierPrimaryIds) {
          const sc = await supplierRepo.findOne({ where: { id: sid } });
          if (sc) {
            titleMap.set(`supplier:${sc.id}`, { title: sc.title, type: sc.type });
          }
        }
      }

      for (const link of primaryLinks) {
        const detail = titleMap.get(`${link.content_source}:${link.content_id}`);
        if (detail) {
          primaryContentMap.set(link.dashboard_item_id, {
            contentId: link.content_id,
            contentSource: link.content_source,
            title: detail.title,
            type: detail.type,
          });
        }
      }
    }

    const data = items.map((item) => {
      const product = productMap.get(item.productId);
      const primaryContent = primaryContentMap.get(item.id) || null;
      return {
        id: item.id,
        productId: item.productId,
        productName: product?.name || '(삭제된 제품)',
        category: product?.category || 'other',
        price: product ? Number(product.price) : 0,
        pharmacyName: product?.pharmacy?.name,
        serviceId: item.serviceId,
        status: item.status,
        contentCount: contentCountMap.get(item.id) || 0,
        primaryContent,
        createdAt: item.createdAt.toISOString(),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner dashboard items:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard items' });
  }
});

/**
 * PATCH /api/v1/neture/partner/dashboard/items/:id
 * Toggle status of a partner dashboard item
 * WO-PARTNER-DASHBOARD-UX-PHASE2-V1
 */
router.patch('/partner/dashboard/items/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'status must be "active" or "inactive"' });
    }

    const repo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await repo.findOne({ where: { id, partnerUserId: userId } });

    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    item.status = status;
    const updated = await repo.save(item);

    res.json({ success: true, data: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() } });
  } catch (error) {
    logger.error('[Neture API] Error updating partner dashboard item:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update dashboard item' });
  }
});

/**
 * GET /api/v1/neture/partner/contents
 * Browse available content (CMS + supplier) for partners
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.get('/partner/contents', requireAuth, async (req: Request, res: Response) => {
  try {
    const source = (req.query.source as string) || 'all';

    const results: Array<{ id: string; title: string; summary: string | null; type: string; source: string; imageUrl: string | null; createdAt: string }> = [];

    // CMS contents
    if (source === 'all' || source === 'cms') {
      const cmsRows = await AppDataSource.query(
        `SELECT id, title, summary, type, image_url, created_at
         FROM cms_contents
         WHERE status = 'published'
           AND (service_key IN ('neture', 'glycopharm') OR service_key IS NULL)
         ORDER BY created_at DESC
         LIMIT 100`,
      );
      for (const row of cmsRows) {
        results.push({
          id: row.id,
          title: row.title,
          summary: row.summary,
          type: row.type,
          source: 'cms',
          imageUrl: row.image_url,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        });
      }
    }

    // Supplier contents
    if (source === 'all' || source === 'supplier') {
      const supplierRepo = AppDataSource.getRepository(NetureSupplierContent);
      const supplierContents = await supplierRepo.find({
        where: { status: 'published' as any },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      for (const sc of supplierContents) {
        results.push({
          id: sc.id,
          title: sc.title,
          summary: sc.description || null,
          type: sc.type,
          source: 'supplier',
          imageUrl: sc.imageUrl || null,
          createdAt: sc.createdAt instanceof Date ? sc.createdAt.toISOString() : String(sc.createdAt),
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('[Neture API] Error browsing partner contents:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to browse contents' });
  }
});

/**
 * POST /api/v1/neture/partner/dashboard/items/:itemId/contents
 * Link content to a dashboard item
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.post('/partner/dashboard/items/:itemId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId } = req.params;
    const { contentId, contentSource } = req.body;

    if (!contentId || !contentSource || !['cms', 'supplier'].includes(contentSource)) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'contentId and contentSource (cms|supplier) are required' });
    }

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);

    // Duplicate check
    const existing = await linkRepo.findOne({
      where: { dashboardItemId: itemId, contentId, contentSource },
    });
    if (existing) {
      return res.json({ success: true, already_linked: true, data: existing });
    }

    const link = linkRepo.create({ dashboardItemId: itemId, contentId, contentSource });
    const saved = await linkRepo.save(link);

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error('[Neture API] Error linking content:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to link content' });
  }
});

/**
 * DELETE /api/v1/neture/partner/dashboard/items/:itemId/contents/:linkId
 * Unlink content from a dashboard item
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.delete('/partner/dashboard/items/:itemId/contents/:linkId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId, linkId } = req.params;

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);
    const link = await linkRepo.findOne({ where: { id: linkId, dashboardItemId: itemId } });
    if (!link) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content link not found' });
    }

    await linkRepo.remove(link);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Neture API] Error unlinking content:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to unlink content' });
  }
});

/**
 * GET /api/v1/neture/partner/dashboard/items/:itemId/contents
 * Get linked contents for a dashboard item
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */
router.get('/partner/dashboard/items/:itemId/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId } = req.params;

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);
    const links = await linkRepo.find({
      where: { dashboardItemId: itemId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    if (links.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Batch-fetch content details
    const cmsIds = links.filter((l) => l.contentSource === 'cms').map((l) => l.contentId);
    const supplierIds = links.filter((l) => l.contentSource === 'supplier').map((l) => l.contentId);

    const contentMap = new Map<string, { title: string; summary: string | null; type: string; imageUrl: string | null; createdAt: string }>();

    if (cmsIds.length > 0) {
      const cmsRows = await AppDataSource.query(
        `SELECT id, title, summary, type, image_url, created_at FROM cms_contents WHERE id = ANY($1)`,
        [cmsIds],
      );
      for (const row of cmsRows) {
        contentMap.set(`cms:${row.id}`, {
          title: row.title,
          summary: row.summary,
          type: row.type,
          imageUrl: row.image_url,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        });
      }
    }

    if (supplierIds.length > 0) {
      const supplierRepo = AppDataSource.getRepository(NetureSupplierContent);
      for (const sid of supplierIds) {
        const sc = await supplierRepo.findOne({ where: { id: sid } });
        if (sc) {
          contentMap.set(`supplier:${sc.id}`, {
            title: sc.title,
            summary: sc.description || null,
            type: sc.type,
            imageUrl: sc.imageUrl || null,
            createdAt: sc.createdAt instanceof Date ? sc.createdAt.toISOString() : String(sc.createdAt),
          });
        }
      }
    }

    const data = links.map((link) => {
      const detail = contentMap.get(`${link.contentSource}:${link.contentId}`);
      return {
        linkId: link.id,
        contentId: link.contentId,
        contentSource: link.contentSource,
        title: detail?.title || '(삭제된 콘텐츠)',
        type: detail?.type || 'unknown',
        summary: detail?.summary || null,
        imageUrl: detail?.imageUrl || null,
        sortOrder: link.sortOrder,
        isPrimary: link.isPrimary,
        createdAt: detail?.createdAt || link.createdAt.toISOString(),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching linked contents:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch linked contents' });
  }
});

/**
 * PATCH /api/v1/neture/partner/dashboard/items/:itemId/contents/reorder
 * Reorder linked contents
 * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
 */
router.patch('/partner/dashboard/items/:itemId/contents/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'orderedIds array is required' });
    }

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);
    const links = await linkRepo.find({ where: { dashboardItemId: itemId } });
    const linkMap = new Map(links.map((l) => [l.id, l]));

    // Validate all IDs belong to this item
    for (const id of orderedIds) {
      if (!linkMap.has(id)) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: `Link ID ${id} not found for this item` });
      }
    }

    // Update sort_order
    for (let i = 0; i < orderedIds.length; i++) {
      const link = linkMap.get(orderedIds[i])!;
      link.sortOrder = i;
    }
    await linkRepo.save(links);

    res.json({ success: true });
  } catch (error) {
    logger.error('[Neture API] Error reordering contents:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to reorder contents' });
  }
});

/**
 * PATCH /api/v1/neture/partner/dashboard/items/:itemId/contents/:linkId/primary
 * Set a content link as primary
 * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
 */
router.patch('/partner/dashboard/items/:itemId/contents/:linkId/primary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { itemId, linkId } = req.params;

    // Ownership check
    const itemRepo = AppDataSource.getRepository(NeturePartnerDashboardItem);
    const item = await itemRepo.findOne({ where: { id: itemId, partnerUserId: userId } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Dashboard item not found' });
    }

    const linkRepo = AppDataSource.getRepository(NeturePartnerDashboardItemContent);

    // Unset all primary for this item
    await linkRepo.update({ dashboardItemId: itemId }, { isPrimary: false });

    // Set target as primary
    const link = await linkRepo.findOne({ where: { id: linkId, dashboardItemId: itemId } });
    if (!link) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Content link not found' });
    }

    link.isPrimary = true;
    await linkRepo.save(link);

    res.json({ success: true, data: { linkId: link.id, isPrimary: true } });
  } catch (error) {
    logger.error('[Neture API] Error setting primary content:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to set primary content' });
  }
});

/**
 * GET /api/v1/neture/partner/dashboard/summary
 * Get partner dashboard summary
 */
router.get('/partner/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const summary = await netureService.getPartnerDashboardSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch partner dashboard summary',
    });
  }
});

// ==================== Request Events (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.2) ====================

/**
 * GET /api/v1/neture/supplier/requests/:id/events
 * Get event logs for a specific request
 */
router.get('/supplier/requests/:id/events', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const result = await netureService.getRequestEvents(id, supplierId);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error fetching request events:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch request events',
    });
  }
});

/**
 * GET /api/v1/neture/supplier/events
 * Get all events for the supplier
 *
 * Query Parameters:
 * - eventType (optional): Filter by event type ('approved', 'rejected')
 * - limit (optional): Limit number of results
 */
router.get('/supplier/events', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { eventType, limit } = req.query;

    const filters: { eventType?: string; limit?: number } = {};
    if (eventType && typeof eventType === 'string') filters.eventType = eventType as any;
    if (limit && typeof limit === 'string') filters.limit = parseInt(limit, 10);

    const events = await netureService.getSupplierEvents(supplierId, filters as any);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('[Neture API] Error fetching supplier events:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch supplier events',
    });
  }
});

// ==================== Seller Product Query (WO-S2S-FLOW-RECOVERY-PHASE3-V1 T1) ====================

/**
 * GET /api/v1/neture/seller/my-products
 * 판매자의 승인된 취급 상품 목록 조회
 */
router.get('/seller/my-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const result = await netureService.getSellerApprovedProducts(sellerId);
    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error fetching seller approved products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch seller approved products',
    });
  }
});

// ==================== Seller Available Supply Products (WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1) ====================

/**
 * GET /api/v1/neture/seller/available-supply-products
 * 판매자용 공급 가능 제품 목록 (PUBLIC + PRIVATE 중 본인 배정)
 */
router.get('/seller/available-supply-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const data = await netureService.getSellerAvailableSupplyProducts(sellerId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[Neture API] Error fetching seller available supply products:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch seller available supply products',
    });
  }
});

// ==================== Admin Request Management (WO-S2S-FLOW-RECOVERY-PHASE2-V1 T2) ====================

/**
 * GET /api/v1/neture/admin/requests
 * Admin: 전체 취급 요청 목록 조회 (cross-supplier)
 */
router.get('/admin/requests', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, supplierId, serviceId } = req.query;
    const filters: { status?: string; supplierId?: string; serviceId?: string } = {};
    if (status && typeof status === 'string') filters.status = status;
    if (supplierId && typeof supplierId === 'string') filters.supplierId = supplierId;
    if (serviceId && typeof serviceId === 'string') filters.serviceId = serviceId;

    const requests = await netureService.getAllSupplierRequests(filters);

    res.json({ success: true, data: requests });
  } catch (error) {
    logger.error('[Neture API] Error fetching admin requests:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch requests',
    });
  }
});

/**
 * POST /api/v1/neture/admin/requests/:id/approve
 * Admin override: 소유권 무관 승인
 */
router.post('/admin/requests/:id/approve', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id || '';
    const actorName = req.user?.name || 'Admin';

    const result = await netureService.approveSupplierRequestAsAdmin(id, actorId, actorName);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error admin-approving supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to approve supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/admin/requests/:id/reject
 * Admin override: 소유권 무관 거절
 */
router.post('/admin/requests/:id/reject', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const actorId = req.user?.id || '';
    const actorName = req.user?.name || 'Admin';

    const result = await netureService.rejectSupplierRequestAsAdmin(id, actorId, reason, actorName);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error admin-rejecting supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to reject supplier request',
    });
  }
});

// ==================== Relation State Extension (WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1) ====================

/**
 * POST /api/v1/neture/supplier/requests/:id/suspend
 * 공급 일시 중단 (approved → suspended)
 */
router.post('/supplier/requests/:id/suspend', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { note } = req.body;

    const result = await netureService.suspendSupplierRequest(id, supplierId, note);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error suspending supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to suspend supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests/:id/reactivate
 * 공급 재활성화 (suspended → approved)
 */
router.post('/supplier/requests/:id/reactivate', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { note } = req.body;

    const result = await netureService.reactivateSupplierRequest(id, supplierId, note);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error reactivating supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to reactivate supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/supplier/requests/:id/revoke
 * 공급 종료 (approved|suspended → revoked)
 */
router.post('/supplier/requests/:id/revoke', requireRole('supplier'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = await getSupplierIdFromUser(req);

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { note } = req.body;

    const result = await netureService.revokeSupplierRequest(id, supplierId, note);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error revoking supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to revoke supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/admin/requests/:id/suspend
 * Admin override: 소유권 무관 일시 중단
 */
router.post('/admin/requests/:id/suspend', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const actorId = req.user?.id || '';
    const actorName = req.user?.name || 'Admin';

    const result = await netureService.suspendSupplierRequestAsAdmin(id, actorId, note, actorName);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error admin-suspending supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to suspend supplier request',
    });
  }
});

/**
 * POST /api/v1/neture/admin/requests/:id/revoke
 * Admin override: 소유권 무관 공급 종료
 */
router.post('/admin/requests/:id/revoke', requireAuth, requireNetureScope('neture:admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const actorId = req.user?.id || '';
    const actorName = req.user?.name || 'Admin';

    const result = await netureService.revokeSupplierRequestAsAdmin(id, actorId, note, actorName);

    if (!result.success) {
      const statusCode = result.error === 'REQUEST_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('[Neture API] Error admin-revoking supplier request:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to revoke supplier request',
    });
  }
});

// ==================== Seller-Partner Contracts (WO-NETURE-SELLER-PARTNER-CONTRACT-V1) ====================

/**
 * GET /api/v1/neture/seller/contracts
 * Seller 계약 목록 조회
 * Query: ?status=active|terminated|expired
 */
router.get('/seller/contracts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = await getSupplierIdFromUser(req);
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { status } = req.query;
    const contracts = await netureService.getSellerContracts(sellerId, status as string | undefined);
    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error('[Neture API] Error fetching seller contracts:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
  }
});

/**
 * POST /api/v1/neture/seller/contracts/:id/terminate
 * Seller가 계약 해지
 */
router.post('/seller/contracts/:id/terminate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = await getSupplierIdFromUser(req);
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await netureService.terminateContract(id, sellerId, 'seller');
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
    }
    if (msg === 'CONTRACT_NOT_ACTIVE') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
    }
    logger.error('[Neture API] Error terminating contract (seller):', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
  }
});

/**
 * POST /api/v1/neture/seller/contracts/:id/commission
 * 수수료 변경 (기존 계약 terminated → 신규 계약 생성)
 */
router.post('/seller/contracts/:id/commission', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = await getSupplierIdFromUser(req);
    if (!sellerId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const { commissionRate } = req.body;
    if (commissionRate === undefined || typeof commissionRate !== 'number') {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'commissionRate (number) is required' });
    }

    const result = await netureService.updateCommissionRate(id, commissionRate, sellerId);
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'ACTIVE_CONTRACT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '활성 계약을 찾을 수 없습니다.' });
    }
    logger.error('[Neture API] Error updating commission rate:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update commission rate' });
  }
});

/**
 * GET /api/v1/neture/partner/contracts
 * Partner 계약 목록 조회
 * Query: ?status=active|terminated|expired
 */
router.get('/partner/contracts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { status } = req.query;
    const contracts = await netureService.getPartnerContracts(userId, status as string | undefined);
    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error('[Neture API] Error fetching partner contracts:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
  }
});

/**
 * POST /api/v1/neture/partner/contracts/:id/terminate
 * Partner가 계약 해지
 */
router.post('/partner/contracts/:id/terminate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { id } = req.params;
    const result = await netureService.terminateContract(id, userId, 'partner');
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '계약을 찾을 수 없습니다.' });
    }
    if (msg === 'CONTRACT_NOT_ACTIVE') {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: '활성 상태의 계약만 해지할 수 있습니다.' });
    }
    logger.error('[Neture API] Error terminating contract (partner):', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to terminate contract' });
  }
});

// Hub Trigger routes (WO-NETURE-HUB-ACTION-TRIGGER-EXPANSION-V1)
const netureActionLogService = new ActionLogService(AppDataSource);
const hubTriggerController = createNetureHubTriggerController({
  dataSource: AppDataSource,
  requireAuth,
  requireNetureScope,
  getSupplierIdFromUser,
  netureService,
  actionLogService: netureActionLogService,
});
router.use('/hub/trigger', hubTriggerController);

// Asset Snapshot routes (WO-O4O-ASSET-COPY-NETURE-PILOT-V1)
router.use('/assets', createNetureAssetSnapshotController(AppDataSource, requireAuth as any));

export default router;

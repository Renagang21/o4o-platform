/**
 * SellerController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes:
 *   Seller Products:
 *     GET  /my-products                          (seller approved products)
 *     GET  /available-supply-products             (supply catalogue with approval state)
 *   Service-Product Applications:
 *     POST /service-products/:productId/apply     (apply for SERVICE product)
 *     GET  /service-applications                  (list seller service applications)
 *   Dashboard:
 *     GET  /dashboard/ai-insight                  (seller dashboard AI insight)
 *   Contracts:
 *     GET  /contracts                             (seller contracts)
 *     POST /contracts/:id/terminate               (seller terminate contract)
 *     POST /contracts/:id/commission              (seller update commission rate)
 *   Orders:
 *     GET  /orders                                (seller order list)
 *     GET  /orders/:id                            (seller order detail)
 *     GET  /orders/:orderId/shipment              (seller shipment lookup)
 *     POST /orders                                (seller B2B order creation)
 *
 * Partner Contracts (mounted separately at /partner prefix):
 *     GET  /contracts                             (partner contracts)
 *     POST /contracts/:id/terminate               (partner terminate contract)
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier, createRequireActivePartner } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import { NetureService as LegacyNetureService } from '../../../routes/neture/services/neture.service.js';
import { SellerService } from '../services/seller.service.js';
import { ProductApprovalV2Service } from '../../product-policy-v2/product-approval-v2.service.js';
import { resolveStoreAccess } from '../../../utils/store-owner.utils.js';
import logger from '../../../utils/logger.js';

// ==================== Seller Controller ====================

export function createSellerController(dataSource: DataSource): Router {
  const router = Router();
  const sellerService = new SellerService(dataSource);
  const netureService = new NetureService();
  const legacyNetureService = new LegacyNetureService(dataSource);
  const approvalV2Service = new ProductApprovalV2Service(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);

  // ==================== Seller Product Query (WO-S2S-FLOW-RECOVERY-PHASE3-V1 T1) ====================

  /**
   * GET /my-products
   * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
   */
  router.get('/my-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const rows = await sellerService.getMyProducts(sellerId);

      res.json({ success: true, data: rows });
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
   * GET /available-supply-products
   * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
   */
  router.get('/available-supply-products', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const data = await sellerService.getAvailableSupplyProducts(sellerId);

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

  // ==================== Seller SERVICE Application (WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1) ====================

  /**
   * POST /service-products/:productId/apply
   * 판매자가 SERVICE 상품 취급 신청
   */
  router.post('/service-products/:productId/apply', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const { productId } = req.params;
      const userRoles: string[] = (req.user as any)?.roles || [];

      // user → organization 매핑
      const organizationId = await resolveStoreAccess(dataSource, sellerId, userRoles);
      if (!organizationId) {
        return res.status(403).json({
          success: false,
          error: 'NO_ORGANIZATION',
          message: 'Store owner or KPA operator role required',
        });
      }

      // serviceKey: organization_service_enrollments에서 조회, 없으면 'kpa' 기본값
      const serviceKey = await sellerService.resolveServiceKey(organizationId);

      const result = await approvalV2Service.createServiceApproval(
        productId, organizationId, serviceKey, sellerId,
      );

      if (!result.success) {
        const status = result.error === 'PRODUCT_NOT_FOUND' ? 404
          : result.error === 'APPROVAL_ALREADY_EXISTS' ? 409
          : 400;
        return res.status(status).json({
          success: false,
          error: result.error,
          message: result.error,
        });
      }

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error creating SERVICE application:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create SERVICE application',
      });
    }
  });

  /**
   * GET /service-applications
   * 판매자의 SERVICE 승인 신청 목록 조회
   */
  router.get('/service-applications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const userRoles: string[] = (req.user as any)?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, sellerId, userRoles);
      if (!organizationId) {
        return res.status(403).json({
          success: false,
          error: 'NO_ORGANIZATION',
          message: 'Store owner or KPA operator role required',
        });
      }

      const rows = await sellerService.getServiceApplications(organizationId);

      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('[Neture API] Error fetching seller service applications:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch service applications',
      });
    }
  });

  // ==================== Seller Dashboard AI Insight (WO-STORE-AI-V1-SELLER-INSIGHT) ====================

  /**
   * GET /dashboard/ai-insight
   * Seller 대시보드 AI 인사이트 (4카드 구조)
   */
  router.get('/dashboard/ai-insight', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const data = await netureService.getSellerDashboardInsight(sellerId);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture Route] Error fetching seller dashboard insight:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch seller dashboard insight',
      });
    }
  });

  // ==================== Seller-Partner Contracts (WO-NETURE-SELLER-PARTNER-CONTRACT-V1) ====================

  /**
   * GET /contracts
   * Seller 계약 목록 조회
   * Query: ?status=active|terminated|expired
   */
  router.get('/contracts', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = (req as SupplierRequest).supplierId;

      const { status } = req.query;
      const contracts = await netureService.getSellerContracts(sellerId, status as string | undefined);
      res.json({ success: true, data: contracts });
    } catch (error) {
      logger.error('[Neture API] Error fetching seller contracts:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
    }
  });

  /**
   * POST /contracts/:id/terminate
   * Seller가 계약 해지
   */
  router.post('/contracts/:id/terminate', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = (req as SupplierRequest).supplierId;

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
   * POST /contracts/:id/commission
   * 수수료 변경 (기존 계약 terminated → 신규 계약 생성)
   */
  router.post('/contracts/:id/commission', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = (req as SupplierRequest).supplierId;

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

  // ============================================================================
  // Seller Orders (WO-O4O-STORE-ORDERS-PAGE-V1 + WO-O4O-STORE-CART-PAGE-V1)
  // ============================================================================

  /**
   * GET /orders
   * WO-O4O-STORE-ORDERS-PAGE-V1: 판매자 주문 목록 (페이지네이션 + 상태 필터)
   */
  router.get('/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { page, limit, status, sort, order: sortOrder } = req.query;
      const result = await legacyNetureService.listOrders({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        status: status as any,
        sort: (sort as any) || 'created_at',
        order: (sortOrder as any) || 'desc',
      }, userId);

      res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('[Neture API] Error fetching seller orders:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch orders' });
    }
  });

  /**
   * GET /orders/:id
   * WO-O4O-STORE-ORDERS-PAGE-V1 + WO-O4O-STORE-ORDER-DETAIL-PAGE-V1
   * 판매자 주문 상세 (소유권 검증 + 공급자/상품 정보 enrichment)
   */
  router.get('/orders/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const order = await legacyNetureService.getOrder(req.params.id, userId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      // WO-O4O-STORE-ORDER-DETAIL-PAGE-V1: 공급자 + 상품 마스터 정보 보강
      if (order.items && order.items.length > 0) {
        order.items = await sellerService.enrichOrderItems(order.items);
      }

      res.json({ success: true, data: order });
    } catch (error: any) {
      logger.error('[Neture API] Error fetching seller order detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order' });
    }
  });

  /**
   * GET /orders/:orderId/shipment
   * WO-O4O-SHIPMENT-ENGINE-V1: 매장(Store) 배송 조회
   */
  router.get('/orders/:orderId/shipment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { orderId } = req.params;

      // Verify order belongs to this user
      const order = await legacyNetureService.getOrder(orderId, userId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      const shipment = await sellerService.getShipmentByOrderId(orderId);

      res.json({ success: true, data: shipment });
    } catch (error: any) {
      logger.error('[Neture API] Error fetching seller shipment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch shipment' });
    }
  });

  /**
   * POST /orders
   * WO-O4O-STORE-CART-PAGE-V1: 판매자 B2B 주문 생성 — 6-gate 검증 + 서버 가격 강제
   * WO-O4O-PARTNER-HUB-CORE-V1: referral_token → Order Attribution + Commission Snapshot
   */
  router.post('/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      // IR-NETURE-B2B-DIRECT-SHIPPING-ORDER-FLOW-AUDIT-V1 Phase 2: order_type, customer_info pass-through
      const { items, shipping, orderer_name, orderer_phone, orderer_email, note, referral_token, order_type, customer_info } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Items required' });
      }
      if (!shipping || !orderer_name || !orderer_phone) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Shipping info and orderer info required' });
      }

      const order = await legacyNetureService.createOrder(
        { items, shipping, orderer_name, orderer_phone, orderer_email, note, order_type, customer_info },
        userId,
      );

      // === POST-CREATION: Referral Attribution + Commission Snapshot (WO-O4O-PARTNER-HUB-CORE-V1) ===
      if (referral_token && order?.id) {
        try {
          await sellerService.processReferralAttribution(order.id, order.order_number, referral_token);
        } catch (attrErr) {
          logger.warn('[Partner Commission] Attribution failed (non-blocking):', attrErr);
        }
      }

      res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      logger.error('[Neture API] Error creating seller order:', error);
      res.status(400).json({ success: false, error: 'ORDER_CREATION_FAILED', message: error.message });
    }
  });

  return router;
}

// ==================== Partner Contract Controller ====================

/**
 * Partner-facing contract routes — mounted at /partner prefix
 * WO-NETURE-SELLER-PARTNER-CONTRACT-V1
 */
export function createPartnerContractController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const requireActivePartner = createRequireActivePartner(dataSource);

  /**
   * GET /contracts
   * Partner 계약 목록 조회
   * Query: ?status=active|terminated|expired
   */
  router.get('/contracts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
   * POST /contracts/:id/terminate
   * Partner가 계약 해지
   */
  router.post('/contracts/:id/terminate', requireAuth, requireActivePartner as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
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

  return router;
}

/**
 * SellerController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes (store_owner / 매장 경영자 기능):
 *   Seller Products:
 *     GET  /my-products                          (store_owner 승인 상품)
 *     GET  /available-supply-products             (공급 카탈로그 + 승인 상태)
 *   Service-Product Applications:
 *     POST /service-products/:productId/apply     (SERVICE 상품 취급 신청)
 *     GET  /service-applications                  (service 신청 목록)
 *   Dashboard:
 *     GET  /dashboard/ai-insight                  (AI 인사이트)
 *   Orders:
 *     GET  /orders                                (주문 목록)
 *     GET  /orders/:id                            (주문 상세)
 *     GET  /orders/:orderId/shipment              (배송 조회)
 *     POST /orders                                (B2B 주문 생성)
 *
 * 공급자 계약 API는 /supplier/contracts로 이동됨.
 * → WO-O4O-NETURE-SELLER-CONTRACT-TO-SUPPLIER-MIGRATION-V1
 *
 * Partner Contracts (mounted separately at /partner prefix):
 *     GET  /contracts                             (partner contracts)
 *     POST /contracts/:id/terminate               (partner terminate contract)
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActivePartner } from '../middleware/neture-identity.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
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
   * POST /orders — RETIRED (410 Gone)
   *
   * WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1 (P2e):
   *   Neture B2B buyer 의 legacy 직접 주문 생성 route 비활성화.
   *   buyer 주문은 canonical Store Cart 에서 공급자별 배송비가 포함된 장바구니 총액을
   *   결제하고(checkout-confirm-b2b → paymentGroupId → /store/payment), 결제 완료 후
   *   공급자별 주문으로 분리되어 supplier fulfillment bridge 로 전달된다.
   *
   *   이 handler 는 더 이상 주문을 생성하지 않는다:
   *     - legacyNetureService.createOrder 미호출
   *     - neture_orders insert / 재고 차감 / 공급자 노출 없음
   *     - requireAuth 유지(auth-first): no-auth → 401 / authenticated → 410
   *
   *   read/fulfillment route(GET /orders, GET /orders/:id, GET /orders/:orderId/shipment)
   *   와 legacy service(neture_orders supplier fulfillment record)는 보존한다.
   *   완전 삭제는 일정 기간 호출 0건 확인 후 별도 WO(...-REMOVE-V2).
   *
   * 이전 동작 (참고): WO-O4O-STORE-CART-PAGE-V1 6-gate 주문 생성 +
   *   WO-O4O-PARTNER-HUB-CORE-V1 referral attribution. canonical cutover(P2d-2)로 대체됨.
   */
  router.post('/orders', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
    return res.status(410).json({
      success: false,
      code: 'NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED',
      message: 'B2B 주문은 장바구니 결제를 통해 진행해 주세요.',
      canonicalAction: 'store_cart_checkout_b2b',
      canonicalRoute: '/api/v1/store/cart/neture/checkout-confirm-b2b',
    });
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

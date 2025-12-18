/**
 * Groupbuy-Yaksa Routes
 * Phase 5: Access Hardening
 *
 * Base path: /api/v1/yaksa/groupbuy
 *
 * 권한 체계:
 * - 캠페인 생성/수정/상태변경: 조직 관리자(admin/manager)
 * - 캠페인 조회: 소속 조직 멤버
 * - 주문 생성/취소: 약국 소속 멤버
 * - 주문 조회: 본인 약국 또는 관리자
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { GroupbuyCampaignService } from '../services/GroupbuyCampaignService.js';
import { CampaignProductService } from '../services/CampaignProductService.js';
import { GroupbuyOrderService } from '../services/GroupbuyOrderService.js';
import {
  createGroupbuyAuthMiddleware,
  type GroupbuyAuthRequest,
} from '../middleware/groupbuy-auth.middleware.js';

/**
 * Create groupbuy routes
 *
 * @param dataSource - TypeORM DataSource
 * @param options - Route options
 * @returns Express Router
 */
export function createGroupbuyRoutes(
  dataSource: DataSource,
  options?: {
    /**
     * 상위에서 주입되는 인증 미들웨어
     * 없으면 groupbuy 자체 인증만 사용
     */
    authMiddleware?: RequestHandler;
    /**
     * 권한 검증 비활성화 (개발/테스트용)
     * @deprecated Production에서 사용 금지
     */
    skipAuth?: boolean;
  }
): Router {
  const router = Router();

  // Initialize services
  const campaignService = new GroupbuyCampaignService(dataSource.manager);
  const productService = new CampaignProductService(dataSource.manager);
  const orderService = new GroupbuyOrderService(dataSource.manager);

  // Initialize auth middleware
  const groupbuyAuth = createGroupbuyAuthMiddleware(dataSource);

  // 상위 인증 미들웨어 (있으면 사용, 없으면 패스)
  const externalAuth: RequestHandler = options?.authMiddleware || ((req, res, next) => next());

  // 권한 검증 래퍼 (skipAuth 옵션 지원)
  const withAuth = (...middlewares: RequestHandler[]): RequestHandler[] => {
    if (options?.skipAuth) {
      console.warn('[Groupbuy Routes] WARNING: Auth checks are disabled!');
      return [];
    }
    return middlewares;
  };

  // Type-safe middleware wrapper
  const asHandler = (fn: RequestHandler): RequestHandler => fn;

  // =====================================================
  // Campaign Routes
  // =====================================================

  /**
   * GET /campaigns
   * List campaigns by organization
   * 권한: 소속 조직 멤버
   */
  router.get(
    '/campaigns',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireOrgScope)
    ),
    async (req: Request, res: Response) => {
      try {
        const { organizationId, status, includeProducts } = req.query;

        if (!organizationId) {
          res.status(400).json({
            success: false,
            error: 'organizationId is required',
          });
          return;
        }

        const campaigns = await campaignService.getCampaignsByOrganization(
          organizationId as string,
          {
            status: status as any,
            includeProducts: includeProducts === 'true',
          }
        );

        res.json({
          success: true,
          data: campaigns,
        });
      } catch (error) {
        console.error('[Groupbuy] List campaigns error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /campaigns/:id
   * Get campaign by ID
   * 권한: 캠페인 소속 조직 멤버
   */
  router.get(
    '/campaigns/:id',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignAccess)
    ),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as GroupbuyAuthRequest;
        // 캠페인은 미들웨어에서 이미 로드됨
        const campaign = authReq.groupbuyContext?.campaign;

        if (campaign) {
          res.json({
            success: true,
            data: campaign,
          });
          return;
        }

        // Fallback: 미들웨어 없이 호출된 경우
        const { id } = req.params;
        const fetchedCampaign = await campaignService.getCampaignById(id);

        if (!fetchedCampaign) {
          res.status(404).json({
            success: false,
            error: 'Campaign not found',
          });
          return;
        }

        res.json({
          success: true,
          data: fetchedCampaign,
        });
      } catch (error) {
        console.error('[Groupbuy] Get campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /campaigns
   * Create a new campaign
   * 권한: 조직 관리자 (admin/manager)
   */
  router.post(
    '/campaigns',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireOrgAdmin)
    ),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as GroupbuyAuthRequest;
        const { organizationId, title, description, startDate, endDate, metadata } = req.body;
        const createdBy = authReq.groupbuyContext?.userId || req.body.createdBy;

        if (!organizationId || !title || !startDate || !endDate) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields: organizationId, title, startDate, endDate',
          });
          return;
        }

        const campaign = await campaignService.createCampaign({
          organizationId,
          title,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          createdBy: createdBy || 'unknown',
          metadata,
        });

        res.status(201).json({
          success: true,
          data: campaign,
        });
      } catch (error) {
        console.error('[Groupbuy] Create campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * PUT /campaigns/:id
   * Update campaign
   * 권한: 캠페인 소유 조직 관리자
   */
  router.put(
    '/campaigns/:id',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { title, description, startDate, endDate, metadata } = req.body;

        const campaign = await campaignService.updateCampaign(id, {
          title,
          description,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          metadata,
        });

        res.json({
          success: true,
          data: campaign,
        });
      } catch (error) {
        console.error('[Groupbuy] Update campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /campaigns/:id/activate
   * Activate campaign (draft -> active)
   * 권한: 캠페인 소유 조직 관리자
   */
  router.post(
    '/campaigns/:id/activate',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const campaign = await campaignService.activateCampaign(id);

        res.json({
          success: true,
          data: campaign,
        });
      } catch (error) {
        console.error('[Groupbuy] Activate campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /campaigns/:id/close
   * Close campaign (active -> closed)
   * 권한: 캠페인 소유 조직 관리자
   */
  router.post(
    '/campaigns/:id/close',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const result = await campaignService.closeCampaign(id);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('[Groupbuy] Close campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /campaigns/:id/complete
   * Complete campaign (closed -> completed)
   * 권한: 캠페인 소유 조직 관리자
   */
  router.post(
    '/campaigns/:id/complete',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const campaign = await campaignService.completeCampaign(id);

        res.json({
          success: true,
          data: campaign,
        });
      } catch (error) {
        console.error('[Groupbuy] Complete campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /campaigns/:id/cancel
   * Cancel campaign
   * 권한: 캠페인 소유 조직 관리자
   */
  router.post(
    '/campaigns/:id/cancel',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const campaign = await campaignService.cancelCampaign(id);

        res.json({
          success: true,
          data: campaign,
        });
      } catch (error) {
        console.error('[Groupbuy] Cancel campaign error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // =====================================================
  // Campaign Product Routes
  // =====================================================

  /**
   * GET /campaigns/:campaignId/products
   * List products in a campaign
   * 권한: 캠페인 소속 조직 멤버
   */
  router.get(
    '/campaigns/:campaignId/products',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignAccess)
    ),
    async (req: Request, res: Response) => {
      try {
        const { campaignId } = req.params;
        const { status, supplierId } = req.query;

        const products = await productService.getProductsByCampaign(campaignId, {
          status: status as any,
          supplierId: supplierId as string,
        });

        res.json({
          success: true,
          data: products,
        });
      } catch (error) {
        console.error('[Groupbuy] List products error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /campaigns/:campaignId/products
   * Add product to campaign
   * 권한: 캠페인 소유 조직 관리자
   */
  router.post(
    '/campaigns/:campaignId/products',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { campaignId } = req.params;
        const { productId, supplierId, groupPrice, minTotalQuantity, maxTotalQuantity, startDate, endDate, metadata } = req.body;

        if (!productId || !supplierId || !groupPrice || !minTotalQuantity || !startDate || !endDate) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields',
          });
          return;
        }

        const product = await productService.createProduct({
          campaignId,
          productId,
          supplierId,
          groupPrice: parseFloat(groupPrice),
          minTotalQuantity: parseInt(minTotalQuantity, 10),
          maxTotalQuantity: maxTotalQuantity ? parseInt(maxTotalQuantity, 10) : undefined,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          metadata,
        });

        res.status(201).json({
          success: true,
          data: product,
        });
      } catch (error) {
        console.error('[Groupbuy] Add product error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /products/:id
   * Get product by ID
   * 권한: 인증된 사용자 (공개 조회)
   */
  router.get(
    '/products/:id',
    externalAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const product = await productService.getProductById(id);

        if (!product) {
          res.status(404).json({
            success: false,
            error: 'Product not found',
          });
          return;
        }

        res.json({
          success: true,
          data: product,
        });
      } catch (error) {
        console.error('[Groupbuy] Get product error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /products/available/:campaignId
   * Get available products for ordering
   * 권한: 캠페인 소속 조직 멤버
   */
  router.get(
    '/products/available/:campaignId',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignAccess)
    ),
    async (req: Request, res: Response) => {
      try {
        const { campaignId } = req.params;
        const products = await productService.getAvailableProducts(campaignId);

        res.json({
          success: true,
          data: products,
        });
      } catch (error) {
        console.error('[Groupbuy] Get available products error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // =====================================================
  // Order Routes
  // =====================================================

  /**
   * GET /orders/pharmacy/:pharmacyId
   * Get orders by pharmacy
   * 권한: 해당 약국 소속 멤버
   */
  router.get(
    '/orders/pharmacy/:pharmacyId',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requirePharmacyOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { pharmacyId } = req.params;
        const { campaignId, status } = req.query;

        const orders = await orderService.getOrdersByPharmacy(pharmacyId, {
          campaignId: campaignId as string,
          status: status as any,
        });

        res.json({
          success: true,
          data: orders,
        });
      } catch (error) {
        console.error('[Groupbuy] Get pharmacy orders error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /orders/campaign/:campaignId
   * Get orders by campaign
   * 권한: 캠페인 소유 조직 관리자
   */
  router.get(
    '/orders/campaign/:campaignId',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { campaignId } = req.params;
        const { status, supplierId } = req.query;

        const orders = await orderService.getOrdersByCampaign(campaignId, {
          status: status as any,
          supplierId: supplierId as string,
        });

        res.json({
          success: true,
          data: orders,
        });
      } catch (error) {
        console.error('[Groupbuy] Get campaign orders error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /orders
   * Create a new order (participate in groupbuy)
   * 권한: 약국 소속 멤버
   */
  router.post(
    '/orders',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requirePharmacyOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as GroupbuyAuthRequest;
        const { campaignId, campaignProductId, pharmacyId, quantity, metadata } = req.body;
        const orderedBy = authReq.groupbuyContext?.userId || req.body.orderedBy;

        if (!campaignId || !campaignProductId || !pharmacyId || !quantity) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields',
          });
          return;
        }

        const order = await orderService.createOrder({
          campaignId,
          campaignProductId,
          pharmacyId,
          quantity: parseInt(quantity, 10),
          orderedBy,
          metadata,
        });

        res.status(201).json({
          success: true,
          data: order,
        });
      } catch (error) {
        console.error('[Groupbuy] Create order error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /orders/:id/confirm
   * Confirm order with dropshipping order ID
   * 권한: 캠페인 소유 조직 관리자 또는 시스템
   */
  router.post(
    '/orders/:id/confirm',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { dropshippingOrderId } = req.body;

        if (!dropshippingOrderId) {
          res.status(400).json({
            success: false,
            error: 'dropshippingOrderId is required',
          });
          return;
        }

        const order = await orderService.confirmOrder(id, dropshippingOrderId);

        res.json({
          success: true,
          data: order,
        });
      } catch (error) {
        console.error('[Groupbuy] Confirm order error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /orders/:id/cancel
   * Cancel pending order
   * 권한: 주문자 본인 또는 캠페인 관리자
   */
  router.post(
    '/orders/:id/cancel',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership)
    ),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const order = await orderService.cancelOrder(id);

        res.json({
          success: true,
          data: order,
        });
      } catch (error) {
        console.error('[Groupbuy] Cancel order error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /campaigns/:campaignId/summary
   * Get quantity summary for campaign
   * 권한: 캠페인 소속 조직 멤버
   */
  router.get(
    '/campaigns/:campaignId/summary',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignAccess)
    ),
    async (req: Request, res: Response) => {
      try {
        const { campaignId } = req.params;
        const summary = await orderService.getQuantitySummary(campaignId);

        res.json({
          success: true,
          data: summary,
        });
      } catch (error) {
        console.error('[Groupbuy] Get summary error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /campaigns/:campaignId/participants
   * Get participants (pharmacies) for campaign
   * 권한: 캠페인 소유 조직 관리자
   */
  router.get(
    '/campaigns/:campaignId/participants',
    externalAuth,
    ...withAuth(
      asHandler(groupbuyAuth.loadMembership),
      asHandler(groupbuyAuth.requireCampaignOwner)
    ),
    async (req: Request, res: Response) => {
      try {
        const { campaignId } = req.params;
        const participants = await orderService.getQuantityByPharmacy(campaignId);

        res.json({
          success: true,
          data: participants,
        });
      } catch (error) {
        console.error('[Groupbuy] Get participants error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  return router;
}

export default createGroupbuyRoutes;

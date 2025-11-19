import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { sellerAuthorizationService } from '../services/SellerAuthorizationService.js';
import { authorizationGateService } from '../services/AuthorizationGateService.js';
import logger from '../utils/logger.js';

/**
 * Phase 9: Seller Authorization System - API Routes
 *
 * Seller/Supplier endpoints for product-level authorization workflow.
 *
 * Feature Flag: ENABLE_SELLER_AUTHORIZATION (default: false)
 *
 * Created: 2025-01-07
 */

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Helper: Check if seller authorization feature is enabled
 */
const checkFeatureEnabled = (req: Request, res: Response, next: NextFunction): void | Response => {
  const isEnabled = process.env.ENABLE_SELLER_AUTHORIZATION === 'true';

  if (!isEnabled) {
    return res.status(501).json({
      success: false,
      errorCode: 'FEATURE_NOT_ENABLED',
      message: 'Seller authorization system is not enabled. This is a Phase 9 feature currently under development.',
      feature: 'ENABLE_SELLER_AUTHORIZATION',
      status: 'STUB',
    });
  }

  next();
};

/**
 * Helper: Check if user has seller role
 */
const requireSellerRole = (req: Request, res: Response, next: NextFunction): void | Response => {
  const user = (req as any).user;
  const roles = user?.roles || [];

  if (!roles.includes('seller')) {
    return res.status(403).json({
      success: false,
      errorCode: 'ERR_INSUFFICIENT_PERMISSIONS',
      message: 'This endpoint requires seller role.',
      requiredRole: 'seller',
      userRoles: roles,
    });
  }

  next();
};

/**
 * Helper: Check if user has supplier role
 */
const requireSupplierRole = (req: Request, res: Response, next: NextFunction): void | Response => {
  const user = (req as any).user;
  const roles = user?.roles || [];

  if (!roles.includes('supplier')) {
    return res.status(403).json({
      success: false,
      errorCode: 'ERR_INSUFFICIENT_PERMISSIONS',
      message: 'This endpoint requires supplier role.',
      requiredRole: 'supplier',
      userRoles: roles,
    });
  }

  next();
};

// ============================================================================
// SELLER ENDPOINTS
// ============================================================================

/**
 * @route GET /api/v1/ds/seller/authorizations
 * @desc List seller's authorization requests/approvals
 * @query status - Filter by status (REQUESTED, APPROVED, REJECTED, REVOKED, CANCELLED)
 * @query productId - Filter by product
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @access Private (Seller role required)
 */
router.get(
  '/seller/authorizations',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = (req as any).user;
      const sellerId = user.sellerId; // Assuming user object has sellerId

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      const { status, productId, page, limit } = req.query;

      const result = await sellerAuthorizationService.listAuthorizations({
        sellerId,
        status: status as any,
        productId: productId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('[SellerAuth] List authorizations failed', { error });
      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to list authorizations',
      });
    }
  }
);

/**
 * @route POST /api/v1/ds/seller/products/:productId/request
 * @desc Request authorization to sell a product
 * @param productId - Product UUID
 * @body { businessJustification?: string, expectedVolume?: number }
 * @access Private (Seller role required)
 */
router.post(
  '/seller/products/:productId/request',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { productId } = req.params;
      const user = (req as any).user;
      const sellerId = user.sellerId;

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      // Get product to retrieve supplierId
      const productRepo = (await import('../database/connection.js')).AppDataSource.getRepository('Product');
      const product = await productRepo.findOne({ where: { id: productId } });

      if (!product) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERR_PRODUCT_NOT_FOUND',
          message: 'Product not found',
        });
      }

      const authorization = await sellerAuthorizationService.requestAuthorization({
        sellerId,
        productId,
        supplierId: (product as any).supplierId,
        metadata: req.body,
      });

      return res.status(201).json({
        success: true,
        data: {
          authorizationId: authorization.id,
          productId: authorization.productId,
          supplierId: authorization.supplierId,
          status: authorization.status,
          requestedAt: authorization.requestedAt,
          message: 'Authorization request submitted. Supplier will review within 3 business days.',
        },
      });
    } catch (error: any) {
      logger.error('[SellerAuth] Request authorization failed', { error });

      // Map error messages to HTTP status codes
      if (error.message.includes('ERR_PRODUCT_LIMIT_REACHED')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_PRODUCT_LIMIT_REACHED',
          message: error.message.replace('ERR_PRODUCT_LIMIT_REACHED: ', ''),
        });
      }

      if (error.message.includes('ERR_COOLDOWN_ACTIVE')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_COOLDOWN_ACTIVE',
          message: error.message.replace('ERR_COOLDOWN_ACTIVE: ', ''),
        });
      }

      if (error.message.includes('ERR_AUTHORIZATION_REVOKED')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_REVOKED',
          message: error.message.replace('ERR_AUTHORIZATION_REVOKED: ', ''),
        });
      }

      if (error.message.includes('ERR_ALREADY_APPROVED') || error.message.includes('ERR_ALREADY_APPLIED')) {
        return res.status(409).json({
          success: false,
          errorCode: error.message.split(':')[0],
          message: error.message.split(': ')[1] || error.message,
        });
      }

      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to request authorization',
      });
    }
  }
);

/**
 * @route DELETE /api/v1/ds/seller/authorizations/:id
 * @desc Cancel pending authorization request (seller-initiated)
 * @param id - Authorization UUID
 * @access Private (Seller role required)
 */
router.delete(
  '/seller/authorizations/:id',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const sellerId = user.sellerId;

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      await sellerAuthorizationService.cancelAuthorization(id, sellerId);

      return res.status(200).json({
        success: true,
        message: 'Authorization request cancelled.',
      });
    } catch (error: any) {
      logger.error('[SellerAuth] Cancel authorization failed', { error });

      if (error.message.includes('ERR_AUTHORIZATION_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_NOT_FOUND',
          message: error.message.replace('ERR_AUTHORIZATION_NOT_FOUND: ', ''),
        });
      }

      if (error.message.includes('ERR_INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_INVALID_STATUS',
          message: error.message.replace('ERR_INVALID_STATUS: ', ''),
        });
      }

      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to cancel authorization',
      });
    }
  }
);

/**
 * @route GET /api/v1/ds/seller/authorizations/:id
 * @desc Get authorization details
 * @param id - Authorization UUID
 * @access Private (Seller role required)
 */
router.get(
  '/seller/authorizations/:id',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const sellerId = user.sellerId;

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      const authRepo = (await import('../database/connection.js')).AppDataSource.getRepository('SellerAuthorization');
      const authorization = await authRepo.findOne({
        where: { id, sellerId },
        relations: ['product', 'supplier'],
      });

      if (!authorization) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_NOT_FOUND',
          message: 'Authorization not found or not owned by you',
        });
      }

      return res.status(200).json({
        success: true,
        data: authorization,
      });
    } catch (error: any) {
      logger.error('[SellerAuth] Get authorization failed', { error });
      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to get authorization',
      });
    }
  }
);

/**
 * @route GET /api/v1/ds/seller/limits
 * @desc Get seller's authorization limits and cooldowns
 * @access Private (Seller role required)
 */
router.get(
  '/seller/limits',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = (req as any).user;
      const sellerId = user.sellerId;

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      const limits = await sellerAuthorizationService.getSellerLimits(sellerId);

      return res.status(200).json({
        success: true,
        data: limits,
      });
    } catch (error: any) {
      logger.error('[SellerAuth] Get limits failed', { error });
      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to get limits',
      });
    }
  }
);

/**
 * @route GET /api/v1/ds/seller/gate/:productId
 * @desc Check authorization gate for a product (quick check)
 * @param productId - Product UUID
 * @access Private (Seller role required)
 */
router.get(
  '/seller/gate/:productId',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { productId } = req.params;
      const user = (req as any).user;
      const sellerId = user.sellerId;

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      const status = await authorizationGateService.getAuthorizationStatus(sellerId, productId);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('[SellerAuth] Gate check failed', { error });
      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to check gate',
      });
    }
  }
);

/**
 * @route GET /api/v1/ds/seller/audit
 * @desc Get seller's authorization audit logs
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @access Private (Seller role required)
 */
router.get(
  '/seller/audit',
  checkFeatureEnabled,
  requireSellerRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = (req as any).user;
      const sellerId = user.sellerId;

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SELLER_ID',
          message: 'User does not have a seller profile',
        });
      }

      const { page, limit } = req.query;

      // Get all authorizations for this seller
      const { authorizations } = await sellerAuthorizationService.listAuthorizations({
        sellerId,
        page: 1,
        limit: 1000, // Get all to collect audit logs
      });

      // Collect audit logs for all authorizations
      const allLogs: any[] = [];
      for (const auth of authorizations) {
        const { logs } = await sellerAuthorizationService.getAuditLogs(
          (auth as any).id,
          page ? parseInt(page as string) : 1,
          limit ? parseInt(limit as string) : 20
        );
        allLogs.push(...logs);
      }

      // Sort by createdAt DESC
      allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.status(200).json({
        success: true,
        data: {
          logs: allLogs,
          pagination: {
            total: allLogs.length,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
            totalPages: Math.ceil(allLogs.length / (limit ? parseInt(limit as string) : 20)),
          },
        },
      });
    } catch (error: any) {
      logger.error('[SellerAuth] Get audit logs failed', { error });
      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to get audit logs',
      });
    }
  }
);

// ============================================================================
// SUPPLIER ENDPOINTS
// ============================================================================

/**
 * @route GET /api/v1/ds/supplier/authorizations/inbox
 * @desc Get pending authorization requests for supplier's products (alias for /admin/ds/authorizations)
 * @query status - Filter by status (default: REQUESTED)
 * @query productId - Filter by product
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @access Private (Supplier role required)
 */
router.get(
  '/supplier/authorizations/inbox',
  checkFeatureEnabled,
  requireSupplierRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = (req as any).user;
      const supplierId = user.supplierId; // Assuming user object has supplierId

      if (!supplierId) {
        return res.status(403).json({
          success: false,
          errorCode: 'ERR_NO_SUPPLIER_ID',
          message: 'User does not have a supplier profile',
        });
      }

      const { status = 'REQUESTED', productId, page, limit } = req.query;

      const result = await sellerAuthorizationService.listAuthorizations({
        supplierId,
        status: status as any,
        productId: productId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('[SupplierAuth] List inbox failed', { error });
      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to list authorization requests',
      });
    }
  }
);

/**
 * @route POST /api/v1/ds/supplier/authorizations/:id/approve
 * @desc Approve seller authorization request (also available under /api/admin/ds/authorizations/:id/approve)
 * @param id - Authorization UUID
 * @body { expiresAt?: string (ISO8601) } - Optional expiry date
 * @access Private (Supplier role required)
 */
router.post(
  '/supplier/authorizations/:id/approve',
  checkFeatureEnabled,
  requireSupplierRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { expiresAt } = req.body;

      const authorization = await sellerAuthorizationService.approveAuthorization({
        authorizationId: id,
        approvedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: {
          authorizationId: authorization.id,
          status: authorization.status,
          approvedAt: authorization.approvedAt,
          message: 'Seller authorization approved.',
        },
      });
    } catch (error: any) {
      logger.error('[SupplierAuth] Approve failed', { error });

      if (error.message.includes('ERR_AUTHORIZATION_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_NOT_FOUND',
          message: error.message.replace('ERR_AUTHORIZATION_NOT_FOUND: ', ''),
        });
      }

      if (error.message.includes('ERR_INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_INVALID_STATUS',
          message: error.message.replace('ERR_INVALID_STATUS: ', ''),
        });
      }

      if (error.message.includes('ERR_PRODUCT_LIMIT_REACHED')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_PRODUCT_LIMIT_REACHED',
          message: error.message.replace('ERR_PRODUCT_LIMIT_REACHED: ', ''),
        });
      }

      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to approve authorization',
      });
    }
  }
);

/**
 * @route POST /api/v1/ds/supplier/authorizations/:id/reject
 * @desc Reject seller authorization request (30-day cooldown)
 * @param id - Authorization UUID
 * @body { reason: string (required, min 10 chars), cooldownDays?: number }
 * @access Private (Supplier role required)
 */
router.post(
  '/supplier/authorizations/:id/reject',
  checkFeatureEnabled,
  requireSupplierRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { reason, cooldownDays } = req.body;

      const authorization = await sellerAuthorizationService.rejectAuthorization({
        authorizationId: id,
        rejectedBy: user.id,
        reason,
        cooldownDays,
      });

      return res.status(200).json({
        success: true,
        data: {
          authorizationId: authorization.id,
          status: authorization.status,
          rejectedAt: authorization.rejectedAt,
          cooldownUntil: authorization.cooldownUntil,
          message: 'Seller authorization rejected. Seller can re-apply after cooldown.',
        },
      });
    } catch (error: any) {
      logger.error('[SupplierAuth] Reject failed', { error });

      if (error.message.includes('ERR_REASON_REQUIRED')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_REASON_REQUIRED',
          message: error.message.replace('ERR_REASON_REQUIRED: ', ''),
        });
      }

      if (error.message.includes('ERR_AUTHORIZATION_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_NOT_FOUND',
          message: error.message.replace('ERR_AUTHORIZATION_NOT_FOUND: ', ''),
        });
      }

      if (error.message.includes('ERR_INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_INVALID_STATUS',
          message: error.message.replace('ERR_INVALID_STATUS: ', ''),
        });
      }

      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to reject authorization',
      });
    }
  }
);

/**
 * @route POST /api/v1/ds/supplier/authorizations/:id/revoke
 * @desc Revoke seller authorization (permanent, cannot re-apply)
 * @param id - Authorization UUID
 * @body { reason: string (required, min 10 chars) }
 * @access Private (Supplier role required)
 */
router.post(
  '/supplier/authorizations/:id/revoke',
  checkFeatureEnabled,
  requireSupplierRole,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { reason } = req.body;

      const authorization = await sellerAuthorizationService.revokeAuthorization({
        authorizationId: id,
        revokedBy: user.id,
        reason,
      });

      return res.status(200).json({
        success: true,
        data: {
          authorizationId: authorization.id,
          status: authorization.status,
          revokedAt: authorization.revokedAt,
          message: 'Seller authorization revoked permanently. Seller cannot re-apply for this product.',
        },
      });
    } catch (error: any) {
      logger.error('[SupplierAuth] Revoke failed', { error });

      if (error.message.includes('ERR_REASON_REQUIRED')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_REASON_REQUIRED',
          message: error.message.replace('ERR_REASON_REQUIRED: ', ''),
        });
      }

      if (error.message.includes('ERR_AUTHORIZATION_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_NOT_FOUND',
          message: error.message.replace('ERR_AUTHORIZATION_NOT_FOUND: ', ''),
        });
      }

      if (error.message.includes('ERR_INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERR_INVALID_STATUS',
          message: error.message.replace('ERR_INVALID_STATUS: ', ''),
        });
      }

      return res.status(500).json({
        success: false,
        errorCode: 'ERR_INTERNAL_SERVER',
        message: error.message || 'Failed to revoke authorization',
      });
    }
  }
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * @route GET /api/v1/ds/seller-authorization/health
 * @desc Health check for seller authorization system
 * @access Public
 */
router.get('/seller-authorization/health', async (req: Request, res: Response): Promise<Response> => {
  const isEnabled = process.env.ENABLE_SELLER_AUTHORIZATION === 'true';

  return res.status(200).json({
    success: true,
    feature: 'Phase 9: Seller Authorization System',
    status: isEnabled ? 'ENABLED' : 'DISABLED',
    flag: 'ENABLE_SELLER_AUTHORIZATION',
    version: '1.0.0',
    implementation: 'STUB',
    endpoints: {
      seller: 3,
      supplier: 4,
    },
  });
});

export default router;

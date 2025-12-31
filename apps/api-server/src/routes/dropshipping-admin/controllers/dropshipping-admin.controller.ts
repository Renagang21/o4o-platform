/**
 * Dropshipping Admin Controller
 *
 * DS-3: Admin API for Dropshipping domain
 * - CRUD for SupplierCatalogItem
 * - CRUD for SellerOffer
 * - Status change with DS-1 state transition validation
 * - Audit log retrieval
 *
 * All endpoints require authentication and dropshipping:admin scope.
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { SupplierCatalogItemService, ServiceContext } from '../services/supplier-catalog-item.service.js';
import { SellerOfferService } from '../services/seller-offer.service.js';
import { OfferLogRepository } from '../repositories/offer-log.repository.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';

/**
 * Error response helper
 */
function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

/**
 * Validation error helper
 */
function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.mapped(),
    });
    return true;
  }
  return false;
}

/**
 * Extract service context from request
 */
function getServiceContext(req: Request): ServiceContext {
  const authReq = req as AuthRequest;
  return {
    userId: authReq.user?.id || authReq.authUser?.id,
    userType: authReq.user?.role || authReq.authUser?.role || 'admin',
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Create dropshipping admin router
 */
export function createDropshippingAdminController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();
  const catalogService = new SupplierCatalogItemService(dataSource);
  const offerService = new SellerOfferService(dataSource);
  const logRepository = new OfferLogRepository(dataSource);

  // All routes require auth and dropshipping:admin scope
  router.use(requireAuth);
  router.use(requireScope('dropshipping:admin'));

  // ============================================================================
  // SUPPLIER CATALOG ITEMS
  // ============================================================================

  /**
   * GET /dropshipping/admin/catalog-items
   * List supplier catalog items with pagination and filters
   */
  router.get(
    '/catalog-items',
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('supplier_id').optional().isUUID(),
      query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'retired']),
      query('is_active').optional().isBoolean().toBoolean(),
      query('category').optional().isString(),
      query('search').optional().isString(),
      query('sort_by').optional().isIn(['name', 'base_price', 'created_at', 'updated_at', 'status']),
      query('sort_order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await catalogService.list({
          page: req.query.page as unknown as number,
          limit: req.query.limit as unknown as number,
          supplier_id: req.query.supplier_id as string,
          status: req.query.status as 'draft' | 'pending' | 'approved' | 'rejected' | 'retired',
          is_active: req.query.is_active as unknown as boolean,
          category: req.query.category as string,
          search: req.query.search as string,
          sort_by: req.query.sort_by as string,
          sort_order: req.query.sort_order as 'asc' | 'desc',
        });

        res.json(result);
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] List catalog items error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /dropshipping/admin/catalog-items/:id
   * Get single catalog item
   */
  router.get(
    '/catalog-items/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await catalogService.getById(req.params.id);
        if (!result) {
          return errorResponse(res, 404, 'DS_001', 'Supplier catalog item not found');
        }

        res.json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Get catalog item error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * POST /dropshipping/admin/catalog-items
   * Create new catalog item
   */
  router.post(
    '/catalog-items',
    [
      body('supplier_id').notEmpty().isUUID(),
      body('name').notEmpty().isString().isLength({ min: 1, max: 255 }),
      body('base_price').notEmpty().isFloat({ min: 0 }),
      body('external_product_ref').optional().isString(),
      body('description').optional().isString(),
      body('short_description').optional().isString().isLength({ max: 500 }),
      body('sku').optional().isString().isLength({ max: 100 }),
      body('barcode').optional().isString().isLength({ max: 100 }),
      body('currency').optional().isString().isLength({ min: 3, max: 3 }),
      body('weight').optional().isFloat({ min: 0 }),
      body('dimensions').optional().isObject(),
      body('category').optional().isString().isLength({ max: 100 }),
      body('tags').optional().isArray(),
      body('images').optional().isArray(),
      body('thumbnail_image').optional().isString(),
      body('specifications').optional().isObject(),
      body('minimum_order_quantity').optional().isInt({ min: 1 }),
      body('maximum_order_quantity').optional().isInt({ min: 1 }),
      body('lead_time_days').optional().isInt({ min: 0 }),
      body('inventory_count').optional().isInt({ min: 0 }),
      body('low_stock_threshold').optional().isInt({ min: 0 }),
      body('metadata').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        const result = await catalogService.create(req.body, context);

        res.status(201).json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Create catalog item error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('already exists')) {
          return errorResponse(res, 409, 'DS_002', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /dropshipping/admin/catalog-items/:id
   * Update catalog item
   */
  router.put(
    '/catalog-items/:id',
    [
      param('id').isUUID(),
      body('name').optional().isString().isLength({ min: 1, max: 255 }),
      body('description').optional().isString(),
      body('short_description').optional().isString().isLength({ max: 500 }),
      body('sku').optional().isString().isLength({ max: 100 }),
      body('barcode').optional().isString().isLength({ max: 100 }),
      body('base_price').optional().isFloat({ min: 0 }),
      body('currency').optional().isString().isLength({ min: 3, max: 3 }),
      body('weight').optional().isFloat({ min: 0 }),
      body('dimensions').optional().isObject(),
      body('category').optional().isString().isLength({ max: 100 }),
      body('tags').optional().isArray(),
      body('images').optional().isArray(),
      body('thumbnail_image').optional().isString(),
      body('specifications').optional().isObject(),
      body('is_active').optional().isBoolean(),
      body('minimum_order_quantity').optional().isInt({ min: 1 }),
      body('maximum_order_quantity').optional().isInt({ min: 1 }),
      body('lead_time_days').optional().isInt({ min: 0 }),
      body('inventory_count').optional().isInt({ min: 0 }),
      body('low_stock_threshold').optional().isInt({ min: 0 }),
      body('metadata').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        const result = await catalogService.update(req.params.id, req.body, context);

        res.json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Update catalog item error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('not found')) {
          return errorResponse(res, 404, 'DS_001', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /dropshipping/admin/catalog-items/:id/status
   * Change catalog item status (with DS-1 state transition validation)
   */
  router.patch(
    '/catalog-items/:id/status',
    [
      param('id').isUUID(),
      body('status').notEmpty().isIn(['draft', 'pending', 'approved', 'rejected', 'retired']),
      body('reason').optional().isString().isLength({ max: 500 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        const result = await catalogService.changeStatus(
          req.params.id,
          { status: req.body.status, reason: req.body.reason },
          context
        );

        res.json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Change catalog item status error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('not found')) {
          return errorResponse(res, 404, 'DS_001', message);
        }
        if (message.includes('Invalid status transition')) {
          return errorResponse(res, 400, 'DS_003', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * DELETE /dropshipping/admin/catalog-items/:id
   * Soft delete catalog item
   */
  router.delete(
    '/catalog-items/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        await catalogService.delete(req.params.id, context);

        res.status(204).send();
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Delete catalog item error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('not found')) {
          return errorResponse(res, 404, 'DS_001', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /dropshipping/admin/catalog-items/:id/logs
   * Get audit logs for a catalog item
   */
  router.get(
    '/catalog-items/:id/logs',
    [
      param('id').isUUID(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const limit = (req.query.limit as unknown as number) || 50;
        const logs = await catalogService.getLogs(req.params.id, limit);

        res.json({ data: logs });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Get catalog item logs error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  // ============================================================================
  // SELLER OFFERS
  // ============================================================================

  /**
   * GET /dropshipping/admin/offers
   * List seller offers with pagination and filters
   */
  router.get(
    '/offers',
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('seller_id').optional().isUUID(),
      query('supplier_catalog_item_id').optional().isUUID(),
      query('status').optional().isIn(['draft', 'pending', 'active', 'paused', 'retired']),
      query('is_active').optional().isBoolean().toBoolean(),
      query('is_visible').optional().isBoolean().toBoolean(),
      query('is_featured').optional().isBoolean().toBoolean(),
      query('search').optional().isString(),
      query('sort_by').optional().isIn(['offer_name', 'offer_price', 'profit_margin', 'total_sold', 'created_at', 'updated_at', 'status']),
      query('sort_order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await offerService.list({
          page: req.query.page as unknown as number,
          limit: req.query.limit as unknown as number,
          seller_id: req.query.seller_id as string,
          supplier_catalog_item_id: req.query.supplier_catalog_item_id as string,
          status: req.query.status as 'draft' | 'pending' | 'active' | 'paused' | 'retired',
          is_active: req.query.is_active as unknown as boolean,
          is_visible: req.query.is_visible as unknown as boolean,
          is_featured: req.query.is_featured as unknown as boolean,
          search: req.query.search as string,
          sort_by: req.query.sort_by as string,
          sort_order: req.query.sort_order as 'asc' | 'desc',
        });

        res.json(result);
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] List offers error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /dropshipping/admin/offers/:id
   * Get single seller offer
   */
  router.get(
    '/offers/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await offerService.getById(req.params.id);
        if (!result) {
          return errorResponse(res, 404, 'DS_010', 'Seller offer not found');
        }

        res.json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Get offer error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * POST /dropshipping/admin/offers
   * Create new seller offer
   */
  router.post(
    '/offers',
    [
      body('seller_id').notEmpty().isUUID(),
      body('supplier_catalog_item_id').notEmpty().isUUID(),
      body('offer_price').notEmpty().isFloat({ min: 0 }),
      body('cost_price').notEmpty().isFloat({ min: 0 }),
      body('offer_name').optional().isString().isLength({ max: 255 }),
      body('offer_description').optional().isString(),
      body('compare_price').optional().isFloat({ min: 0 }),
      body('currency').optional().isString().isLength({ min: 3, max: 3 }),
      body('seller_sku').optional().isString().isLength({ max: 255 }),
      body('seller_tags').optional().isArray(),
      body('seller_images').optional().isArray(),
      body('discount_rate').optional().isFloat({ min: 0, max: 100 }),
      body('sale_start_date').optional().isISO8601(),
      body('sale_end_date').optional().isISO8601(),
      body('is_featured').optional().isBoolean(),
      body('featured_until').optional().isISO8601(),
      body('seo_title').optional().isString().isLength({ max: 255 }),
      body('seo_description').optional().isString(),
      body('slug').optional().isString().isLength({ max: 255 }),
      body('metadata').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        const result = await offerService.create(req.body, context);

        res.status(201).json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Create offer error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('already has an offer')) {
          return errorResponse(res, 409, 'DS_011', message);
        }
        if (message.includes('not found')) {
          return errorResponse(res, 400, 'DS_012', message);
        }
        if (message.includes('non-approved')) {
          return errorResponse(res, 400, 'DS_013', message);
        }
        if (message.includes('cannot be less than')) {
          return errorResponse(res, 400, 'DS_014', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /dropshipping/admin/offers/:id
   * Update seller offer
   */
  router.put(
    '/offers/:id',
    [
      param('id').isUUID(),
      body('offer_name').optional().isString().isLength({ max: 255 }),
      body('offer_description').optional().isString(),
      body('offer_price').optional().isFloat({ min: 0 }),
      body('compare_price').optional().isFloat({ min: 0 }),
      body('cost_price').optional().isFloat({ min: 0 }),
      body('currency').optional().isString().isLength({ min: 3, max: 3 }),
      body('seller_sku').optional().isString().isLength({ max: 255 }),
      body('seller_tags').optional().isArray(),
      body('seller_images').optional().isArray(),
      body('discount_rate').optional().isFloat({ min: 0, max: 100 }),
      body('sale_start_date').optional().isISO8601(),
      body('sale_end_date').optional().isISO8601(),
      body('is_featured').optional().isBoolean(),
      body('featured_until').optional().isISO8601(),
      body('is_active').optional().isBoolean(),
      body('is_visible').optional().isBoolean(),
      body('seo_title').optional().isString().isLength({ max: 255 }),
      body('seo_description').optional().isString(),
      body('slug').optional().isString().isLength({ max: 255 }),
      body('metadata').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        const result = await offerService.update(req.params.id, req.body, context);

        res.json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Update offer error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('not found')) {
          return errorResponse(res, 404, 'DS_010', message);
        }
        if (message.includes('cannot be less than')) {
          return errorResponse(res, 400, 'DS_014', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /dropshipping/admin/offers/:id/status
   * Change seller offer status (with DS-1 state transition validation)
   */
  router.patch(
    '/offers/:id/status',
    [
      param('id').isUUID(),
      body('status').notEmpty().isIn(['draft', 'pending', 'active', 'paused', 'retired']),
      body('reason').optional().isString().isLength({ max: 500 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        const result = await offerService.changeStatus(
          req.params.id,
          { status: req.body.status, reason: req.body.reason },
          context
        );

        res.json({ data: result });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Change offer status error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('not found')) {
          return errorResponse(res, 404, 'DS_010', message);
        }
        if (message.includes('Invalid status transition')) {
          return errorResponse(res, 400, 'DS_015', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * DELETE /dropshipping/admin/offers/:id
   * Soft delete seller offer
   */
  router.delete(
    '/offers/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const context = getServiceContext(req);
        await offerService.delete(req.params.id, context);

        res.status(204).send();
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Delete offer error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('not found')) {
          return errorResponse(res, 404, 'DS_010', message);
        }
        if (message.includes('Cannot delete an active offer')) {
          return errorResponse(res, 400, 'DS_016', message);
        }
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /dropshipping/admin/offers/:id/logs
   * Get audit logs for an offer
   */
  router.get(
    '/offers/:id/logs',
    [
      param('id').isUUID(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const limit = (req.query.limit as unknown as number) || 50;
        const logs = await offerService.getLogs(req.params.id, limit);

        res.json({ data: logs });
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Get offer logs error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  // ============================================================================
  // AUDIT LOGS (COMBINED)
  // ============================================================================

  /**
   * GET /dropshipping/admin/logs
   * Get all audit logs with filters
   */
  router.get(
    '/logs',
    [
      query('entity_type').optional().isIn(['supplier_catalog_item', 'seller_offer', 'offer_policy']),
      query('entity_id').optional().isUUID(),
      query('action').optional().isIn(['create', 'update', 'status_change', 'price_change', 'delete', 'restore']),
      query('actor_id').optional().isUUID(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await logRepository.findAll({
          entity_type: req.query.entity_type as 'supplier_catalog_item' | 'seller_offer' | 'offer_policy',
          entity_id: req.query.entity_id as string,
          action: req.query.action as 'create' | 'update' | 'status_change' | 'price_change' | 'delete' | 'restore',
          actor_id: req.query.actor_id as string,
          page: req.query.page as unknown as number,
          limit: req.query.limit as unknown as number,
        });

        res.json(result);
      } catch (error: unknown) {
        logger.error('[Dropshipping Admin] Get logs error:', error);
        errorResponse(res, 500, 'DS_500', 'Internal server error');
      }
    }
  );

  return router;
}

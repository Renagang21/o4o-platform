/**
 * Glycopharm Order Controller
 *
 * H8-2: 주문/결제 API v1 Implementation
 * API endpoints for order creation and payment
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { GlycopharmOrderService } from '../services/order.service.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
    return;
  }
  next();
};

export function createOrderController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const service = new GlycopharmOrderService(dataSource);

  // ============================================================================
  // ORDER ROUTES (Authenticated)
  // ============================================================================

  /**
   * POST /orders - Create new order
   */
  router.post(
    '/',
    requireAuth,
    [
      body('pharmacy_id').isUUID().withMessage('Valid pharmacy_id is required'),
      body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
      body('items.*.product_id').isUUID().withMessage('Valid product_id is required'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
      body('customer_name').optional().isString(),
      body('customer_phone').optional().isString(),
      body('shipping_address').optional().isString(),
      body('note').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        if (!req.user?.id) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const order = await service.createOrder(req.body, req.user.id);
        res.status(201).json({ success: true, data: order });
      } catch (error: any) {
        console.error('Failed to create order:', error);

        if (error.message.includes('not found')) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: error.message },
          });
          return;
        }

        if (error.message.includes('not active') || error.message.includes('not available')) {
          res.status(400).json({
            error: { code: 'BAD_REQUEST', message: error.message },
          });
          return;
        }

        if (error.message.includes('Insufficient stock')) {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }

        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /orders/mine - List my orders
   */
  router.get(
    '/mine',
    requireAuth,
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('status').optional().isIn(['CREATED', 'PAID', 'FAILED']),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        if (!req.user?.id) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const result = await service.listMyOrders(req.user.id, {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          status: req.query.status as any,
        });

        res.json({ success: true, ...result });
      } catch (error: any) {
        console.error('Failed to list orders:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /orders/:id - Get order detail
   */
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        if (!req.user?.id) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const order = await service.getOrderById(req.params.id, req.user.id);
        if (!order) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Order not found' },
          });
          return;
        }

        res.json({ success: true, data: order });
      } catch (error: any) {
        console.error('Failed to get order:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /orders/:id/pay - Pay for order (v1 Stub)
   */
  router.post(
    '/:id/pay',
    requireAuth,
    [
      param('id').isUUID(),
      body('payment_method').isString().notEmpty().withMessage('Payment method is required'),
      body('payment_id').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        if (!req.user?.id) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const order = await service.payOrder(req.params.id, req.user.id, {
          payment_method: req.body.payment_method,
          payment_id: req.body.payment_id,
        });

        res.json({ success: true, data: order });
      } catch (error: any) {
        console.error('Failed to pay order:', error);

        if (error.message === 'Order not found') {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: error.message },
          });
          return;
        }

        if (error.message.includes('Cannot pay order')) {
          res.status(400).json({
            error: { code: 'BAD_REQUEST', message: error.message },
          });
          return;
        }

        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}

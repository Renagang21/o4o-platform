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
   *
   * ⚠️ DISABLED (Phase 5-A: E-commerce Core Integration)
   *
   * This endpoint is disabled per CLAUDE.md §7 (E-commerce Core 절대 규칙).
   * All orders must be created through E-commerce Core.
   *
   * GlycoPharm orders should be created via:
   * - POST /api/v1/ecommerce/orders with orderType: 'GLYCOPHARM'
   *
   * Reference: WO-O4O-STRUCTURE-REFORM-PHASE5-V01
   * Disabled: 2026-01-11
   */
  router.post(
    '/',
    requireAuth,
    async (_req: AuthRequest, res: Response): Promise<void> => {
      res.status(410).json({
        error: {
          code: 'ENDPOINT_GONE',
          message: 'Direct order creation is no longer supported. Please use E-commerce Core API.',
          migration: {
            newEndpoint: '/api/v1/ecommerce/orders',
            orderType: 'GLYCOPHARM',
            documentation: 'See CLAUDE.md §7 for E-commerce Core integration requirements',
          },
        },
      });
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
   * POST /orders/:id/pay - Pay for order
   *
   * ⚠️ DISABLED (Phase 5-A: E-commerce Core Integration)
   *
   * Payment processing is disabled per CLAUDE.md §7 (E-commerce Core 절대 규칙).
   * All payments must be processed through E-commerce Core.
   *
   * Reference: WO-O4O-STRUCTURE-REFORM-PHASE5-V01
   * Disabled: 2026-01-11
   */
  router.post(
    '/:id/pay',
    requireAuth,
    async (_req: AuthRequest, res: Response): Promise<void> => {
      res.status(410).json({
        error: {
          code: 'ENDPOINT_GONE',
          message: 'Direct payment processing is no longer supported. Please use E-commerce Core API.',
          migration: {
            newEndpoint: '/api/v1/ecommerce/orders/:id/pay',
            documentation: 'See CLAUDE.md §7 for E-commerce Core integration requirements',
          },
        },
      });
    }
  );

  return router;
}

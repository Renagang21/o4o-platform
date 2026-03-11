/**
 * SupplierOrderController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/orders/*, supplier/orders/:orderId/shipment
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { SupplierOrderService } from '../services/supplier-order.service.js';
import { NetureOrderStatus } from '../../../routes/neture/entities/neture-order.entity.js';
import { NetureService as LegacyNetureService } from '../../../routes/neture/services/neture.service.js';
import logger from '../../../utils/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSupplierOrderController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SupplierOrderService(dataSource);
  const legacyNetureService = new LegacyNetureService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // GET /supplier/orders/summary
  router.get('/orders/summary', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      // Import NetureService for summary (uses existing service)
      const { NetureService } = await import('../neture.service.js');
      const netureService = new NetureService();
      const summary = await netureService.getSupplierOrdersSummary(supplierId);
      res.json({
        success: true,
        data: summary,
        notice: 'Neture는 주문을 직접 처리하지 않습니다. 각 서비스에서 주문을 관리하세요.',
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching order summary:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order summary' });
    }
  });

  // GET /supplier/orders/kpi
  router.get('/orders/kpi', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const data = await service.getOrderKpi(supplierId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier order KPI:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order KPI' });
    }
  });

  // GET /supplier/orders
  router.get('/orders', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const result = await service.listOrders(supplierId, { page, limit, status });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier orders:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch supplier orders' });
    }
  });

  // GET /supplier/orders/:id
  router.get('/orders/:id', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const orderId = req.params.id;

      if (!UUID_REGEX.test(orderId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
      }

      const isOwner = await service.validateOwnership(orderId, supplierId);
      if (!isOwner) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      const order = await legacyNetureService.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      if (order.items && order.items.length > 0) {
        order.items = await service.enrichOrderItems(order.items);
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier order detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch order detail' });
    }
  });

  // PATCH /supplier/orders/:id/status
  router.patch('/orders/:id/status', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const orderId = req.params.id;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'MISSING_STATUS', message: 'Status is required' });
      }

      if (!UUID_REGEX.test(orderId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
      }

      const isOwner = await service.validateOwnership(orderId, supplierId);
      if (!isOwner) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      const currentOrder = await legacyNetureService.getOrder(orderId);
      if (!currentOrder) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      const transitions = service.getStatusTransitions();
      const allowed = transitions[currentOrder.status] || [];
      if (!allowed.includes(status)) {
        return res.status(403).json({
          success: false,
          error: 'INVALID_TRANSITION',
          message: `Cannot transition from '${currentOrder.status}' to '${status}'`,
        });
      }

      const updated = await legacyNetureService.updateOrderStatus(orderId, { status });
      if (!updated) {
        return res.status(500).json({ success: false, error: 'UPDATE_FAILED', message: 'Failed to update order status' });
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[Neture API] Error updating supplier order status:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update order status' });
    }
  });

  // POST /supplier/orders/:orderId/shipment
  router.post('/orders/:orderId/shipment', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { orderId } = req.params;
      const { carrier_code, carrier_name, tracking_number } = req.body;

      if (!carrier_code || !carrier_name || !tracking_number) {
        return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'carrier_code, carrier_name, tracking_number are required' });
      }
      if (!UUID_REGEX.test(orderId)) {
        return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
      }

      const isOwner = await service.validateOwnership(orderId, supplierId);
      if (!isOwner) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      const currentOrder = await legacyNetureService.getOrder(orderId);
      if (!currentOrder) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }
      if (currentOrder.status !== NetureOrderStatus.PREPARING) {
        return res.status(403).json({ success: false, error: 'INVALID_STATE', message: `Order must be in 'preparing' state (current: ${currentOrder.status})` });
      }

      const result = await service.createShipment(orderId, supplierId, { carrier_code, carrier_name, tracking_number });
      if ('error' in result) {
        return res.status(409).json({ success: false, error: result.error, message: 'Shipment already registered for this order' });
      }

      // Auto-transition order status to 'shipped'
      await legacyNetureService.updateOrderStatus(orderId, { status: NetureOrderStatus.SHIPPED });

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error creating shipment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create shipment' });
    }
  });

  // GET /supplier/orders/:orderId/shipment
  router.get('/orders/:orderId/shipment', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { orderId } = req.params;

      const isOwner = await service.validateOwnership(orderId, supplierId);
      if (!isOwner) {
        return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }

      const shipment = await service.getShipment(orderId, supplierId);
      res.json({ success: true, data: shipment });
    } catch (error) {
      logger.error('[Neture API] Error fetching shipment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch shipment' });
    }
  });

  return router;
}

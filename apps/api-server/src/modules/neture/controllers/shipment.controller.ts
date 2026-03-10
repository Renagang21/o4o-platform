/**
 * ShipmentController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/shipments/:id
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { ShipmentService } from '../services/shipment.service.js';
import { NetureOrderStatus } from '../../../routes/neture/entities/neture-order.entity.js';
import { NetureService as LegacyNetureService } from '../../../routes/neture/services/neture.service.js';
import logger from '../../../utils/logger.js';

export function createShipmentController(dataSource: DataSource): Router {
  const router = Router();
  const shipmentService = new ShipmentService(dataSource);
  const legacyNetureService = new LegacyNetureService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);

  // PATCH /supplier/shipments/:id
  router.patch('/shipments/:id', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const shipmentId = req.params.id;
      const { status, tracking_number } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'MISSING_STATUS', message: 'status is required' });
      }

      const result = await shipmentService.updateShipment(shipmentId, supplierId, { status, tracking_number });

      if ('error' in result) {
        if (result.error === 'SHIPMENT_NOT_FOUND') {
          return res.status(404).json({ success: false, error: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' });
        }
        if (result.error === 'INVALID_TRANSITION') {
          return res.status(403).json({
            success: false,
            error: 'INVALID_TRANSITION',
            message: `Cannot transition from '${result.currentStatus}' to '${result.targetStatus}'`,
          });
        }
      }

      // Auto-transition order status to 'delivered' if shipment delivered
      if ('isDelivered' in result && result.isDelivered) {
        await legacyNetureService.updateOrderStatus(result.orderId!, { status: NetureOrderStatus.DELIVERED });
      }

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error updating shipment:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update shipment' });
    }
  });

  return router;
}

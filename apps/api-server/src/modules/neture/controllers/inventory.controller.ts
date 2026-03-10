/**
 * InventoryController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/inventory, supplier/inventory/:offerId
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { InventoryService } from '../services/inventory.service.js';
import logger from '../../../utils/logger.js';

export function createInventoryController(dataSource: DataSource): Router {
  const router = Router();
  const service = new InventoryService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // GET /supplier/inventory
  router.get('/inventory', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const items = await service.getSupplierInventory(supplierId);
      res.json({ success: true, data: items });
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier inventory:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch inventory' });
    }
  });

  // GET /supplier/inventory/:offerId
  router.get('/inventory/:offerId', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerId } = req.params;
      const items = await service.getInventoryDetail(offerId, supplierId);
      if (items.length === 0) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Inventory item not found' });
      }
      res.json({ success: true, data: items[0] });
    } catch (error) {
      logger.error('[Neture API] Error fetching inventory detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch inventory detail' });
    }
  });

  // PATCH /supplier/inventory/:offerId
  router.patch('/inventory/:offerId', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerId } = req.params;
      const { stock_quantity, low_stock_threshold, track_inventory } = req.body;

      // Validate inputs
      if (stock_quantity !== undefined && (!Number.isInteger(stock_quantity) || stock_quantity < 0)) {
        return res.status(400).json({ success: false, error: 'INVALID_STOCK', message: 'stock_quantity must be a non-negative integer' });
      }
      if (low_stock_threshold !== undefined && (!Number.isInteger(low_stock_threshold) || low_stock_threshold < 0)) {
        return res.status(400).json({ success: false, error: 'INVALID_THRESHOLD', message: 'low_stock_threshold must be a non-negative integer' });
      }

      const result = await service.updateInventory(offerId, supplierId, { stock_quantity, low_stock_threshold, track_inventory });
      if (result === null) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Product not found' });
      }
      if (result === 'NO_UPDATES') {
        return res.status(400).json({ success: false, error: 'NO_UPDATES', message: 'No fields to update' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error updating inventory:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update inventory' });
    }
  });

  return router;
}

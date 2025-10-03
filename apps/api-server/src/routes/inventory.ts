import { Router, Request, Response } from 'express';
import { authenticateToken as authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { ServiceUnavailableError } from '../utils/api-error';
// import { InventoryController } from '../controllers/inventory/inventoryController';

const router: Router = Router();
// const inventoryController = new InventoryController();


// Inventory management routes - removed for production
// router.get('/', ...); // Removed mock implementation
// router.get('/stats', ...); // Removed mock implementation
// router.post('/adjust', ...); // Removed mock implementation

// Alerts management - removed for production
// router.get('/alerts', ...); // Removed mock implementation
// router.post('/alerts/:id/acknowledge', ...); // Removed mock implementation

// Analytics and reporting - removed for production
// router.get('/dead-stock', ...); // Removed mock implementation
// router.get('/value', ...); // Removed mock implementation

// Reorder management - removed for production
// router.get('/reorder/settings', ...); // Removed mock implementation
// router.put('/reorder/settings', ...); // Removed mock implementation
// router.get('/reorder/rules', ...); // Removed mock implementation
// router.put('/reorder/rules/:id', ...); // Removed mock implementation

// Individual inventory item routes - removed for production
// router.get('/:id/movements', ...); // Removed mock implementation
// router.get('/:id/forecast', ...); // Removed mock implementation

export default router;
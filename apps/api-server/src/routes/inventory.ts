import { Router } from 'express';
import { authenticateToken as authMiddleware, requireRole } from '../middleware/auth';
import { InventoryController } from '../controllers/inventory/inventoryController';

const router: Router = Router();
const inventoryController = new InventoryController();

// All inventory routes require authentication
router.use(authMiddleware);

// Inventory management routes
router.get('/', inventoryController.getInventoryList);
router.get('/stats', inventoryController.getInventoryStats);
router.post('/adjust', inventoryController.adjustInventory);

// Alerts management
router.get('/alerts', inventoryController.getInventoryAlerts);
router.post('/alerts/:id/acknowledge', inventoryController.acknowledgeAlert);

// Analytics and reporting
router.get('/dead-stock', inventoryController.getDeadStock);
router.get('/value', inventoryController.getInventoryValue);

// Reorder management
router.get('/reorder/settings', inventoryController.getReorderSettings);
router.put('/reorder/settings', requireRole(['admin', 'manager']), inventoryController.updateReorderSettings);
router.get('/reorder/rules', inventoryController.getReorderRules);
router.put('/reorder/rules/:id', inventoryController.updateReorderRule);

// Individual inventory item routes
router.get('/:id/movements', inventoryController.getStockMovements);
router.get('/:id/forecast', inventoryController.getInventoryForecast);

export default router;
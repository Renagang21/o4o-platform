/**
 * Export Routes
 * Routes for data export functionality
 */

import { Router } from 'express';
import { ExportController } from '../../controllers/ExportController';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

const router: Router = Router();
const exportController = new ExportController();

// Apply authentication to all export routes
router.use(authenticateToken);
router.use(requireAdmin); // Only admins can export data

// Transaction exports
router.get('/transactions', exportController.exportTransactions.bind(exportController));

// Sales summary exports  
router.get('/sales-summary', exportController.exportSalesSummary.bind(exportController));

// Vendor settlement exports
router.get('/vendor-settlements', exportController.exportVendorSettlements.bind(exportController));

// Inventory exports
router.get('/inventory', exportController.exportInventory.bind(exportController));

// Affiliate commission exports
router.get('/affiliate-commissions', exportController.exportAffiliateCommissions.bind(exportController));

export default router;
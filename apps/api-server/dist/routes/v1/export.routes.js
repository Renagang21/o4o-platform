"use strict";
/**
 * Export Routes
 * Routes for data export functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExportController_1 = require("../../controllers/ExportController");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const exportController = new ExportController_1.ExportController();
// Apply authentication to all export routes
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin); // Only admins can export data
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
exports.default = router;
//# sourceMappingURL=export.routes.js.map
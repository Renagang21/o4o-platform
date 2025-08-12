"use strict";
/**
 * Dropshipping API Routes
 * 드랍쉬핑 설정 관리 라우트
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DropshippingController_1 = require("../../controllers/DropshippingController");
// import { authenticateToken } from '../../middleware/authMiddleware';
// import { requireRole } from '../../middleware/requireRole';
const router = (0, express_1.Router)();
const dropshippingController = new DropshippingController_1.DropshippingController();
// All routes require authentication
// router.use(authenticateToken);
// Most dropshipping settings require admin role
// const requireAdmin = requireRole(['admin']);
/**
 * @route   GET /api/v1/dropshipping/settings
 * @desc    Get dropshipping settings
 * @access  Admin
 */
router.get('/settings', (req, res) => {
    dropshippingController.getSettings(req, res);
});
/**
 * @route   PUT /api/v1/dropshipping/settings
 * @desc    Update dropshipping settings
 * @access  Admin
 */
router.put('/settings', (req, res) => {
    dropshippingController.updateSettings(req, res);
});
/**
 * @route   GET /api/v1/dropshipping/connectors
 * @desc    Get supplier connectors status
 * @access  Admin
 */
router.get('/connectors', (req, res) => {
    dropshippingController.getConnectors(req, res);
});
/**
 * @route   POST /api/v1/dropshipping/connectors/:connectorId/test
 * @desc    Test supplier connector
 * @access  Admin
 */
router.post('/connectors/:connectorId/test', (req, res) => {
    dropshippingController.testConnector(req, res);
});
/**
 * @route   GET /api/v1/dropshipping/margin-policies
 * @desc    Get margin policies
 * @access  Admin
 */
router.get('/margin-policies', (req, res) => {
    dropshippingController.getMarginPolicies(req, res);
});
/**
 * @route   GET /api/v1/dropshipping/statistics
 * @desc    Get dropshipping statistics
 * @access  Admin
 */
router.get('/statistics', (req, res) => {
    dropshippingController.getStatistics(req, res);
});
exports.default = router;
//# sourceMappingURL=dropshipping.routes.js.map
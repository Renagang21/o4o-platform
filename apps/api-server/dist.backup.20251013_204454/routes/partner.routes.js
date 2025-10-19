"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const partnerController_1 = require("../controllers/partner/partnerController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const User_1 = require("../entities/User");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Partner dashboard routes (partner and admin access)
const partnerOrAdmin = (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.PARTNER, User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN]);
router.get('/dashboard/summary', auth_middleware_1.authenticate, partnerOrAdmin, partnerController_1.PartnerController.getDashboardSummary);
router.get('/commissions', auth_middleware_1.authenticate, partnerOrAdmin, partnerController_1.PartnerController.getCommissionHistory);
router.get('/analytics', auth_middleware_1.authenticate, partnerOrAdmin, partnerController_1.PartnerController.getPerformanceAnalytics);
router.post('/links/generate', auth_middleware_1.authenticate, partnerOrAdmin, partnerController_1.PartnerController.generatePartnerLink);
router.get('/products', auth_middleware_1.authenticate, partnerOrAdmin, partnerController_1.PartnerController.getPromotionalProducts);
// Public routes for tracking
router.get('/track/click/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;
        const { ref } = req.query;
        // Track click event
        // This would typically update click counts in database
        logger_1.default.info(`Click tracked for link: ${linkId}, ref: ${ref}`);
        res.json({
            success: true,
            message: 'Click tracked successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to track click'
        });
    }
});
router.post('/track/conversion', async (req, res) => {
    try {
        const { orderId, linkId, ref } = req.body;
        // Track conversion event
        // This would typically update conversion counts and calculate commission
        logger_1.default.info(`Conversion tracked - Order: ${orderId}, Link: ${linkId}, Ref: ${ref}`);
        res.json({
            success: true,
            message: 'Conversion tracked successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to track conversion'
        });
    }
});
exports.default = router;
//# sourceMappingURL=partner.routes.js.map
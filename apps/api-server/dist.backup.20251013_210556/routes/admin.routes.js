"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminApprovalController_1 = require("../controllers/admin/adminApprovalController");
const adminStatsController_1 = __importDefault(require("../controllers/admin/adminStatsController"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const router = (0, express_1.Router)();
// All admin routes require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(permission_middleware_1.requireAdmin);
// Approval management routes
router.get('/queue', adminApprovalController_1.AdminApprovalController.getApprovalQueue);
router.get('/stats', adminApprovalController_1.AdminApprovalController.getApprovalStats);
router.get('/request/:id', adminApprovalController_1.AdminApprovalController.getRequestDetails);
router.post('/approve/:id', adminApprovalController_1.AdminApprovalController.approveRequest);
router.post('/reject/:id', adminApprovalController_1.AdminApprovalController.rejectRequest);
// Platform statistics routes
router.get('/platform-stats', adminStatsController_1.default.getPlatformStats.bind(adminStatsController_1.default));
router.get('/revenue-summary', adminStatsController_1.default.getRevenueSummary.bind(adminStatsController_1.default));
router.get('/pending-settlements', adminStatsController_1.default.getPendingSettlements.bind(adminStatsController_1.default));
router.post('/process-settlement/:id', adminStatsController_1.default.processSettlement.bind(adminStatsController_1.default));
exports.default = router;
//# sourceMappingURL=admin.routes.js.map
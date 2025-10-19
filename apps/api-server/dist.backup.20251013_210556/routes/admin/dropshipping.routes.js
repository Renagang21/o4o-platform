"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DropshippingController_1 = require("../../controllers/dropshipping/DropshippingController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const router = (0, express_1.Router)();
const dropshippingController = new DropshippingController_1.DropshippingController();
// All routes require admin authentication
router.use(auth_middleware_1.authenticate);
router.use(permission_middleware_1.requireAdmin);
// Commission Policies
router.get('/commission-policies', dropshippingController.getCommissionPolicies);
// Approvals
router.get('/approvals', dropshippingController.getApprovals);
router.post('/approvals/:id/approve', dropshippingController.approveRequest);
router.post('/approvals/:id/reject', dropshippingController.rejectRequest);
// System Status and Management
router.get('/system-status', dropshippingController.getSystemStatus);
router.post('/initialize', dropshippingController.initializeSystem);
router.post('/seed', dropshippingController.createSampleData);
exports.default = router;
//# sourceMappingURL=dropshipping.routes.js.map
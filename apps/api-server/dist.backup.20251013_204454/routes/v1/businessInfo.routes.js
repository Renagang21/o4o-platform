"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const businessInfo_controller_1 = require("../../controllers/v1/businessInfo.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// Business info CRUD routes
router.get('/:id/business-info', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.getBusinessInfo);
router.post('/:id/business-info', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.createBusinessInfo);
router.put('/:id/business-info', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.updateBusinessInfo);
router.delete('/:id/business-info', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.deleteBusinessInfo);
// Admin routes
router.put('/:id/business-info/verify', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, businessInfo_controller_1.BusinessInfoController.verifyBusinessInfo);
// Metadata routes
router.get('/business-types', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.getBusinessTypes);
router.get('/business-sizes', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.getBusinessSizes);
router.get('/industries', auth_middleware_1.authenticate, businessInfo_controller_1.BusinessInfoController.getIndustries);
// Statistics routes (admin only)
router.get('/business-statistics', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, businessInfo_controller_1.BusinessInfoController.getBusinessStatistics);
exports.default = router;
//# sourceMappingURL=businessInfo.routes.js.map
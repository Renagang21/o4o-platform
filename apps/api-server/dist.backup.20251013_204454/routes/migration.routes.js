"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MigrationController_1 = require("../controllers/MigrationController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new MigrationController_1.MigrationController();
// All migration routes require admin authentication
router.use(auth_middleware_1.authenticate);
// Initialize dropshipping system (CPTs and ACF)
router.post('/initialize', controller.initializeDropshippingSystem);
// Create sample data for testing
router.post('/seed', controller.createSampleData);
// Verify system status
router.get('/status', controller.verifySystemStatus);
exports.default = router;
//# sourceMappingURL=migration.routes.js.map
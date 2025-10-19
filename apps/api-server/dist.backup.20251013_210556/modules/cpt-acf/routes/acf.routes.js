"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const acf_controller_1 = require("../controllers/acf.controller");
const auth_middleware_1 = require("../../../middleware/auth.middleware");
const permission_middleware_1 = require("../../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// Field Group Management Routes
router.get('/custom-field-groups', acf_controller_1.ACFController.getFieldGroups);
router.get('/custom-field-groups/:id', acf_controller_1.ACFController.getFieldGroup);
router.post('/custom-field-groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.createFieldGroup);
router.put('/custom-field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.updateFieldGroup);
router.delete('/custom-field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.deleteFieldGroup);
// Alternative paths for backward compatibility
router.get('/custom-fields/groups', acf_controller_1.ACFController.getFieldGroups);
router.get('/custom-fields/groups/:id', acf_controller_1.ACFController.getFieldGroup);
router.post('/custom-fields/groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.createFieldGroup);
router.put('/custom-fields/groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.updateFieldGroup);
router.delete('/custom-fields/groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.deleteFieldGroup);
// Field Value Management Routes
router.get('/custom-fields/:entityType/:entityId', acf_controller_1.ACFController.getFieldValues);
router.post('/custom-fields/:entityType/:entityId', auth_middleware_1.authenticate, acf_controller_1.ACFController.saveFieldValues);
// Import/Export Routes
router.post('/custom-fields/export', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.exportFieldGroups);
router.post('/custom-fields/import', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.importFieldGroups);
exports.default = router;
//# sourceMappingURL=acf.routes.js.map
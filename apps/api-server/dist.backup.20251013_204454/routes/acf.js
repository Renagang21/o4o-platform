"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const acf_controller_1 = require("../modules/cpt-acf/controllers/acf.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const router = (0, express_1.Router)();
// Field Groups
router.get('/custom-field-groups', acf_controller_1.ACFController.getFieldGroups);
router.get('/custom-field-groups/:id', acf_controller_1.ACFController.getFieldGroup);
router.post('/custom-field-groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.createFieldGroup);
router.put('/custom-field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.updateFieldGroup);
router.delete('/custom-field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.deleteFieldGroup);
// Legacy routes for compatibility
router.get('/custom-fields/groups', acf_controller_1.ACFController.getFieldGroups);
router.get('/custom-fields/groups/:id', acf_controller_1.ACFController.getFieldGroup);
router.post('/custom-fields/groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.createFieldGroup);
router.put('/custom-fields/groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.updateFieldGroup);
router.delete('/custom-fields/groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.deleteFieldGroup);
// Field Values
router.get('/custom-fields/:entityType/:entityId', acf_controller_1.ACFController.getFieldValues);
router.post('/custom-fields/:entityType/:entityId', auth_middleware_1.authenticate, acf_controller_1.ACFController.saveFieldValues);
// Export/Import
router.post('/custom-fields/export', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.exportFieldGroups);
router.post('/custom-fields/import', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acf_controller_1.ACFController.importFieldGroups);
exports.default = router;
//# sourceMappingURL=acf.js.map
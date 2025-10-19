"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const acfController_1 = require("../../controllers/acfController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// Field Groups API - v1 endpoints
// Support both 'field-groups' and 'custom-field-groups' paths for compatibility
router.get('/field-groups', acfController_1.ACFController.getFieldGroups);
router.get('/custom-field-groups', acfController_1.ACFController.getFieldGroups);
router.get('/field-groups/:id', acfController_1.ACFController.getFieldGroup);
router.get('/custom-field-groups/:id', acfController_1.ACFController.getFieldGroup);
router.post('/field-groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.createFieldGroup);
router.post('/custom-field-groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.createFieldGroup);
router.put('/field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.updateFieldGroup);
router.put('/custom-field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.updateFieldGroup);
router.delete('/field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.deleteFieldGroup);
router.delete('/custom-field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.deleteFieldGroup);
// Field Values API
router.get('/fields/:entityType/:entityId', acfController_1.ACFController.getFieldValues);
router.post('/fields/:entityType/:entityId', auth_middleware_1.authenticate, acfController_1.ACFController.saveFieldValues);
// Utility endpoints
router.post('/export', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.exportFieldGroups);
router.post('/import', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, acfController_1.ACFController.importFieldGroups);
// Get available field types
router.get('/field-types', (req, res) => {
    const fieldTypes = [
        { value: 'text', label: 'Text', category: 'basic' },
        { value: 'textarea', label: 'Textarea', category: 'basic' },
        { value: 'number', label: 'Number', category: 'basic' },
        { value: 'email', label: 'Email', category: 'basic' },
        { value: 'url', label: 'URL', category: 'basic' },
        { value: 'password', label: 'Password', category: 'basic' },
        { value: 'select', label: 'Select', category: 'choice' },
        { value: 'checkbox', label: 'Checkbox', category: 'choice' },
        { value: 'radio', label: 'Radio Button', category: 'choice' },
        { value: 'toggle', label: 'Toggle', category: 'choice' },
        { value: 'date', label: 'Date', category: 'datetime' },
        { value: 'datetime_local', label: 'Date Time', category: 'datetime' },
        { value: 'time', label: 'Time', category: 'datetime' },
        { value: 'image', label: 'Image', category: 'media' },
        { value: 'file', label: 'File', category: 'media' },
        { value: 'gallery', label: 'Gallery', category: 'media' },
        { value: 'wysiwyg', label: 'WYSIWYG Editor', category: 'content' },
        { value: 'code', label: 'Code', category: 'content' },
        { value: 'color', label: 'Color Picker', category: 'layout' },
        { value: 'range', label: 'Range', category: 'layout' },
        { value: 'repeater', label: 'Repeater', category: 'layout' },
        { value: 'group', label: 'Group', category: 'layout' },
        { value: 'taxonomy', label: 'Taxonomy', category: 'relational' },
        { value: 'post_object', label: 'Post Object', category: 'relational' },
        { value: 'page_link', label: 'Page Link', category: 'relational' },
        { value: 'user', label: 'User', category: 'relational' }
    ];
    res.json({
        success: true,
        data: fieldTypes
    });
});
exports.default = router;
//# sourceMappingURL=acf.routes.js.map
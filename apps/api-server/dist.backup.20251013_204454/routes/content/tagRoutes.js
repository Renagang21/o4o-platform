"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TagController_1 = require("../../controllers/content/TagController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const checkRole_1 = require("../../middleware/checkRole");
const router = (0, express_1.Router)();
const tagController = new TagController_1.TagController();
// Public routes - no authentication required for reading
router.get('/tags', tagController.getTags.bind(tagController));
router.get('/tags/popular', tagController.getPopularTags.bind(tagController));
router.get('/tags/:id', tagController.getTag.bind(tagController));
router.get('/tags/:id/stats', tagController.getTagStats.bind(tagController));
// Admin only routes - require authentication and admin role
router.post('/tags', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), tagController.createTag.bind(tagController));
router.put('/tags/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin', 'editor']), tagController.updateTag.bind(tagController));
router.delete('/tags/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin']), tagController.deleteTag.bind(tagController));
router.post('/tags/:fromId/merge/:toId', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'super_admin']), tagController.mergeTags.bind(tagController));
exports.default = router;
//# sourceMappingURL=tagRoutes.js.map
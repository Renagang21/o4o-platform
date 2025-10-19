"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cpt_controller_1 = require("../controllers/cpt.controller");
const auth_middleware_1 = require("../../../middleware/auth.middleware");
const permission_middleware_1 = require("../../../middleware/permission.middleware");
const router = (0, express_1.Router)();
// CPT Management Routes
router.get('/types', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getAllCPTs);
router.get('/types/:slug', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getCPTBySlug);
router.post('/types', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.createCPT);
router.put('/types/:slug', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.updateCPT);
router.delete('/types/:slug', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.deleteCPT);
// Post Management Routes
router.get('/:slug/posts', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getPostsByCPT);
router.get('/:slug/posts/:postId', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getPostById);
router.post('/:slug/posts', auth_middleware_1.authenticate, cpt_controller_1.CPTController.createPost);
router.put('/:slug/posts/:postId', auth_middleware_1.authenticate, cpt_controller_1.CPTController.updatePost);
router.delete('/:slug/posts/:postId', auth_middleware_1.authenticate, cpt_controller_1.CPTController.deletePost);
// Initialize defaults
router.post('/initialize', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.initializeDefaults);
// Backward compatibility aliases
router.get('/:slug', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getCPT);
exports.default = router;
//# sourceMappingURL=cpt.routes.js.map
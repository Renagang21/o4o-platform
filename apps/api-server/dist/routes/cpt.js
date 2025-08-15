"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cptController_1 = require("../controllers/cptController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============= Custom Post Type Routes =============
// Get all CPTs
router.get('/types', auth_1.authenticateToken, cptController_1.CPTController.getAllCPTs);
// Get single CPT by slug
router.get('/types/:slug', auth_1.authenticateToken, cptController_1.CPTController.getCPTBySlug);
// Create new CPT (Admin only)
router.post('/types', auth_1.authenticateToken, auth_1.requireAdmin, cptController_1.CPTController.createCPT);
// Update CPT (Admin only)
router.put('/types/:slug', auth_1.authenticateToken, auth_1.requireAdmin, cptController_1.CPTController.updateCPT);
// Delete CPT (Admin only)
router.delete('/types/:slug', auth_1.authenticateToken, auth_1.requireAdmin, cptController_1.CPTController.deleteCPT);
// ============= Custom Post Routes =============
// Get posts by CPT slug
router.get('/:slug/posts', auth_1.authenticateToken, cptController_1.CPTController.getPostsByCPT);
// Get single post
router.get('/:slug/posts/:postId', auth_1.authenticateToken, cptController_1.CPTController.getPostById);
// Create new post
router.post('/:slug/posts', auth_1.authenticateToken, cptController_1.CPTController.createPost);
// Update post
router.put('/:slug/posts/:postId', auth_1.authenticateToken, cptController_1.CPTController.updatePost);
// Delete post
router.delete('/:slug/posts/:postId', auth_1.authenticateToken, cptController_1.CPTController.deletePost);
// Publish post
// router.patch('/:slug/posts/:postId/publish', authenticateToken, CPTController.publishPost);
// ============= Public Routes (for frontend display) =============
// Get published posts (public)
router.get('/public/:slug', cptController_1.CPTController.getPublicPosts);
// Get single published post (public)
// router.get('/public/:slug/:postSlug', CPTController.getPublicPost);
// ============= Utility Routes =============
// Get CPT schema for form building
// router.get('/:slug/schema', authenticateToken, CPTController.getCPTSchema);
// Validate post data against schema
// router.post('/:slug/validate', authenticateToken, CPTController.validatePostData);
// Export posts as JSON
// router.get('/:slug/export', authenticateToken, requireAdmin, CPTController.exportPosts);
// Import posts from JSON
// router.post('/:slug/import', authenticateToken, requireAdmin, CPTController.importPosts);
exports.default = router;
//# sourceMappingURL=cpt.js.map
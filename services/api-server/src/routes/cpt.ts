import { Router } from 'express';
import { CPTController } from '../controllers/cptController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// ============= Custom Post Type Routes =============

// Get all CPTs
router.get('/types', authenticateToken, CPTController.getAllCPTs);

// Get single CPT by slug
router.get('/types/:slug', authenticateToken, CPTController.getCPTBySlug);

// Create new CPT (Admin only)
router.post('/types', authenticateToken, requireAdmin, CPTController.createCPT);

// Update CPT (Admin only)
router.put('/types/:slug', authenticateToken, requireAdmin, CPTController.updateCPT);

// Delete CPT (Admin only)
router.delete('/types/:slug', authenticateToken, requireAdmin, CPTController.deleteCPT);

// ============= Custom Post Routes =============

// Get posts by CPT slug
router.get('/:slug/posts', authenticateToken, CPTController.getPostsByCPT);

// Get single post
router.get('/:slug/posts/:postId', authenticateToken, CPTController.getPostById);

// Create new post
router.post('/:slug/posts', authenticateToken, CPTController.createPost);

// Update post
router.put('/:slug/posts/:postId', authenticateToken, CPTController.updatePost);

// Delete post
router.delete('/:slug/posts/:postId', authenticateToken, CPTController.deletePost);

// Publish post
// router.patch('/:slug/posts/:postId/publish', authenticateToken, CPTController.publishPost);

// ============= Public Routes (for frontend display) =============

// Get published posts (public)
router.get('/public/:slug', CPTController.getPublicPosts);

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

export default router;

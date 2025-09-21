import { Router } from 'express';
import { CPTController } from '../controllers/cpt.controller';
import { authenticate as authenticateToken } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

// CPT Management Routes
router.get('/types', authenticateToken, CPTController.getAllCPTs);
router.get('/types/:slug', authenticateToken, CPTController.getCPTBySlug);
router.post('/types', authenticateToken, requireAdmin, CPTController.createCPT);
router.put('/types/:slug', authenticateToken, requireAdmin, CPTController.updateCPT);
router.delete('/types/:slug', authenticateToken, requireAdmin, CPTController.deleteCPT);

// Post Management Routes
router.get('/:slug/posts', authenticateToken, CPTController.getPostsByCPT);
router.get('/:slug/posts/:postId', authenticateToken, CPTController.getPostById);
router.post('/:slug/posts', authenticateToken, CPTController.createPost);
router.put('/:slug/posts/:postId', authenticateToken, CPTController.updatePost);
router.delete('/:slug/posts/:postId', authenticateToken, CPTController.deletePost);

// Initialize defaults
router.post('/initialize', authenticateToken, requireAdmin, CPTController.initializeDefaults);

// Backward compatibility aliases
router.get('/:slug', authenticateToken, CPTController.getCPT);

export default router;
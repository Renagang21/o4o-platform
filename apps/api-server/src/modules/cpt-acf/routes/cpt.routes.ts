import { Router, IRouter } from 'express';
import { CPTController } from '../controllers/cpt.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/permission.middleware';

const router: IRouter = Router();

// CPT Management Routes
router.get('/types', authenticate, CPTController.getAllCPTs);
router.get('/types/:slug', authenticate, CPTController.getCPTBySlug);
router.post('/types', authenticate, requireAdmin, CPTController.createCPT);
router.put('/types/:slug', authenticate, requireAdmin, CPTController.updateCPT);
router.delete('/types/:slug', authenticate, requireAdmin, CPTController.deleteCPT);

// Post Management Routes
router.get('/:slug/posts', authenticate, CPTController.getPostsByCPT);
router.get('/:slug/posts/:postId', authenticate, CPTController.getPostById);
router.post('/:slug/posts', authenticate, CPTController.createPost);
router.put('/:slug/posts/:postId', authenticate, CPTController.updatePost);
router.delete('/:slug/posts/:postId', authenticate, CPTController.deletePost);

// Initialize defaults
router.post('/initialize', authenticate, requireAdmin, CPTController.initializeDefaults);

// Taxonomies routes (placeholder - to be implemented)
router.get('/taxonomies', authenticate, (req, res) => {
  res.json({ success: true, data: [], total: 0 });
});

// Backward compatibility aliases
router.get('/:slug', authenticate, CPTController.getCPT);

export default router;
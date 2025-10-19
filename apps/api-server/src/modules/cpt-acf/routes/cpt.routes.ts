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

// Forms routes (placeholder - to be implemented)
// IMPORTANT: Must be before /:slug route to prevent forms being treated as a slug
router.get('/forms', authenticate, (req, res) => {
  res.json({ success: true, data: [] });
});
router.get('/forms/:id', authenticate, (req, res) => {
  res.status(404).json({ success: false, message: 'Form not found' });
});
router.post('/forms', authenticate, requireAdmin, (req, res) => {
  res.status(501).json({ success: false, message: 'Forms creation not yet implemented' });
});
router.put('/forms/:id', authenticate, requireAdmin, (req, res) => {
  res.status(501).json({ success: false, message: 'Forms update not yet implemented' });
});
router.delete('/forms/:id', authenticate, requireAdmin, (req, res) => {
  res.status(501).json({ success: false, message: 'Forms deletion not yet implemented' });
});

// Taxonomies routes (placeholder - to be implemented)
// IMPORTANT: Must be before /:slug route to prevent taxonomies being treated as a slug
router.get('/taxonomies', authenticate, (req, res) => {
  res.json({ success: true, data: { taxonomies: [], pagination: { total: 0, page: 1, limit: 20 } } });
});

// Backward compatibility aliases
// IMPORTANT: This must be last as it's a catch-all route
router.get('/:slug', authenticate, CPTController.getCPT);

export default router;
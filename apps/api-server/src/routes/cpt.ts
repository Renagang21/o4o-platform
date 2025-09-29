import { Router } from 'express';
import { CPTController } from '../modules/cpt-acf/controllers/cpt.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router: Router = Router();

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

// Get published posts (public) - TODO: Implement getPublicPosts method
// router.get('/public/:slug', CPTController.getPublicPosts);

// Get single published post (public)
// router.get('/public/:slug/:postSlug', CPTController.getPublicPost);

// ============= Field Groups Routes (Mock Implementation) =============

// Get all field groups
router.get('/field-groups', async (req, res) => {
  try {
    const postType = req.query.postType as string;
    // Mock data for now until service is properly implemented
    const mockGroups = [];
    res.json({ data: mockGroups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch field groups' });
  }
});

// Get single field group
router.get('/field-groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Mock for now
    res.json({ data: null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch field group' });
  }
});

// Create field group
router.post('/field-groups', authenticateToken, async (req, res) => {
  try {
    const fieldGroup = req.body;
    // For now, just return the submitted data with an ID
    const created = {
      id: `fg_${Date.now()}`,
      ...fieldGroup,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    res.json({ data: created });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create field group' });
  }
});

// Update field group
router.put('/field-groups/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fieldGroup = req.body;
    const updated = {
      id,
      ...fieldGroup,
      updatedAt: new Date().toISOString()
    };
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update field group' });
  }
});

// Patch field group
router.patch('/field-groups/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    res.json({ data: { id, ...updates } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update field group' });
  }
});

// Delete field group
router.delete('/field-groups/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete field group' });
  }
});

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

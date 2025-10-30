import { Router } from 'express';
import { CPTController } from '../modules/cpt-acf/controllers/cpt.controller.js';
import { FieldGroupsController } from '../controllers/cpt/FieldGroupsController.js';
import { TaxonomiesController } from '../controllers/cpt/TaxonomiesController.js';
import { FormsController } from '../controllers/cpt/FormsController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';

const router: Router = Router();

// ============= Custom Post Type Routes =============

// Get all CPTs
router.get('/types', authenticate, CPTController.getAllCPTs);

// Get single CPT by slug
router.get('/types/:slug', authenticate, CPTController.getCPTBySlug);

// Create new CPT (Admin only)
router.post('/types', authenticate, requireAdmin, CPTController.createCPT);

// Update CPT (Admin only)
router.put('/types/:slug', authenticate, requireAdmin, CPTController.updateCPT);

// Delete CPT (Admin only)
router.delete('/types/:slug', authenticate, requireAdmin, CPTController.deleteCPT);

// ============= Custom Post Routes =============

// Get posts by CPT slug
router.get('/:slug/posts', authenticate, CPTController.getPostsByCPT);

// Get single post
router.get('/:slug/posts/:postId', authenticate, CPTController.getPostById);

// Create new post
router.post('/:slug/posts', authenticate, CPTController.createPost);

// Update post
router.put('/:slug/posts/:postId', authenticate, CPTController.updatePost);

// Delete post
router.delete('/:slug/posts/:postId', authenticate, CPTController.deletePost);

// Publish post
// router.patch('/:slug/posts/:postId/publish', authenticateToken, CPTController.publishPost);

// ============= Public Routes (for frontend display) =============

// Get published posts (public) - TODO: Implement getPublicPosts method
// router.get('/public/:slug', CPTController.getPublicPosts);

// Get single published post (public)
// router.get('/public/:slug/:postSlug', CPTController.getPublicPost);

// ============= Field Groups Routes =============
const fieldGroupsController = new FieldGroupsController();

// Get all field groups
router.get('/field-groups', authenticate, fieldGroupsController.getAllFieldGroups.bind(fieldGroupsController));

// Get single field group
router.get('/field-groups/:id', authenticate, fieldGroupsController.getFieldGroupById.bind(fieldGroupsController));

// Create new field group (Admin only)
router.post('/field-groups', authenticate, requireAdmin, fieldGroupsController.createFieldGroup.bind(fieldGroupsController));

// Update field group (Admin only)
router.put('/field-groups/:id', authenticate, requireAdmin, fieldGroupsController.updateFieldGroup.bind(fieldGroupsController));

// Delete field group (Admin only)
router.delete('/field-groups/:id', authenticate, requireAdmin, fieldGroupsController.deleteFieldGroup.bind(fieldGroupsController));

// Duplicate field group (Admin only)
router.post('/field-groups/:id/duplicate', authenticate, requireAdmin, fieldGroupsController.duplicateFieldGroup.bind(fieldGroupsController));

// Toggle field group status (Admin only)
router.patch('/field-groups/:id/toggle', authenticate, requireAdmin, fieldGroupsController.toggleFieldGroupStatus.bind(fieldGroupsController));

// Reorder field groups (Admin only)
router.patch('/field-groups/reorder', authenticate, requireAdmin, fieldGroupsController.reorderFieldGroups.bind(fieldGroupsController));

// Get field groups by location
router.get('/field-groups/location', authenticate, fieldGroupsController.getFieldGroupsByLocation.bind(fieldGroupsController));

// ============= Taxonomies Routes =============
const taxonomiesController = new TaxonomiesController();

// Get all taxonomies
router.get('/taxonomies', authenticate, taxonomiesController.getAllTaxonomies.bind(taxonomiesController));

// Get single taxonomy
router.get('/taxonomies/:id', authenticate, taxonomiesController.getTaxonomyById.bind(taxonomiesController));

// Create new taxonomy (Admin only)
router.post('/taxonomies', authenticate, requireAdmin, taxonomiesController.createTaxonomy.bind(taxonomiesController));

// Update taxonomy (Admin only)
router.put('/taxonomies/:id', authenticate, requireAdmin, taxonomiesController.updateTaxonomy.bind(taxonomiesController));

// Delete taxonomy (Admin only)
router.delete('/taxonomies/:id', authenticate, requireAdmin, taxonomiesController.deleteTaxonomy.bind(taxonomiesController));

// Get terms by taxonomy
router.get('/taxonomies/:taxonomyId/terms', authenticate, taxonomiesController.getTermsByTaxonomy.bind(taxonomiesController));

// Get single term
router.get('/terms/:id', authenticate, taxonomiesController.getTermById.bind(taxonomiesController));

// Create new term
router.post('/taxonomies/:taxonomyId/terms', authenticate, taxonomiesController.createTerm.bind(taxonomiesController));

// Update term
router.put('/terms/:id', authenticate, taxonomiesController.updateTerm.bind(taxonomiesController));

// Delete term
router.delete('/terms/:id', authenticate, taxonomiesController.deleteTerm.bind(taxonomiesController));

// Assign terms to object
router.post('/term-relationships', authenticate, taxonomiesController.assignTermsToObject.bind(taxonomiesController));

// Get object terms
router.get('/objects/:objectType/:objectId/terms', authenticate, taxonomiesController.getObjectTerms.bind(taxonomiesController));

// ============= Terms Routes =============
// Term routes are included in Taxonomies section above

// ============= Forms Routes =============
const formsController = new FormsController();

// Get all forms
router.get('/forms', authenticate, formsController.getAllForms.bind(formsController));

// Get single form by ID
router.get('/forms/:id', authenticate, formsController.getFormById.bind(formsController));

// Get form by name (public access for rendering)
router.get('/forms/name/:name', formsController.getFormByName.bind(formsController));

// Create new form
router.post('/forms', authenticate, formsController.createForm.bind(formsController));

// Update form
router.put('/forms/:id', authenticate, formsController.updateForm.bind(formsController));

// Delete form
router.delete('/forms/:id', authenticate, formsController.deleteForm.bind(formsController));

// Duplicate form
router.post('/forms/:id/duplicate', authenticate, formsController.duplicateForm.bind(formsController));

// Update form status
router.patch('/forms/:id/status', authenticate, formsController.updateFormStatus.bind(formsController));

// Get form submissions
router.get('/forms/:id/submissions', authenticate, formsController.getFormSubmissions.bind(formsController));

// Submit form (public access)
router.post('/forms/:id/submit', formsController.submitForm.bind(formsController));

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

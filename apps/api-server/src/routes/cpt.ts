import { Router } from 'express';
import { CPTController } from '../modules/cpt-acf/controllers/cpt.controller';
import { FieldGroupsController } from '../controllers/cpt/FieldGroupsController';
import { TaxonomiesController } from '../controllers/cpt/TaxonomiesController';
import { FormsController } from '../controllers/cpt/FormsController';
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

// ============= Field Groups Routes =============
const fieldGroupsController = new FieldGroupsController();

// Get all field groups
router.get('/field-groups', authenticateToken, fieldGroupsController.getAllFieldGroups.bind(fieldGroupsController));

// Get single field group
router.get('/field-groups/:id', authenticateToken, fieldGroupsController.getFieldGroupById.bind(fieldGroupsController));

// Create new field group (Admin only)
router.post('/field-groups', authenticateToken, requireAdmin, fieldGroupsController.createFieldGroup.bind(fieldGroupsController));

// Update field group (Admin only)
router.put('/field-groups/:id', authenticateToken, requireAdmin, fieldGroupsController.updateFieldGroup.bind(fieldGroupsController));

// Delete field group (Admin only)
router.delete('/field-groups/:id', authenticateToken, requireAdmin, fieldGroupsController.deleteFieldGroup.bind(fieldGroupsController));

// Duplicate field group (Admin only)
router.post('/field-groups/:id/duplicate', authenticateToken, requireAdmin, fieldGroupsController.duplicateFieldGroup.bind(fieldGroupsController));

// Toggle field group status (Admin only)
router.patch('/field-groups/:id/toggle', authenticateToken, requireAdmin, fieldGroupsController.toggleFieldGroupStatus.bind(fieldGroupsController));

// Reorder field groups (Admin only)
router.patch('/field-groups/reorder', authenticateToken, requireAdmin, fieldGroupsController.reorderFieldGroups.bind(fieldGroupsController));

// Get field groups by location
router.get('/field-groups/location', authenticateToken, fieldGroupsController.getFieldGroupsByLocation.bind(fieldGroupsController));

// ============= Taxonomies Routes =============
const taxonomiesController = new TaxonomiesController();

// Get all taxonomies
router.get('/taxonomies', authenticateToken, taxonomiesController.getAllTaxonomies.bind(taxonomiesController));

// Get single taxonomy
router.get('/taxonomies/:id', authenticateToken, taxonomiesController.getTaxonomyById.bind(taxonomiesController));

// Create new taxonomy (Admin only)
router.post('/taxonomies', authenticateToken, requireAdmin, taxonomiesController.createTaxonomy.bind(taxonomiesController));

// Update taxonomy (Admin only)
router.put('/taxonomies/:id', authenticateToken, requireAdmin, taxonomiesController.updateTaxonomy.bind(taxonomiesController));

// Delete taxonomy (Admin only)
router.delete('/taxonomies/:id', authenticateToken, requireAdmin, taxonomiesController.deleteTaxonomy.bind(taxonomiesController));

// Get terms by taxonomy
router.get('/taxonomies/:taxonomyId/terms', authenticateToken, taxonomiesController.getTermsByTaxonomy.bind(taxonomiesController));

// Get single term
router.get('/terms/:id', authenticateToken, taxonomiesController.getTermById.bind(taxonomiesController));

// Create new term
router.post('/taxonomies/:taxonomyId/terms', authenticateToken, taxonomiesController.createTerm.bind(taxonomiesController));

// Update term
router.put('/terms/:id', authenticateToken, taxonomiesController.updateTerm.bind(taxonomiesController));

// Delete term
router.delete('/terms/:id', authenticateToken, taxonomiesController.deleteTerm.bind(taxonomiesController));

// Assign terms to object
router.post('/term-relationships', authenticateToken, taxonomiesController.assignTermsToObject.bind(taxonomiesController));

// Get object terms
router.get('/objects/:objectType/:objectId/terms', authenticateToken, taxonomiesController.getObjectTerms.bind(taxonomiesController));

// ============= Terms Routes =============
// Term routes are included in Taxonomies section above

// ============= Forms Routes =============
const formsController = new FormsController();

// Get all forms
router.get('/forms', authenticateToken, formsController.getAllForms.bind(formsController));

// Get single form by ID
router.get('/forms/:id', authenticateToken, formsController.getFormById.bind(formsController));

// Get form by name (public access for rendering)
router.get('/forms/name/:name', formsController.getFormByName.bind(formsController));

// Create new form
router.post('/forms', authenticateToken, formsController.createForm.bind(formsController));

// Update form
router.put('/forms/:id', authenticateToken, formsController.updateForm.bind(formsController));

// Delete form
router.delete('/forms/:id', authenticateToken, formsController.deleteForm.bind(formsController));

// Duplicate form
router.post('/forms/:id/duplicate', authenticateToken, formsController.duplicateForm.bind(formsController));

// Update form status
router.patch('/forms/:id/status', authenticateToken, formsController.updateFormStatus.bind(formsController));

// Get form submissions
router.get('/forms/:id/submissions', authenticateToken, formsController.getFormSubmissions.bind(formsController));

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

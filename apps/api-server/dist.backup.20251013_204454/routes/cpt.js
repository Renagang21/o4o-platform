"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cpt_controller_1 = require("../modules/cpt-acf/controllers/cpt.controller");
const FieldGroupsController_1 = require("../controllers/cpt/FieldGroupsController");
const TaxonomiesController_1 = require("../controllers/cpt/TaxonomiesController");
const FormsController_1 = require("../controllers/cpt/FormsController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const router = (0, express_1.Router)();
// ============= Custom Post Type Routes =============
// Get all CPTs
router.get('/types', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getAllCPTs);
// Get single CPT by slug
router.get('/types/:slug', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getCPTBySlug);
// Create new CPT (Admin only)
router.post('/types', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.createCPT);
// Update CPT (Admin only)
router.put('/types/:slug', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.updateCPT);
// Delete CPT (Admin only)
router.delete('/types/:slug', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, cpt_controller_1.CPTController.deleteCPT);
// ============= Custom Post Routes =============
// Get posts by CPT slug
router.get('/:slug/posts', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getPostsByCPT);
// Get single post
router.get('/:slug/posts/:postId', auth_middleware_1.authenticate, cpt_controller_1.CPTController.getPostById);
// Create new post
router.post('/:slug/posts', auth_middleware_1.authenticate, cpt_controller_1.CPTController.createPost);
// Update post
router.put('/:slug/posts/:postId', auth_middleware_1.authenticate, cpt_controller_1.CPTController.updatePost);
// Delete post
router.delete('/:slug/posts/:postId', auth_middleware_1.authenticate, cpt_controller_1.CPTController.deletePost);
// Publish post
// router.patch('/:slug/posts/:postId/publish', authenticateToken, CPTController.publishPost);
// ============= Public Routes (for frontend display) =============
// Get published posts (public) - TODO: Implement getPublicPosts method
// router.get('/public/:slug', CPTController.getPublicPosts);
// Get single published post (public)
// router.get('/public/:slug/:postSlug', CPTController.getPublicPost);
// ============= Field Groups Routes =============
const fieldGroupsController = new FieldGroupsController_1.FieldGroupsController();
// Get all field groups
router.get('/field-groups', auth_middleware_1.authenticate, fieldGroupsController.getAllFieldGroups.bind(fieldGroupsController));
// Get single field group
router.get('/field-groups/:id', auth_middleware_1.authenticate, fieldGroupsController.getFieldGroupById.bind(fieldGroupsController));
// Create new field group (Admin only)
router.post('/field-groups', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, fieldGroupsController.createFieldGroup.bind(fieldGroupsController));
// Update field group (Admin only)
router.put('/field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, fieldGroupsController.updateFieldGroup.bind(fieldGroupsController));
// Delete field group (Admin only)
router.delete('/field-groups/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, fieldGroupsController.deleteFieldGroup.bind(fieldGroupsController));
// Duplicate field group (Admin only)
router.post('/field-groups/:id/duplicate', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, fieldGroupsController.duplicateFieldGroup.bind(fieldGroupsController));
// Toggle field group status (Admin only)
router.patch('/field-groups/:id/toggle', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, fieldGroupsController.toggleFieldGroupStatus.bind(fieldGroupsController));
// Reorder field groups (Admin only)
router.patch('/field-groups/reorder', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, fieldGroupsController.reorderFieldGroups.bind(fieldGroupsController));
// Get field groups by location
router.get('/field-groups/location', auth_middleware_1.authenticate, fieldGroupsController.getFieldGroupsByLocation.bind(fieldGroupsController));
// ============= Taxonomies Routes =============
const taxonomiesController = new TaxonomiesController_1.TaxonomiesController();
// Get all taxonomies
router.get('/taxonomies', auth_middleware_1.authenticate, taxonomiesController.getAllTaxonomies.bind(taxonomiesController));
// Get single taxonomy
router.get('/taxonomies/:id', auth_middleware_1.authenticate, taxonomiesController.getTaxonomyById.bind(taxonomiesController));
// Create new taxonomy (Admin only)
router.post('/taxonomies', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, taxonomiesController.createTaxonomy.bind(taxonomiesController));
// Update taxonomy (Admin only)
router.put('/taxonomies/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, taxonomiesController.updateTaxonomy.bind(taxonomiesController));
// Delete taxonomy (Admin only)
router.delete('/taxonomies/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, taxonomiesController.deleteTaxonomy.bind(taxonomiesController));
// Get terms by taxonomy
router.get('/taxonomies/:taxonomyId/terms', auth_middleware_1.authenticate, taxonomiesController.getTermsByTaxonomy.bind(taxonomiesController));
// Get single term
router.get('/terms/:id', auth_middleware_1.authenticate, taxonomiesController.getTermById.bind(taxonomiesController));
// Create new term
router.post('/taxonomies/:taxonomyId/terms', auth_middleware_1.authenticate, taxonomiesController.createTerm.bind(taxonomiesController));
// Update term
router.put('/terms/:id', auth_middleware_1.authenticate, taxonomiesController.updateTerm.bind(taxonomiesController));
// Delete term
router.delete('/terms/:id', auth_middleware_1.authenticate, taxonomiesController.deleteTerm.bind(taxonomiesController));
// Assign terms to object
router.post('/term-relationships', auth_middleware_1.authenticate, taxonomiesController.assignTermsToObject.bind(taxonomiesController));
// Get object terms
router.get('/objects/:objectType/:objectId/terms', auth_middleware_1.authenticate, taxonomiesController.getObjectTerms.bind(taxonomiesController));
// ============= Terms Routes =============
// Term routes are included in Taxonomies section above
// ============= Forms Routes =============
const formsController = new FormsController_1.FormsController();
// Get all forms
router.get('/forms', auth_middleware_1.authenticate, formsController.getAllForms.bind(formsController));
// Get single form by ID
router.get('/forms/:id', auth_middleware_1.authenticate, formsController.getFormById.bind(formsController));
// Get form by name (public access for rendering)
router.get('/forms/name/:name', formsController.getFormByName.bind(formsController));
// Create new form
router.post('/forms', auth_middleware_1.authenticate, formsController.createForm.bind(formsController));
// Update form
router.put('/forms/:id', auth_middleware_1.authenticate, formsController.updateForm.bind(formsController));
// Delete form
router.delete('/forms/:id', auth_middleware_1.authenticate, formsController.deleteForm.bind(formsController));
// Duplicate form
router.post('/forms/:id/duplicate', auth_middleware_1.authenticate, formsController.duplicateForm.bind(formsController));
// Update form status
router.patch('/forms/:id/status', auth_middleware_1.authenticate, formsController.updateFormStatus.bind(formsController));
// Get form submissions
router.get('/forms/:id/submissions', auth_middleware_1.authenticate, formsController.getFormSubmissions.bind(formsController));
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
exports.default = router;
//# sourceMappingURL=cpt.js.map
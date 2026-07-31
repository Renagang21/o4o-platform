import { Router } from 'express';
import { CPTController } from '../modules/cpt-acf/controllers/cpt.controller.js';
import { FieldGroupsController } from '../controllers/cpt/FieldGroupsController.js';
import { TaxonomiesController } from '../controllers/cpt/TaxonomiesController.js';
import { FormsController } from '../controllers/cpt/FormsController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

/**
 * WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1
 *
 * CPT 는 admin-dashboard 전용 기능이다 (소비처: apps/admin-dashboard/src/features/cpt-acf).
 * CPT type / field-group / taxonomy 쓰기는 이미 `requireAdmin` 이었으나,
 * post / term / form 쓰기와 form submission 조회는 `authenticate` 만 걸려 있어
 * 임의의 로그인 사용자가 생성·수정·삭제하고 제출 데이터를 열람할 수 있었다.
 * 인접 라우트의 기존 정책(코드 근거)에 맞춰 동일하게 `requireAdmin` 으로 정렬한다.
 */
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
router.post('/:slug/posts', authenticate, requireAdmin, CPTController.createPost);

// Update post
router.put('/:slug/posts/:postId', authenticate, requireAdmin, CPTController.updatePost);

// Delete post
router.delete('/:slug/posts/:postId', authenticate, requireAdmin, CPTController.deletePost);

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
router.post('/taxonomies/:taxonomyId/terms', authenticate, requireAdmin, taxonomiesController.createTerm.bind(taxonomiesController));

// Update term
router.put('/terms/:id', authenticate, requireAdmin, taxonomiesController.updateTerm.bind(taxonomiesController));

// Delete term
router.delete('/terms/:id', authenticate, requireAdmin, taxonomiesController.deleteTerm.bind(taxonomiesController));

// Assign terms to object
router.post('/term-relationships', authenticate, requireAdmin, taxonomiesController.assignTermsToObject.bind(taxonomiesController));

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
router.post('/forms', authenticate, requireAdmin, formsController.createForm.bind(formsController));

// Update form
router.put('/forms/:id', authenticate, requireAdmin, formsController.updateForm.bind(formsController));

// Delete form
router.delete('/forms/:id', authenticate, requireAdmin, formsController.deleteForm.bind(formsController));

// Duplicate form
router.post('/forms/:id/duplicate', authenticate, requireAdmin, formsController.duplicateForm.bind(formsController));

// Update form status
router.patch('/forms/:id/status', authenticate, requireAdmin, formsController.updateFormStatus.bind(formsController));

// Get form submissions
router.get('/forms/:id/submissions', authenticate, requireAdmin, formsController.getFormSubmissions.bind(formsController));

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

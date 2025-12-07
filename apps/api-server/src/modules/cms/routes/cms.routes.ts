import { Router } from 'express';
import {
  CustomPostTypeController,
  CustomFieldController,
  ViewController,
  PageController
} from '../controllers/index.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router: Router = Router();

// ========================================
// CUSTOM POST TYPE ROUTES
// ========================================

// POST /api/v1/cms/cpts - Create CPT (Admin)
router.post('/cpts', requireAdmin, asyncHandler(CustomPostTypeController.createCPT));

// GET /api/v1/cms/cpts - List CPTs
router.get('/cpts', requireAuth, asyncHandler(CustomPostTypeController.listCPTs));

// GET /api/v1/cms/cpts/:id - Get CPT by ID
router.get('/cpts/:id', requireAuth, asyncHandler(CustomPostTypeController.getCPT));

// GET /api/v1/cms/cpts/slug/:slug - Get CPT by slug
router.get('/cpts/slug/:slug', requireAuth, asyncHandler(CustomPostTypeController.getCPTBySlug));

// PUT /api/v1/cms/cpts/:id - Update CPT (Admin)
router.put('/cpts/:id', requireAdmin, asyncHandler(CustomPostTypeController.updateCPT));

// DELETE /api/v1/cms/cpts/:id - Delete CPT (Admin)
router.delete('/cpts/:id', requireAdmin, asyncHandler(CustomPostTypeController.deleteCPT));

// POST /api/v1/cms/cpts/:id/activate - Activate CPT (Admin)
router.post('/cpts/:id/activate', requireAdmin, asyncHandler(CustomPostTypeController.activateCPT));

// POST /api/v1/cms/cpts/:id/archive - Archive CPT (Admin)
router.post('/cpts/:id/archive', requireAdmin, asyncHandler(CustomPostTypeController.archiveCPT));

// ========================================
// CUSTOM FIELD (ACF) ROUTES
// ========================================

// POST /api/v1/cms/fields - Create Field (Admin)
router.post('/fields', requireAdmin, asyncHandler(CustomFieldController.createField));

// GET /api/v1/cms/fields - List Fields (filtered by CPT)
router.get('/fields', requireAuth, asyncHandler(CustomFieldController.listFields));

// GET /api/v1/cms/fields/:id - Get Field by ID
router.get('/fields/:id', requireAuth, asyncHandler(CustomFieldController.getField));

// GET /api/v1/cms/fields/cpt/:postTypeId - Get Fields for CPT
router.get('/fields/cpt/:postTypeId', requireAuth, asyncHandler(CustomFieldController.getFieldsForCPT));

// GET /api/v1/cms/fields/cpt/:postTypeId/grouped - Get Fields grouped by group
router.get('/fields/cpt/:postTypeId/grouped', requireAuth, asyncHandler(CustomFieldController.getFieldsByGroup));

// PUT /api/v1/cms/fields/:id - Update Field (Admin)
router.put('/fields/:id', requireAdmin, asyncHandler(CustomFieldController.updateField));

// DELETE /api/v1/cms/fields/:id - Delete Field (Admin)
router.delete('/fields/:id', requireAdmin, asyncHandler(CustomFieldController.deleteField));

// POST /api/v1/cms/fields/cpt/:postTypeId/reorder - Reorder Fields (Admin)
router.post('/fields/cpt/:postTypeId/reorder', requireAdmin, asyncHandler(CustomFieldController.reorderFields));

// POST /api/v1/cms/fields/:id/validate - Validate Field Value
router.post('/fields/:id/validate', requireAuth, asyncHandler(CustomFieldController.validateFieldValue));

// ========================================
// VIEW ROUTES
// ========================================

// POST /api/v1/cms/views - Create View (Admin)
router.post('/views', requireAdmin, asyncHandler(ViewController.createView));

// GET /api/v1/cms/views - List Views
router.get('/views', requireAuth, asyncHandler(ViewController.listViews));

// GET /api/v1/cms/views/:id - Get View by ID
router.get('/views/:id', requireAuth, asyncHandler(ViewController.getView));

// GET /api/v1/cms/views/slug/:slug - Get View by slug
router.get('/views/slug/:slug', requireAuth, asyncHandler(ViewController.getViewBySlug));

// GET /api/v1/cms/views/cpt/:postTypeSlug - Get Views for CPT
router.get('/views/cpt/:postTypeSlug', requireAuth, asyncHandler(ViewController.getViewsForCPT));

// GET /api/v1/cms/views/:id/components - Get Components in View
router.get('/views/:id/components', requireAuth, asyncHandler(ViewController.getComponentsInView));

// PUT /api/v1/cms/views/:id - Update View (Admin)
router.put('/views/:id', requireAdmin, asyncHandler(ViewController.updateView));

// DELETE /api/v1/cms/views/:id - Delete View (Admin)
router.delete('/views/:id', requireAdmin, asyncHandler(ViewController.deleteView));

// POST /api/v1/cms/views/:id/activate - Activate View (Admin)
router.post('/views/:id/activate', requireAdmin, asyncHandler(ViewController.activateView));

// POST /api/v1/cms/views/:id/archive - Archive View (Admin)
router.post('/views/:id/archive', requireAdmin, asyncHandler(ViewController.archiveView));

// POST /api/v1/cms/views/:id/clone - Clone View (Admin)
router.post('/views/:id/clone', requireAdmin, asyncHandler(ViewController.cloneView));

// ========================================
// PAGE ROUTES
// ========================================

// POST /api/v1/cms/pages - Create Page (Admin)
router.post('/pages', requireAdmin, asyncHandler(PageController.createPage));

// GET /api/v1/cms/pages - List Pages
router.get('/pages', requireAuth, asyncHandler(PageController.listPages));

// GET /api/v1/cms/pages/:id - Get Page by ID
router.get('/pages/:id', requireAuth, asyncHandler(PageController.getPage));

// GET /api/v1/cms/pages/slug/:slug - Get Page by slug
router.get('/pages/slug/:slug', requireAuth, asyncHandler(PageController.getPageBySlug));

// PUT /api/v1/cms/pages/:id - Update Page (Admin)
router.put('/pages/:id', requireAdmin, asyncHandler(PageController.updatePage));

// DELETE /api/v1/cms/pages/:id - Delete Page (Admin)
router.delete('/pages/:id', requireAdmin, asyncHandler(PageController.deletePage));

// POST /api/v1/cms/pages/:id/publish - Publish Page (Admin)
router.post('/pages/:id/publish', requireAdmin, asyncHandler(PageController.publishPage));

// POST /api/v1/cms/pages/:id/schedule - Schedule Page (Admin)
router.post('/pages/:id/schedule', requireAdmin, asyncHandler(PageController.schedulePage));

// POST /api/v1/cms/pages/:id/draft - Move Page to Draft (Admin)
router.post('/pages/:id/draft', requireAdmin, asyncHandler(PageController.draftPage));

// POST /api/v1/cms/pages/:id/archive - Archive Page (Admin)
router.post('/pages/:id/archive', requireAdmin, asyncHandler(PageController.archivePage));

// GET /api/v1/cms/pages/:id/versions - Get Version History
router.get('/pages/:id/versions', requireAuth, asyncHandler(PageController.getVersionHistory));

// POST /api/v1/cms/pages/:id/revert - Revert to Version (Admin)
router.post('/pages/:id/revert', requireAdmin, asyncHandler(PageController.revertToVersion));

// ========================================
// PUBLIC ROUTES (No Auth)
// ========================================

// GET /api/v1/cms/public/page/:slug - Get Published Page by slug (for frontend)
router.get('/public/page/:slug', asyncHandler(PageController.getPublishedPage));

// GET /api/v1/cms/public/view/:slug - Preview View template (for frontend preview)
router.get('/public/view/:slug', asyncHandler(PageController.getPublishedView));

// GET /api/v1/cms/public/pages - Get All Published Pages (for sitemap)
router.get('/public/pages', asyncHandler(PageController.getPublishedPages));

export default router;

import express from 'express';
import { PagesController } from '../controllers/pagesController';
import { MediaController } from '../controllers/mediaController';
import { TemplatesController } from '../controllers/templatesController';
import { CustomFieldsController } from '../controllers/customFieldsController';
import { authenticateToken } from '../middleware/auth';

const router: express.Router = express.Router();

// Initialize controllers
const pagesController = new PagesController();
const mediaController = new MediaController();
const templatesController = new TemplatesController();
const customFieldsController = new CustomFieldsController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ============================================================================
// PAGES ROUTES
// ============================================================================

// Basic CRUD
router.get('/admin/pages', pagesController.getPages.bind(pagesController));
router.get('/admin/pages/:id', pagesController.getPage.bind(pagesController));
router.post('/admin/pages', pagesController.createPage.bind(pagesController));
router.put('/admin/pages/:id', pagesController.updatePage.bind(pagesController));
router.delete('/admin/pages/:id', pagesController.deletePage.bind(pagesController));

// Advanced operations
router.post('/admin/pages/:id/clone', pagesController.clonePage.bind(pagesController));
router.post('/admin/pages/:id/autosave', pagesController.savePageDraft.bind(pagesController));
router.patch('/admin/pages/bulk', pagesController.bulkUpdatePages.bind(pagesController));
router.delete('/admin/pages/bulk', pagesController.bulkDeletePages.bind(pagesController));

// Preview and revisions
router.get('/admin/pages/:id/preview', pagesController.getPagePreview.bind(pagesController));
router.get('/admin/pages/:id/revisions', pagesController.getPageRevisions.bind(pagesController));
router.post('/admin/pages/:id/revisions/:revisionId/restore', pagesController.restorePageRevision.bind(pagesController));

// Utility
router.get('/admin/pages/tree', pagesController.getPageTree.bind(pagesController));

// ============================================================================
// MEDIA ROUTES
// ============================================================================

// Media files
router.get('/admin/media', mediaController.getMediaFiles.bind(mediaController));
router.get('/admin/media/:id', mediaController.getMediaFile.bind(mediaController));
router.post('/admin/media/upload', mediaController.uploadFiles.bind(mediaController));
router.put('/admin/media/:id', mediaController.updateMediaFile.bind(mediaController));
router.delete('/admin/media/:id', mediaController.deleteMediaFile.bind(mediaController));
router.delete('/admin/media/bulk', mediaController.bulkDeleteMediaFiles.bind(mediaController));

// Media folders
router.get('/admin/media/folders', mediaController.getMediaFolders.bind(mediaController));
router.post('/admin/media/folders', mediaController.createMediaFolder.bind(mediaController));
router.put('/admin/media/folders/:id', mediaController.updateMediaFolder.bind(mediaController));
router.delete('/admin/media/folders/:id', mediaController.deleteMediaFolder.bind(mediaController));

// Optimized image serving
router.get('/media/optimize/:id', mediaController.getOptimizedImage.bind(mediaController));

// ============================================================================
// TEMPLATES ROUTES
// ============================================================================

// Basic CRUD
router.get('/admin/templates', templatesController.getTemplates.bind(templatesController));
router.get('/admin/templates/:id', templatesController.getTemplate.bind(templatesController));
router.post('/admin/templates', templatesController.createTemplate.bind(templatesController));
router.put('/admin/templates/:id', templatesController.updateTemplate.bind(templatesController));
router.delete('/admin/templates/:id', templatesController.deleteTemplate.bind(templatesController));

// System templates
router.get('/admin/templates/system/:name', templatesController.getSystemTemplate.bind(templatesController));

// Import/Export
router.post('/admin/templates/import', templatesController.importTemplate.bind(templatesController));
router.get('/admin/templates/:id/export', templatesController.exportTemplate.bind(templatesController));

// ============================================================================
// CUSTOM FIELDS ROUTES
// ============================================================================

// Field Groups
router.get('/admin/custom-field-groups', customFieldsController.getFieldGroups.bind(customFieldsController));
router.get('/admin/custom-field-groups/:id', customFieldsController.getFieldGroup.bind(customFieldsController));
router.post('/admin/custom-field-groups', customFieldsController.createFieldGroup.bind(customFieldsController));
router.put('/admin/custom-field-groups/:id', customFieldsController.updateFieldGroup.bind(customFieldsController));
router.delete('/admin/custom-field-groups/:id', customFieldsController.deleteFieldGroup.bind(customFieldsController));

// Field Group Import/Export
router.post('/admin/custom-field-groups/export', customFieldsController.exportFieldGroups.bind(customFieldsController));
router.post('/admin/custom-field-groups/import', customFieldsController.importFieldGroups.bind(customFieldsController));

// Individual Fields
router.get('/admin/custom-fields', customFieldsController.getCustomFields.bind(customFieldsController));
router.get('/admin/custom-fields/:id', customFieldsController.getCustomField.bind(customFieldsController));
router.post('/admin/custom-fields', customFieldsController.createCustomField.bind(customFieldsController));
router.put('/admin/custom-fields/:id', customFieldsController.updateCustomField.bind(customFieldsController));
router.delete('/admin/custom-fields/:id', customFieldsController.deleteCustomField.bind(customFieldsController));

// Field Values
router.get('/admin/custom-fields/values/:entityType/:entityId', customFieldsController.getCustomFieldValues.bind(customFieldsController));
router.post('/admin/custom-fields/values', customFieldsController.saveCustomFieldValues.bind(customFieldsController));

export default router;
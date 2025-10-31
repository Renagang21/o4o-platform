import { Router, type Router as IRouter } from 'express';
import { presetController } from '../controllers/preset.controller.js';
import { authenticateToken } from '../../../middleware/auth.js';

const router: IRouter = Router();

// All preset routes require authentication
router.use(authenticateToken);

// ==================== Form Presets ====================

/**
 * GET /api/v1/presets/forms
 * Query params: cptSlug, isActive, page, limit, orderBy, order
 */
router.get('/forms', presetController.getAllFormPresets.bind(presetController));

/**
 * GET /api/v1/presets/forms/:id
 */
router.get('/forms/:id', presetController.getFormPresetById.bind(presetController));

/**
 * POST /api/v1/presets/forms
 * Body: { name, description?, cptSlug, config, roles? }
 */
router.post('/forms', presetController.createFormPreset.bind(presetController));

/**
 * PUT /api/v1/presets/forms/:id
 * Body: { name?, description?, config?, roles?, isActive? }
 */
router.put('/forms/:id', presetController.updateFormPreset.bind(presetController));

/**
 * DELETE /api/v1/presets/forms/:id
 */
router.delete('/forms/:id', presetController.deleteFormPreset.bind(presetController));

/**
 * POST /api/v1/presets/forms/:id/clone
 */
router.post('/forms/:id/clone', presetController.cloneFormPreset.bind(presetController));

// ==================== View Presets ====================

/**
 * GET /api/v1/presets/views
 * Query params: cptSlug, isActive, page, limit, orderBy, order
 */
router.get('/views', presetController.getAllViewPresets.bind(presetController));

/**
 * GET /api/v1/presets/views/:id
 */
router.get('/views/:id', presetController.getViewPresetById.bind(presetController));

/**
 * POST /api/v1/presets/views
 * Body: { name, description?, cptSlug, config, roles? }
 */
router.post('/views', presetController.createViewPreset.bind(presetController));

/**
 * PUT /api/v1/presets/views/:id
 * Body: { name?, description?, config?, roles?, isActive? }
 */
router.put('/views/:id', presetController.updateViewPreset.bind(presetController));

/**
 * DELETE /api/v1/presets/views/:id
 */
router.delete('/views/:id', presetController.deleteViewPreset.bind(presetController));

/**
 * POST /api/v1/presets/views/:id/clone
 */
router.post('/views/:id/clone', presetController.cloneViewPreset.bind(presetController));

// ==================== Template Presets ====================

/**
 * GET /api/v1/presets/templates
 * Query params: cptSlug, isActive, page, limit, orderBy, order
 */
router.get('/templates', presetController.getAllTemplatePresets.bind(presetController));

/**
 * GET /api/v1/presets/templates/:id
 */
router.get('/templates/:id', presetController.getTemplatePresetById.bind(presetController));

/**
 * POST /api/v1/presets/templates
 * Body: { name, description?, cptSlug, config, roles? }
 */
router.post('/templates', presetController.createTemplatePreset.bind(presetController));

/**
 * PUT /api/v1/presets/templates/:id
 * Body: { name?, description?, config?, roles?, isActive? }
 */
router.put('/templates/:id', presetController.updateTemplatePreset.bind(presetController));

/**
 * DELETE /api/v1/presets/templates/:id
 */
router.delete('/templates/:id', presetController.deleteTemplatePreset.bind(presetController));

/**
 * POST /api/v1/presets/templates/:id/clone
 */
router.post('/templates/:id/clone', presetController.cloneTemplatePreset.bind(presetController));

export default router;

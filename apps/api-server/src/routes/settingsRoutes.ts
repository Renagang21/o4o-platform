import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';

const router: Router = Router();
const settingsController = new SettingsController();

// Public endpoints
router.get('/homepage', settingsController.getHomepageSettings.bind(settingsController));
router.get('/general', settingsController.getGeneralSettings.bind(settingsController));
router.get('/customizer', settingsController.getCustomizerSettings.bind(settingsController));
router.get('/header-builder', settingsController.getHeaderBuilder.bind(settingsController));

// OAuth settings endpoints (admin only) - must be before /:type
router.get('/oauth/admin', authenticate, requireAdmin, settingsController.getOAuthSettingsAdmin.bind(settingsController));
router.put('/oauth', authenticate, requireAdmin, settingsController.updateOAuthSettings.bind(settingsController));

// Admin only endpoints
router.get('/:type', authenticate, requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', authenticate, requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', authenticate, requireAdmin, settingsController.initializeSettings.bind(settingsController));
router.post('/header-builder', authenticate, requireAdmin, settingsController.updateHeaderBuilder.bind(settingsController));
router.delete('/customizer', authenticate, requireAdmin, settingsController.deleteCustomizerSettings.bind(settingsController));

export default router;
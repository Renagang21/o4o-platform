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

// Admin only endpoints
router.get('/:type', authenticate, requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', authenticate, requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', authenticate, requireAdmin, settingsController.initializeSettings.bind(settingsController));

export default router;
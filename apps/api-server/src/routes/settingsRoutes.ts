import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/permission.middleware';

const router: Router = Router();
const settingsController = new SettingsController();

// Public endpoints
router.get('/homepage', settingsController.getHomepageSettings.bind(settingsController));
router.get('/general', settingsController.getGeneralSettings.bind(settingsController));
router.get('/customizer', settingsController.getCustomizerSettings.bind(settingsController));

// Admin only endpoints
router.get('/:type', authenticateToken, requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', authenticateToken, requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', authenticateToken, requireAdmin, settingsController.initializeSettings.bind(settingsController));

export default router;
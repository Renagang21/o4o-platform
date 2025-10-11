import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = Router();
const settingsController = new SettingsController();

// Public endpoints
router.get('/homepage', settingsController.getHomepageSettings.bind(settingsController));
router.get('/general', settingsController.getGeneralSettings.bind(settingsController));
router.get('/customizer', settingsController.getCustomizerSettings.bind(settingsController));

// Admin only endpoints
router.get('/:type', authMiddleware.verifyToken, authMiddleware.requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', authMiddleware.verifyToken, authMiddleware.requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', authMiddleware.verifyToken, authMiddleware.requireAdmin, settingsController.initializeSettings.bind(settingsController));

export default router;
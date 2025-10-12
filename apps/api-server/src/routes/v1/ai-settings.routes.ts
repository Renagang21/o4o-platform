import { Router, RequestHandler } from 'express';
import { AISettingsController } from '../../controllers/v1/ai-settings.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { isAdmin } from '../../middleware/admin';

const router: Router = Router();
const controller = new AISettingsController();

// All routes require authentication and admin access
router.use(authenticate as RequestHandler);
router.use(isAdmin as RequestHandler);

// Get all AI settings
router.get('/', controller.getSettings);

// Save AI setting
router.post('/', controller.saveSettings);

// Test API key
router.post('/test', controller.testApiKey);

// Delete AI setting
router.delete('/:provider', controller.deleteSetting);

export default router;
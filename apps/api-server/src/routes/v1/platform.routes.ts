import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import { PlatformController } from '../../controllers/v1/platform.controller.js';

const router: Router = Router();
const platformController = new PlatformController();

// Apps management
router.get('/apps', platformController.getApps);
router.get('/apps/active', platformController.getActiveApps);
router.get('/apps/:id', platformController.getApp);
router.put('/apps/:id/status', authenticate, requireAdmin, platformController.updateAppStatus);
router.put('/apps/:id/settings', authenticate, requireAdmin, platformController.updateAppSettings);

// Platform settings
router.get('/settings', platformController.getPlatformSettings);
router.put('/settings', authenticate, requireAdmin, platformController.updatePlatformSettings);

// Platform statistics
router.get('/stats', authenticate, platformController.getPlatformStats);

// Custom post types (migrated from /cpt)
router.get('/custom-post-types', platformController.getCustomPostTypes);
router.get('/custom-post-types/:id', platformController.getCustomPostType);
router.post('/custom-post-types', authenticate, requireAdmin, platformController.createCustomPostType);
router.put('/custom-post-types/:id', authenticate, requireAdmin, platformController.updateCustomPostType);
router.delete('/custom-post-types/:id', authenticate, requireAdmin, platformController.deleteCustomPostType);

export default router;
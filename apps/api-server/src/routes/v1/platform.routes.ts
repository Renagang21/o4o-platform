import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/permission.middleware';
import { PlatformController } from '../../controllers/v1/platform.controller';

const router: Router = Router();
const platformController = new PlatformController();

// Apps management
router.get('/apps', platformController.getApps);
router.get('/apps/active', platformController.getActiveApps);
router.get('/apps/:id', platformController.getApp);
router.put('/apps/:id/status', authenticateToken, requireAdmin, platformController.updateAppStatus);
router.put('/apps/:id/settings', authenticateToken, requireAdmin, platformController.updateAppSettings);

// Platform settings
router.get('/settings', platformController.getPlatformSettings);
router.put('/settings', authenticateToken, requireAdmin, platformController.updatePlatformSettings);

// Platform statistics
router.get('/stats', authenticateToken, platformController.getPlatformStats);

// Custom post types (migrated from /cpt)
router.get('/custom-post-types', platformController.getCustomPostTypes);
router.get('/custom-post-types/:id', platformController.getCustomPostType);
router.post('/custom-post-types', authenticateToken, requireAdmin, platformController.createCustomPostType);
router.put('/custom-post-types/:id', authenticateToken, requireAdmin, platformController.updateCustomPostType);
router.delete('/custom-post-types/:id', authenticateToken, requireAdmin, platformController.deleteCustomPostType);

export default router;
import { Router } from 'express';
import { UserActivityController } from '../../controllers/v1/userActivity.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/permission.middleware';

const router: Router = Router();

// User activity log routes
router.get('/:id/activity-log', authenticateToken, UserActivityController.getUserActivityLog);
router.post('/:id/activity-log', authenticateToken, UserActivityController.createUserActivity);
router.get('/:id/activity-summary', authenticateToken, UserActivityController.getActivitySummary);

// Activity metadata routes
router.get('/activity-categories', authenticateToken, UserActivityController.getActivityCategories);
router.get('/activity-types', authenticateToken, UserActivityController.getActivityTypes);

export default router;
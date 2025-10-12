import { Router, Request } from 'express';
import { UserActivityController } from '../../controllers/v1/userActivity.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/permission.middleware';

const router: Router = Router();

// User activity log routes
router.get('/:id/activity-log', authenticate, UserActivityController.getUserActivityLog);
router.post('/:id/activity-log', authenticate, UserActivityController.createUserActivity);
router.get('/:id/activity-summary', authenticate, UserActivityController.getActivitySummary);

// Activity metadata routes
router.get('/activity-categories', authenticate, UserActivityController.getActivityCategories);
router.get('/activity-types', authenticate, UserActivityController.getActivityTypes);

export default router;
import { Router, Request } from 'express';
import { UserActivityController } from '../../controllers/v1/userActivity.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';

const router: Router = Router();

// User activity log routes
router.get('/:id/activity-log', authenticate, UserActivityController.getUserActivityLog);
router.post('/:id/activity-log', authenticate, UserActivityController.createUserActivity);
router.get('/:id/activity-summary', authenticate, UserActivityController.getActivitySummary);

// Activity metadata routes
router.get('/activity-categories', authenticate, UserActivityController.getActivityCategories);
router.get('/activity-types', authenticate, UserActivityController.getActivityTypes);

export default router;
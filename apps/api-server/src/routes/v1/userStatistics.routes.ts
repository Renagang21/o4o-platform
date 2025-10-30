import { Router, Request } from 'express';
import { UserStatisticsController } from '../../controllers/v1/userStatistics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';

const router: Router = Router();

// User statistics routes (admin only)
router.get('/statistics', authenticate, requireAdmin, UserStatisticsController.getUserStatistics);
router.get('/statistics/growth', authenticate, requireAdmin, UserStatisticsController.getUserGrowthTrend);
router.get('/statistics/retention', authenticate, requireAdmin, UserStatisticsController.getRetentionStatistics);

export default router;
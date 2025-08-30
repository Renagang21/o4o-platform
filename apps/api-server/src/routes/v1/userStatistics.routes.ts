import { Router } from 'express';
import { UserStatisticsController } from '../../controllers/v1/userStatistics.controller';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

const router: Router = Router();

// User statistics routes (admin only)
router.get('/statistics', authenticateToken, requireAdmin, UserStatisticsController.getUserStatistics);
router.get('/statistics/growth', authenticateToken, requireAdmin, UserStatisticsController.getUserGrowthTrend);
router.get('/statistics/retention', authenticateToken, requireAdmin, UserStatisticsController.getRetentionStatistics);

export default router;
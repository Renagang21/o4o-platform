import { Router } from 'express';
import userActivityRoutes from './userActivity.routes';
import userRoleRoutes from './userRole.routes';
import userStatisticsRoutes from './userStatistics.routes';
import businessInfoRoutes from './businessInfo.routes';

const router: Router = Router();

// Combine all user-related routes
router.use('/', userActivityRoutes);
router.use('/', userRoleRoutes); 
router.use('/', userStatisticsRoutes);
router.use('/', businessInfoRoutes);

export default router;
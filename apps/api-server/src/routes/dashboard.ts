import { Router } from 'express';
import { authenticateToken as authMiddleware, requireRole } from '../middleware/auth';
import { DashboardController } from '../controllers/dashboard/dashboardController';
import { performanceMiddleware } from '../middleware/performance.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router: Router = Router();
const dashboardController = new DashboardController();

// Apply performance monitoring to all dashboard routes
router.use(performanceMiddleware);

// All dashboard routes require authentication
router.use(authMiddleware);

// GET /api/vendors/suppliers/:vendorId/dashboard - Integrated vendor/supplier dashboard
router.get(
  '/vendors/suppliers/:vendorId/dashboard', 
  requireRole(['admin', 'manager', 'vendor']),
  dashboardController.getIntegratedDashboard
);

export default router;
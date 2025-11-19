/**
 * Admin Jobs Routes (Phase PD-8)
 * Manual triggers for automated jobs
 */

import { Router } from 'express';
import { AdminJobController } from '../../controllers/admin/AdminJobController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';

const router = Router();
const adminJobController = new AdminJobController();

// All routes require authentication and admin role
const adminOnly = requireRole(UserRole.ADMIN);

/**
 * @route POST /api/v2/admin/jobs/run-daily
 * @desc Run daily jobs (price sync + stock sync)
 * @access Admin only
 */
router.post(
  '/run-daily',
  authenticate,
  adminOnly,
  adminJobController.runDailyJobs.bind(adminJobController)
);

/**
 * @route POST /api/v2/admin/jobs/run-monthly
 * @desc Run monthly jobs (settlement generation)
 * @access Admin only
 * @body { periodStart?: string, periodEnd?: string } (optional, defaults to last month)
 */
router.post(
  '/run-monthly',
  authenticate,
  adminOnly,
  adminJobController.runMonthlyJobs.bind(adminJobController)
);

/**
 * @route GET /api/v2/admin/jobs/status
 * @desc Get job status and last run statistics
 * @access Admin only
 */
router.get(
  '/status',
  authenticate,
  adminOnly,
  adminJobController.getJobStatus.bind(adminJobController)
);

export default router;

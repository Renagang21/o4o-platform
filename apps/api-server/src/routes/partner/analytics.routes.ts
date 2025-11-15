import { Router } from 'express';
import { PartnerAnalyticsController } from '../../controllers/analytics/PartnerAnalyticsController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router: Router = Router();
const analyticsController = new PartnerAnalyticsController();

// All analytics routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/v1/partner/analytics/summary
 * @desc Get aggregated KPI summary for partner dashboard
 * @query period - Date range (7d, 30d, 90d, 365d) [default: 30d]
 * @access Private (Partner sees own data, Admin sees all)
 */
router.get('/summary', analyticsController.getSummary.bind(analyticsController));

/**
 * @route GET /api/v1/partner/analytics/timeseries
 * @desc Get time-series data for charts/graphs
 * @query period - Date range (7d, 30d, 90d, 365d) [default: 30d]
 * @access Private (Partner sees own data, Admin sees all)
 */
router.get('/timeseries', analyticsController.getTimeseries.bind(analyticsController));

/**
 * @route GET /api/v1/partner/analytics/links
 * @desc Get link summaries sorted by performance
 * @query period - Date range (7d, 30d, 90d, 365d) [default: 30d]
 * @access Private (Partner sees own data, Admin sees all)
 */
router.get('/links', analyticsController.getFunnel.bind(analyticsController)); // Re-use funnel for link summaries

export default router;

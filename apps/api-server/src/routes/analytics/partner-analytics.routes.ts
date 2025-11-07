import { Router } from 'express';
import { PartnerAnalyticsController } from '../../controllers/analytics/PartnerAnalyticsController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router: Router = Router();
const analyticsController = new PartnerAnalyticsController();

// All analytics routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/v1/analytics/partner/summary
 * @desc Get aggregated KPI summary for partner dashboard
 * @query partnerId - Partner UUID or "me" (default: me)
 * @query range - Date range preset (last_7d, last_30d, last_90d, this_month, last_month)
 * @query from - Start date (ISO 8601)
 * @query to - End date (ISO 8601)
 * @access Private (Partner sees own data, Admin sees all)
 */
router.get('/summary', analyticsController.getSummary.bind(analyticsController));

/**
 * @route GET /api/v1/analytics/partner/timeseries
 * @desc Get time-series data for charts/graphs
 * @query metric - Metric to query (clicks, conversions, commission, revenue, cvr) [required]
 * @query interval - Time interval (hour, day, week, month) [default: day]
 * @query from - Start date (ISO 8601) [required]
 * @query to - End date (ISO 8601) [required]
 * @query partnerId - Partner UUID or "me" (default: me)
 * @query cumulative - Include cumulative sum (default: false)
 * @query fillMissing - Fill missing intervals with 0 (default: true)
 * @access Private (Partner sees own data, Admin sees all)
 */
router.get('/timeseries', analyticsController.getTimeseries.bind(analyticsController));

/**
 * @route GET /api/v1/analytics/partner/funnel
 * @desc Get conversion funnel data (Clicks → Conversions → Commission → Payment)
 * @query from - Start date (ISO 8601) [required]
 * @query to - End date (ISO 8601) [required]
 * @query partnerId - Partner UUID or "me" (default: me)
 * @query uniqueCustomers - De-duplicate by customer (default: false)
 * @query breakdown - Breakdown by field (source, campaign, product)
 * @access Private (Partner sees own data, Admin sees all)
 */
router.get('/funnel', analyticsController.getFunnel.bind(analyticsController));

export default router;
